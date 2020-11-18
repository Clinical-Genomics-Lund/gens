"""Functions for loading and converting data."""
import logging
import os

import pysam
from flask import Response, abort, request

from .graph import get_chrom_size

BAF_SUFFIX = ".baf.bed.gz"
COV_SUFFIX = ".cov.bed.gz"


LOG = logging.getLogger(__name__)


def _get_filepath(*args, check=True):
    """Utility function to get file paths with logs."""
    path = os.path.join(*args)
    if not os.path.isfile(path) and check:
        msg = f"File not found: {path}"
        LOG.error(msg)
        raise FileNotFoundError(msg)
    return path


def load_data(reg, new_start_pos, new_end_pos):
    """
    Loads data for Log2 and BAF
    """
    sample_name = request.args.get("sample_name", None)

    # Set whether to get HG37 och HG38 files
    hg_filedir = request.args.get("hg_filedir", None)

    # Fetch data with the defined range
    log2_list = tabix_query(
        _get_filepath(hg_filedir, sample_name + COV_SUFFIX),
        reg.res,
        reg.chrom,
        new_start_pos,
        new_end_pos,
    )

    baf_list = tabix_query(
        _get_filepath(hg_filedir, sample_name + BAF_SUFFIX),
        reg.res,
        reg.chrom,
        new_start_pos,
        new_end_pos,
    )

    if not log2_list and not baf_list:
        LOG.info("Data for chromosome {} not available".format(reg.chrom))
        return abort(Response("Data for chromosome {} not available".format(reg.chrom)))

    return log2_list, baf_list, new_start_pos


def convert_data(graph, req, log2_list, baf_list, x_pos, new_start_pos, x_ampl):
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
                int(x_pos + x_ampl * (float(record[1]) - new_start_pos)),
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
                int(x_pos + x_ampl * (float(record[1]) - new_start_pos)),
                int(graph.baf_ypos - graph.baf_ampl * ypos),
                0,
            ]
        )

    return log2_records, baf_records


def tabix_query(filename, res, chrom, start=None, end=None):
    """
    Call tabix and generate an array of strings for each line it returns.
    """

    # Bound start and end balues to 0-chrom_size
    end = min(end, get_chrom_size(chrom))
    start = max(start, 0)

    # Get data from bed file
    tb = pysam.TabixFile(filename)
    try:
        records = tb.fetch(res + "_" + chrom, start, end)
    except ValueError as e:
        LOG.error(e)
        records = []

    return [r.split("\t") for r in records]

    # OLD METHOD
    # values = []
    # times.append(time.time())
    # chrom = res+"_"+chrom
    # if not start and not end:
    #     query = chrom
    # else:
    #     query = '{}:{}-{}'.format(chrom, start, end)
    # try:
    #     process = Popen(['tabix', '-f', filename, query], stdout=PIPE)
    # except CalledProcessError:
    #     print('Could not open ' + filename)
    # else:
    #     for line in process.stdout:
    #         values.append(line.strip().split())
    # return values
