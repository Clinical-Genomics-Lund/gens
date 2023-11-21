"""Functions for loading and converting data."""
import itertools
import logging
import os
from fractions import Fraction
from typing import Tuple

import pysam

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


def read_tabix_files(coverage_file: str, baf_file: str) -> Tuple[pysam.TabixFile, pysam.TabixFile]:
    """Read coverage and baf Tabix files.

    :param coverage_file: coverage file path
    :type coverage_file: str
    :param baf_file: baf file path
    :type baf_file: str
    :return: Tabix indexed coverage files.
    :rtype: Tuple[pysam.TabixFile, pysam.TabixFile]
    """    
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
