"""Genomic related models and constants."""
from enum import Enum
from pydantic import BaseModel, PositiveInt

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


class VariantCategory(Enum):
    """Valid categories for variants."""

    STRUCTURAL = "str"
    SINGLE_VAR = "sv"
    SINGLE_NT_VAR = "snv"


class RegionPosition(BaseModel):
    """Genomic region designation."""

    chromosome: Chromosomes
    start: PositiveInt | None
    end: PositiveInt | None

    def has_coordinates(self) -> bool:
        """Check if position has coordinates.

        :return: Return true if start and end pos are defined
        :rtype: bool
        """        
        return self.start is not None and self.end is not None
