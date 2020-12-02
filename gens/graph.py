"""Functions for getting information from Gens views."""
import itertools
import logging
import re
from collections import namedtuple

from flask import current_app as app
from flask import request

from .cache import cache
from .exceptions import NoRecordsException, RegionParserException
from .io import tabix_query

LOG = logging.getLogger(__name__)

CHROMOSOMES = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
    "13",
    "14",
    "15",
    "16",
    "17",
    "18",
    "19",
    "20",
    "21",
    "22",
    "X",
    "Y",
]

GRAPH = namedtuple("graph", ("baf_ampl", "log2_ampl", "baf_ypos", "log2_ypos"))
REGION = namedtuple("region", ("res", "chrom", "start_pos", "end_pos"))

REQUEST = namedtuple(
    "request",
    (
        "region",
        "x_pos",
        "y_pos",
        "plot_height",
        "top_bottom_padding",
        "baf_y_start",
        "baf_y_end",
        "log2_y_start",
        "log2_y_end",
        "hg_type",
        "reduce_data",
    ),
)


@cache.memoize(0)
def convert_data(graph, req, log2_list, baf_list, x_pos, new_start_pos, new_x_ampl):
    """
    Converts data for Log2 ratio and BAF to screen coordinates
    Also caps the data
    """
    #  Normalize and calculate the Lo2 ratio
    log2_records = []
    for record in log2_list:
        # Cap values to end points
        ypos = float(record[3])
        ypos = req.log2_y_start + 0.2 if ypos > req.log2_y_start else ypos
        ypos = req.log2_y_end - 0.2 if ypos < req.log2_y_end else ypos

        # Convert to screen coordinates
        log2_records.extend(
            [
                int(x_pos + new_x_ampl * (float(record[1]) - new_start_pos)),
                int(graph.log2_ypos - graph.log2_ampl * ypos),
                0,
            ]
        )

    # Gather the BAF records
    baf_records = []
    for record in baf_list:
        # Cap values to end points
        ypos = float(record[3])
        ypos = req.baf_y_start + 0.2 if ypos > req.baf_y_start else ypos
        ypos = req.baf_y_end - 0.2 if ypos < req.baf_y_end else ypos

        # Convert to screen coordinates
        baf_records.extend(
            [
                int(x_pos + new_x_ampl * (float(record[1]) - new_start_pos)),
                int(graph.baf_ypos - graph.baf_ampl * ypos),
                0,
            ]
        )

    return log2_records, baf_records


def find_chrom_at_pos(chrom_dims, height, current_x, current_y, margin):
    """
    Returns which chromosome the current position belongs to in the overview graph
    """
    current_chrom = None

    for chrom in CHROMOSOMES:
        x_pos = chrom_dims[chrom]["x_pos"]
        y_pos = chrom_dims[chrom]["y_pos"]
        width = chrom_dims[chrom]["width"]
        if x_pos + margin <= current_x <= (
            x_pos + width
        ) and y_pos + margin <= current_y <= (y_pos + height):
            current_chrom = chrom
            break

    return current_chrom


def overview_chrom_dimensions(x_pos, y_pos, plot_width, hg_type):
    """
    Calculates the position for all chromosome graphs in the overview canvas
    """
    chrom_dims = {}
    for chrom in CHROMOSOMES:
        chrom_data = get_chrom_data(chrom, hg_type)
        chrom_width = plot_width * float(chrom_data["scale"])
        chrom_dims[chrom] = {
            "x_pos": x_pos,
            "y_pos": y_pos,
            "width": chrom_width,
            "size": chrom_data["size"],
        }
        x_pos += chrom_width
    return chrom_dims


