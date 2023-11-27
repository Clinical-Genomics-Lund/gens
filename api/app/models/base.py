"""Shared data models"""
from enum import Enum

from pydantic import BaseConfig, BaseModel, PositiveInt

from .genomic import Chromosomes


class RWModel(BaseModel):  # pylint: disable=too-few-public-methods
    """Base model for read/ write operations"""

    class Config(BaseConfig):  # pylint: disable=too-few-public-methods
        """Configuratio of base model"""

        allow_population_by_alias = True
        populate_by_name = True


class AnnotationRecordTypes(Enum):
    """Types of annotations in Gens db."""

    TRANSCRIPT = "transcript"
    ANNOTATION = "annotation"


class ZoomLevel(Enum):
    """Zoom level constants.

    A is the lowest zoom level.
    """

    A = "a"
    B = "b"
    C = "c"
    D = "d"


class AnnotationTrackBaseOutput(RWModel):
    """Base data model ."""

    chromosome: Chromosomes
    start_pos: PositiveInt
    end_pos: PositiveInt
    max_height_order: int
    res: ZoomLevel
    status: str
