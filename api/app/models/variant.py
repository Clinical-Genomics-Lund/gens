"""Variant related data."""

from typing import List

from pydantic import Field

from .base import RWModel
from .genomic import VariantCategory


class ScoutVariant(RWModel):
    """Container of variant information from Scout."""

    id: str = Field(..., alias="_id")
    variant_id: str
    display_name: str
    category: VariantCategory
    sub_category: str
    position: int
    end: int
    length: int
    cytoband_start: str
    cytoband_end: str
    reference: str
    alternative: str
    quality: float | int
    rank_score: float | int


ScoutVariants = List[ScoutVariant]
