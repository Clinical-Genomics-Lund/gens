"""Functions for getting information from Gens views."""
import logging
import re
from collections import namedtuple

from .crud.chromosome import get_chromosome
from .db import gens_db
from .exceptions import RegionParserError
from .io import tabix_query
from .models.base import ZoomLevel
from .models.sample import Chromosomes, GenomeBuild

LOG = logging.getLogger(__name__)


Graph = namedtuple("graph", ("baf_ampl", "log2_ampl", "baf_ypos", "log2_ypos"))
Region = namedtuple("region", ("res", "chrom", "start_pos", "end_pos"))

Request = namedtuple(
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
        "genome_build",
        "reduce_data",
    ),
)


def convert_data(
    graph, req, log2_list, baf_list, x_pos, new_start_pos, new_x_ampl, data_type="bed"
):
    """
    Converts data for Log2 ratio and BAF to screen coordinates
    Also caps the data
    """

    if data_type == "json":
        CHRPOS_IDX, VALUE_IDX = 0, 1
    elif data_type == "bed":
        CHRPOS_IDX, VALUE_IDX = 1, 3
    else:
        raise ValueError(f"Data type {bed_type} not supported. Use bed or json!")

    #  Normalize and calculate the Lo2 ratio
    log2_records = []
    for record in log2_list:
        # Cap values to end points
        ypos = float(record[VALUE_IDX])
        ypos = req.log2_y_start + 0.2 if ypos > req.log2_y_start else ypos
        ypos = req.log2_y_end - 0.2 if ypos < req.log2_y_end else ypos

        # Convert to screen coordinates
        xpos = (int(x_pos + new_x_ampl * (float(record[CHRPOS_IDX]) - new_start_pos)),)
        log2_records.extend([xpos, int(graph.log2_ypos - graph.log2_ampl * ypos)])

    # Gather the BAF records
    baf_records = []
    for record in baf_list:
        # Cap values to end points
        ypos = float(record[VALUE_IDX])
        ypos = req.baf_y_start + 0.2 if ypos > req.baf_y_start else ypos
        ypos = req.baf_y_end - 0.2 if ypos < req.baf_y_end else ypos

        # Convert to screen coordinates
        xpos = (int(x_pos + new_x_ampl * (float(record[CHRPOS_IDX]) - new_start_pos)),)
        baf_records.extend([xpos, int(graph.baf_ypos - graph.baf_ampl * ypos)])

    return log2_records, baf_records


def find_chrom_at_pos(chrom_dims, height, current_x, current_y, margin):
    """
    Returns which chromosome the current position belongs to in the overview graph
    """
    current_chrom = None

    for chrom in Chromosomes:
        x_pos = chrom_dims[chrom]["x_pos"]
        y_pos = chrom_dims[chrom]["y_pos"]
        width = chrom_dims[chrom]["width"]
        if x_pos + margin <= current_x <= (
            x_pos + width
        ) and y_pos + margin <= current_y <= (y_pos + height):
            current_chrom = chrom
            break

    return current_chrom


def overview_chrom_dimensions(x_pos, y_pos, plot_width, genome_build):
    """
    Calculates the position for all chromosome graphs in the overview canvas
    """
    chrom_dims = {}
    for chrom in Chromosomes:
        chrom_data = get_chromosome(chrom, genome_build)
        chrom_width = plot_width * float(chrom_data["scale"])
        chrom_dims[chrom] = {
            "x_pos": x_pos,
            "y_pos": y_pos,
            "width": chrom_width,
            "size": chrom_data["size"],
        }
        x_pos += chrom_width
    return chrom_dims


def parse_region_str(region: str, genome_build: GenomeBuild):
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
            chrom = Chromosomes(chrom.upper())
        else:
            # Not in standard format, query in form of full chromsome
            # or gene
            name_search = region
    except ValueError:
        LOG.error("Wrong region formatting")
        return None

    if name_search is not None:
        # Query is for a full range chromosome
        if name_search.upper() in Chromosomes:
            start = 0
            end = "None"
            chrom = name_search.upper()
        else:
            # Lookup queried gene
            start = gens_db.transcripts.find_one(
                {
                    "gene_name": re.compile(
                        "^" + re.escape(name_search) + "$", re.IGNORECASE
                    ),
                    "genome_build": genome_build.value,
                },
                sort=[("start", 1)],
            )
            end = gens_db.transcripts.find_one(
                {
                    "gene_name": re.compile(
                        "^" + re.escape(name_search) + "$", re.IGNORECASE
                    ),
                    "genome_build": genome_build.value,
                },
                sort=[("end", -1)],
            )
            if start is not None and end is not None:
                chrom = Chromosomes(start["chrom"])
                start = start["start"]
                end = end["end"]
            else:
                LOG.warning("Did not find range for gene name")
                return None

    chrom_data = get_chromosome(chrom, genome_build)
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

    if size > 15000000:
        resolution = ZoomLevel.A
    elif size > 1400000:
        resolution = ZoomLevel.B
    elif size > 200000:
        resolution = ZoomLevel.B
    else:
        resolution = ZoomLevel.B

    return resolution, chrom, start, end


def set_graph_values(req):
    """
    Returns graph-specific values as named tuple
    """
    log2_height = abs(req.log2_y_end - req.log2_y_start)
    baf_height = abs(req.baf_y_end - req.baf_y_start)
    return Graph(
        (req.plot_height - 2 * req.top_bottom_padding) / baf_height,
        (req.plot_height - req.top_bottom_padding * 2) / log2_height,
        req.y_pos + req.plot_height - req.top_bottom_padding,
        req.y_pos + 1.5 * req.plot_height,
    )


def set_region_values(parsed_region, x_ampl, extra_plot_width=0, overview=False):
    """
    Sets region values
    """
    res, chrom, start_pos, end_pos = parsed_region

    # Set resolution for overview graph
    if overview:
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
        Region(res, chrom, start_pos, end_pos),
        new_start_pos,
        new_end_pos,
        x_ampl,
        extra_plot_width,
    )


def get_coverage(req, x_ampl, json_data=None, cov_fh=None, baf_fh=None):
    """Get Log2 ratio and BAF values for chromosome with screen coordinates."""
    graph = set_graph_values(req)
    # parse region
    parsed_region = parse_region_str(req.region, req.genome_build)
    if not parsed_region:
        raise RegionParserError("No parsed region")

    # Set values that are needed to convert coordinates to screen coordinates
    (
        region,
        new_start_pos,
        new_end_pos,
        new_x_ampl,
        extra_plot_width,
    ) = set_region_values(parsed_region, x_ampl)

    if json_data:
        data_type = "json"
        baf_list = json_data[region.chrom.value]["baf"]
        log2_list = json_data[region.chrom.vlaue]["cov"]
    else:
        data_type = "bed"

        # Bound start and end balues to 0-chrom_size
        end = min(
            new_end_pos, get_chromosome(region.chrom, req.genome_build)["size"]
        )
        start = max(new_start_pos, 0)

        # Load BAF and Log2 data from tabix files
        log2_list = tabix_query(
            cov_fh,
            region.res,
            region.chrom,
            start,
            end,
            req.reduce_data,
        )
        baf_list = tabix_query(
            baf_fh,
            region.res,
            region.chrom,
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
        data_type=data_type,
    )
    if not new_start_pos and not log2_records and not baf_records:
        LOG.warning("No records for region")
    return region, new_start_pos, new_end_pos, log2_records, baf_records