@cache.memoize(50)
def parse_region_str(region, hg_type):
    """
    Parses a region string
    """
    name_search = None
    try:
        # Split region in standard format chrom:start-stop
        if ":" in region:
            chrom, pos_range = region.split(":")
            start, end = pos_range.split("-")
            chrom.replace("chr", "")
            chrom = chrom.upper()
        else:
            # Not in standard format, query in form of full chromsome
            # or gene
            name_search = region
    except ValueError:
        LOG.error("Wrong region formatting")
        return None

    if name_search is not None:
        # Query is for a full range chromosome
        if name_search.upper() in CHROMOSOMES:
            start = 0
            end = "None"
            chrom = name_search.upper()
        else:
            # Lookup queried gene
            collection = app.config["GENS_DB"]["transcripts" + hg_type]
            start = collection.find_one(
                {
                    "gene_name": re.compile(
                        "^" + re.escape(name_search) + "$", re.IGNORECASE
                    )
                },
                sort=[("start", 1)],
            )
            end = collection.find_one(
                {
                    "gene_name": re.compile(
                        "^" + re.escape(name_search) + "$", re.IGNORECASE
                    )
                },
                sort=[("end", -1)],
            )
            if start is not None and end is not None:
                chrom = start["chrom"]
                start = start["start"]
                end = end["end"]
            else:
                LOG.warning("Did not find range for gene name")
                return None

    chrom_data = get_chrom_data(chrom, hg_type)
    # Set end position if it is not set
    if end == "None":
        end = chrom_data["size"]

    start = int(start)
    end = int(end)
    size = end - start

    if size <= 0:
        LOG.error("Invalid input span")
        return None

    # Cap end to maximum range value for given chromosome
    if end > chrom_data["size"]:
        start = max(0, start - (end - chrom_data["size"]))
        end = chrom_data["size"]

    resolution = "d"
    if size > 15000000:
        resolution = "a"
    elif size > 1400000:
        resolution = "b"
    elif size > 200000:
        resolution = "c"

    return resolution, chrom, start, end


def set_graph_values(req):
    """
    Returns graph-specific values as named tuple
    """
    log2_height = abs(req.log2_y_end - req.log2_y_start)
    baf_height = abs(req.baf_y_end - req.baf_y_start)
    return GRAPH(
        (req.plot_height - 2 * req.top_bottom_padding) / baf_height,
        (req.plot_height - req.top_bottom_padding * 2) / log2_height,
        req.y_pos + req.plot_height - req.top_bottom_padding,
        req.y_pos + 1.5 * req.plot_height,
    )


def set_region_values(parsed_region, x_ampl):
    """
    Sets region values
    """
    extra_plot_width = float(request.args.get("extra_plot_width", 0))
    res, chrom, start_pos, end_pos = parsed_region

    # Set resolution for overview graph
    if request.args.get("overview", False):
        res = "o"

    # Move negative start and end position to positive values
    if start_pos != "None" and int(start_pos) < 0:
        end_pos += start_pos
        start_pos = 0

    # Add extra data to edges
    new_start_pos = int(start_pos - extra_plot_width * ((end_pos - start_pos) / x_ampl))
    new_end_pos = int(end_pos + extra_plot_width * ((end_pos - start_pos) / x_ampl))

    # X ampl contains the total width to plot x data on
    x_ampl = (x_ampl + 2 * extra_plot_width) / (new_end_pos - new_start_pos)
    return (
        REGION(res, chrom, start_pos, end_pos),
        new_start_pos,
        new_end_pos,
        x_ampl,
        extra_plot_width,
    )


def get_overview_cov(req, baf_fh, cov_fh, x_ampl):
    """Get Log2 ratio and BAF values for chromosome with screen coordinates."""
    graph = set_graph_values(req)
    # parse region
    parsed_region = parse_region_str(req.region, req.hg_type)
    if not parsed_region:
        raise RegionParserException("No parsed region")

    # Set values that are needed to convert coordinates to screen coordinates
    reg, new_start_pos, new_end_pos, new_x_ampl, extra_plot_width = set_region_values(
        parsed_region, x_ampl
    )
    # Bound start and end balues to 0-chrom_size
    end = min(new_end_pos, get_chrom_data(reg.chrom, req.hg_type)["size"])
    start = max(new_start_pos, 0)

    # Load BAF and Log2 data from tabix files
    log2_list = tabix_query(
        cov_fh,
        reg.res,
        reg.chrom,
        start,
        end,
        req.reduce_data,
    )
    baf_list = tabix_query(
        baf_fh,
        reg.res,
        reg.chrom,
        start,
        end,
        req.reduce_data,
    )

    # Convert the data to screen coordinates
    log2_records, baf_records = convert_data(
        graph,
        req,
        log2_list,
        baf_list,
        req.x_pos - extra_plot_width,
        new_start_pos,
        new_x_ampl,
    )
    if not new_start_pos and not log2_records and not baf_records:
        raise NoRecordsException("No records")
    return reg, log2_records, baf_records


@cache.memoize(60)
def get_chrom_data(chrom, hg_type=38):
    """
    Gets the size in base pairs of a chromosome
    """
    chrom_data = app.config["GENS_DB"][f"chromsizes{hg_type}"].find_one(
        {"chrom": chrom}
    )
    if chrom_data is None:
        raise ValueError(
            f"Could not find data for chromosome {chrom} in DB; hg_type: {hg_type}"
        )
    return chrom_data
