"""Functions for loading and converting data."""
import itertools
import logging
import os
from fractions import Fraction

import pysam
from flask import Response, abort, request

from .cache import cache

BAF_SUFFIX = ".baf.bed.gz"
COV_SUFFIX = ".cov.bed.gz"
JSON_SUFFIX = ".overview.json.gz"


LOG = logging.getLogger(__name__)


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
    cov_file = pysam.TabixFile(_get_filepath(coverage_file))
    baf_file = pysam.TabixFile(_get_filepath(baf_file))
    return cov_file, baf_file


def get_overview_json_path(sample_name, hg_path):
    """Get json file with cov and baf data for overview."""
    LOG.info(f"Getting overview json file for smaple: {sample_name}, path: {hg_path}")
    try:
        json_file = _get_filepath(hg_path, sample_name + JSON_SUFFIX)
    except FileNotFoundError:
        LOG.info(f"No overview json file found. Will fall back to slow BED fetching!")
        json_file = None
    return json_file


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
