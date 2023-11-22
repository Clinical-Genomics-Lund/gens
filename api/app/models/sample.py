"""Sample related data models."""
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field, PositiveInt
from typing import List, Dict

from .base import RWModel


class GenomeBuild(Enum):
    """Valid genome builds."""

    HG19 = 19
    HG38 = 38

class Chromosomes(Enum):
    """Valid chromosome names."""
    CH1="1"
    CH2="2"
    CH3="3"
    CH4="4"
    CH5="5"
    CH6="6"
    CH7="7"
    CH8="8"
    CH9="9"
    CH10="10"
    CH11="11"
    CH12="12"
    CH13="13"
    CH14="14"
    CH15="15"
    CH16="16"
    CH17="17"
    CH18="18"
    CH19="19"
    CH20="20"
    CH21="21"
    CH22="22"
    CHX="X"
    CHY="Y"
    MT="MT"


class Sample(RWModel):
    sample_id: str
    genome_build: GenomeBuild
    baf_file: str
    coverage_file: str
    overview_file: str | None = None
    created_at: datetime


class ChromosomePosition(BaseModel):  # pylint: disable=too-few-public-methods
    """Chromosome position description."""

    region: str = Field(
        ..., decription="Regional description string (<chrom>:<start>-<end>)"
    )
    x_pos: float
    y_pos: float
    x_ampl: float = 0


class FrequencyQueryObject(RWModel):  # pylint: disable=too-few-public-methods
    """Input object for coverage queries."""

    sample_id: str
    genome_build: GenomeBuild
    plot_height: float
    top_bottom_padding: float
    baf_y_start: float = Field(
        ..., description="Y coordinate from where to draw BAF track."
    )
    baf_y_end: float = Field(
        ..., description="Y coordinate from where to end draw BAF track."
    )
    log2_y_start: float = Field(
        ..., description="Y coordinate from where to start drawing the LOG2 track."
    )
    log2_y_end: float = Field(
        ..., description="Y coordinate from where to end the drawing of the LOG2 track."
    )
    overview: bool
    reduce_data: int = Field(
        ..., description="The fraction of which to reduce the reported data points."
    )
    chromosome_pos: List[ChromosomePosition] = Field(
        ...,
        description="Array containing objects describing which regions of chromsomes to get",
    )


class FrequencyAndCoverageData(RWModel):  # pylint: disable=too-few-public-methods
    """Container for BAF or LOG2 frequency information."""

    data: List[int | List[int]] = Field(..., description="LOG2 record")
    baf: List[int | List[int]] = Field(..., description="BAF record")
    chrom: Chromosomes
    x_pos: PositiveInt
    y_pos: PositiveInt
    start: int
    end: int


MultipleCoverageOutput = Dict[Chromosomes, FrequencyAndCoverageData]