"""Data models returned when fetching information from SCOUT and GENS database interactions."""
from enum import Enum

import attr
from datetime import datetime
from gens.constants import GENOME_BUILDS
from typing import Optional


class VariantCategory(Enum):
    """Valid categories for variants."""

    STRUCTURAL = "str"
    SINGLE_VAR = "sv"
    SINGLE_NT_VAR = "snv"


@attr.s(frozen=True)
class SampleObj:
    sample_id: str = attr.ib()
    baf_file: str = attr.ib()
    coverage_file: str = attr.ib()
    genome_build: int = attr.ib(validator=[
        attr.validators.instance_of(int),
        attr.validators.in_(GENOME_BUILDS),
    ], converter=int)
    created_at: datetime = attr.ib()
    overview_file: Optional[str] = attr.ib(default=None)
