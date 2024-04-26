"""Functions for loading and converting data."""
import itertools
import logging
import os
from fractions import Fraction

import pysam
from pydantic import BaseModel
from typing import Optional, Union, Dict
#from .api import get_chromosome

BAF_SUFFIX = ".baf.bed.gz"
COV_SUFFIX = ".cov.bed.gz"
JSON_SUFFIX = ".overview.json.gz"


LOG = logging.getLogger(__name__)


class ChromosomeRegion(BaseModel):
    """Container 0+ """

    chrom: str
    start: Optional[int]
    end: Optional[int]


def _get_filepath(*args, check=True):
    """Utility function to get file paths with logs."""
    path = os.path.join(*args)
    if not os.path.isfile(path) and check:
        msg = f"File not found: {path}"
        LOG.error(msg)
        raise FileNotFoundError(path)
    return path


def get_tabix_files(coverage_file, baf_file):
    """Get tabix files for sample."""
    _get_filepath(coverage_file + ".tbi") and _get_filepath(baf_file + ".tbi")
    cov_file = pysam.TabixFile(_get_filepath(coverage_file))
    baf_file = pysam.TabixFile(_get_filepath(baf_file))
    return cov_file, baf_file


def tabix_query(tbix, res, chrom, start=None, end=None, reduce=None):
    """
    Call tabix and generate an array of strings for each line it returns.
    """

    # Get data from bed file
    record_name = f"{res}_{chrom}"
    LOG.info(f"Query {tbix.filename}; {record_name} {start} {end}; reduce: {reduce}")
    try:
        records = tbix.fetch(record_name, start, end)
    except ValueError as err:
        LOG.error(err)
        records = []

    if reduce is not None:
        n_true, tot = Fraction(reduce).limit_denominator(1000).as_integer_ratio()
        cmap = itertools.cycle([1] * n_true + [0] * (tot - n_true))
        records = itertools.compress(records, cmap)
    return [r.split("\t") for r in records]


def parse_region_str_old(region: str):
    """
    Parses a region string
    """
    try:
        # Split region in standard format chrom:start-stop
        if ":" in region:
            chrom, pos_range = region.split(":")
            start, end = pos_range.split("-")
            chrom.replace("chr", "")
    except ValueError:
        LOG.error("Wrong region formatting")
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

    return chrom, start, end


def parse_region_str(region: str) -> Optional[ChromosomeRegion]:
    """
    Parses a region string
    """
    try:
        # Split region in standard format chrom:start-stop
        if ":" in region:
            chrom, pos_range = region.split(":")
            start, end = pos_range.split("-")
            chrom.replace("chr", "")
    except ValueError:
        LOG.error("Wrong region formatting")
        return None

    start = int(start)
    end = int(end) if not end == "None" else None

    if end is not None:
        size = end - start
        if size <= 0:
            LOG.error("Invalid input span")
            result = None
    else:
        result = ChromosomeRegion(chrom=chrom, start=start, end=end)
    return result