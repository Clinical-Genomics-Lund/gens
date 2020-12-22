"""Functions for getting information from Gens views."""
import logging
from collections import namedtuple

from flask import current_app as app
from flask import request

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


def get_chrom_size(chrom):
    """
    Gets the size in base pairs of a chromosome
    """
    hg_type = request.args.get("hg_type", "38")
    collection = app.config["DB"]["chromsizes" + hg_type]
    chrom_data = collection.find_one({"chrom": chrom})

    if chrom_data:
        return chrom_data["size"]

    return None


def get_chrom_width(chrom, full_plot_width):
    """
    Calculates width of chromosome based on its scale factor
    and input width for the whole plot
    """
    hg_type = request.args.get("hg_type", "38")
    collection = app.config["DB"]["chromsizes" + hg_type]
    chrom_data = collection.find_one({"chrom": chrom})

    if chrom_data:
        return full_plot_width * float(chrom_data["scale"])

    LOG.warning("Chromosome width not available")
    return None


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


def overview_chrom_dimensions(x_pos, y_pos, full_plot_width):
    """
    Calculates the position for all chromosome graphs in the overview canvas
    """

    hg_type = request.args.get("hg_type", "38")
    collection = app.config["DB"]["chromsizes" + hg_type]

    chrom_dims = {}
    for chrom in CHROMOSOMES:
        chrom_width = get_chrom_width(chrom, full_plot_width)
        if chrom_width is None:
            LOG.warning("Could not find chromosome data in DB")
            return None

        chrom_data = collection.find_one({"chrom": chrom})
        if chrom_data is None:
            LOG.warning("Could not find chromosome data in DB")
            return None

        chrom_dims[chrom] = {
            "x_pos": x_pos,
            "y_pos": y_pos,
            "width": chrom_width,
            "size": chrom_data["size"],
        }

        x_pos += chrom_width

    return chrom_dims


def parse_region_str(region):
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

    hg_type = request.args.get("hg_type", "38")

    if name_search is not None:
        # Query is for a full range chromosome
        if name_search.upper() in CHROMOSOMES:
            start = 0
            end = "None"
            chrom = name_search.upper()
        else:
            # Lookup queried gene
            collection = app.config["DB"]["transcripts" + hg_type]
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

    # Get end position
    collection = app.config["DB"]["chromsizes" + hg_type]
    chrom_data = collection.find_one({"chrom": chrom})

    if chrom_data is None:
        LOG.warning("Could not find chromosome data in DB")
        return None

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
