"""Functions for loading and converting data."""
import logging

from pydantic import BaseModel
from typing import Optional

LOG = logging.getLogger(__name__)


class ChromosomeRegion(BaseModel):
    """Container 0+ """

    chrom: str
    start: Optional[int]
    end: Optional[int]


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