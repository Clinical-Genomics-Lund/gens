"""Sample related data models."""
from datetime import datetime
from enum import Enum
from .base import RWModel


class GenomeBuild(Enum):
    """Valid genome builds."""
    HG19 = 19
    HG38 = 38


class Sample(RWModel):
    sample_id: str
    baf_file: str
    coverage_file: str
    genome_build: GenomeBuild
    created_at: datetime
    overview_file: str | None = None