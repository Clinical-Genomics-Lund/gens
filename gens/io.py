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


LOG = logging.getLogger(__name__)


def _get_filepath(*args, check=True):
    """Utility function to get file paths with logs."""
    path = os.path.join(*args)
    if not os.path.isfile(path) and check:
        msg = f"File not found: {path}"
        LOG.error(msg)
        raise FileNotFoundError(msg)
    return path


def get_tabix_files(sample_name, hg_path):
    """Get tabix files for sample."""
    LOG.info(f"Get tabix names for sample: {sample_name}, path: {hg_path}")
    cov_file = pysam.TabixFile(_get_filepath(hg_path, sample_name + COV_SUFFIX))
    baf_file = pysam.TabixFile(_get_filepath(hg_path, sample_name + BAF_SUFFIX))
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
