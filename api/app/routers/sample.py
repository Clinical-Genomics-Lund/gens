"""Sample related entrypoints, including upload and get coverage."""

from enum import Enum
from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, PositiveInt

from app.models.base import RWModel
from app.models.sample import GenomeBuild

router = APIRouter()

DEFAULT_TAGS = ["sample"]


class ChromosomePosition(BaseModel): # pylint: disable=too-few-public-methods
    """Chromosome position description."""

    region: str = Field(
        ..., decription="Regional description string (<chrom>:<start>-<end>)"
    )
    x_pos: PositiveInt
    y_pos: PositiveInt
    x_ampl: float = 0


class FrequencyQueryObject(RWModel): # pylint: disable=too-few-public-methods
    """Input object for coverage queries."""

    sample_id: str
    baf_y_start: int = Field(
        ..., description="Y coordinate from where to draw BAF track."
    )
    baf_y_end: int = Field(
        ..., description="Y coordinate from where to end draw BAF track."
    )
    log2_y_start: int = Field(
        ..., description="Y coordinate from where to start drawing the LOG2 track."
    )
    log2_y_end: int = Field(
        ..., description="Y coordinate from where to end the drawing of the LOG2 track."
    )
    genome_build: GenomeBuild
    reduce_data: float = Field(
        ..., description="The fraction of which to reduce the reported data points."
    )
    chromosome_pos: List[ChromosomePosition] = Field(
        ...,
        description="Array containing objects describing which regions of chromsomes to get",
    )


class FrequencyData(RWModel): # pylint: disable=too-few-public-methods
    """Container for BAF or LOG2 frequency information."""

    data: List[int] = Field(..., description="LOG2 record")
    baf: List[int] = Field(..., description="BAF record")
    chorm: str
    x_pos: PositiveInt
    y_pos: PositiveInt
    start: PositiveInt
    end: PositiveInt
    status: str


Frequencies = List[FrequencyData]


@router.post("/get-multiple-coverages", tags=DEFAULT_TAGS, response_model=Frequencies)
async def get_multiple_coverages(query: FrequencyQueryObject) -> Frequencies:
    """Get BAF and LOG2 coverage information"""
    coverages = []
    return coverages
