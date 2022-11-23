"""Data models returned when fetching information from SCOUT and GENS database interactions."""
from datetime import datetime
from enum import Enum
from typing import Optional

import attr

from gens.constants import GENOME_BUILDS


class VariantCategory(Enum):
    """Valid categories for variants."""

    STRUCTURAL = "str"
    SINGLE_VAR = "sv"
    SINGLE_NT_VAR = "snv"


@attr.s(frozen=True)
class SampleObj:
    sample_id: str = attr.ib()
    case_name: str = attr.ib()
    baf_file: str = attr.ib()
    coverage_file: str = attr.ib()
    genome_build: int = attr.ib(
        validator=[
            attr.validators.instance_of(int),
            attr.validators.in_(GENOME_BUILDS),
        ],
        converter=int,
    )
    created_at: datetime = attr.ib()
    overview_file: Optional[str] = attr.ib(default=None)
