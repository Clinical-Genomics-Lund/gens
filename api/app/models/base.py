"""Shared data models"""
from pydantic import BaseConfig, BaseModel
from enum import Enum


class RWModel(BaseModel):  # pylint: disable=too-few-public-methods
    """Base model for read/ write operations"""

    class Config(BaseConfig):  # pylint: disable=too-few-public-methods
        """Configuratio of base model"""

        allow_population_by_alias = True
        populate_by_name = True


class ZoomLevel(Enum):
    """Zoom level constants.
    
    A is the lowest zoom level.
    """
    A = "a"
    B = "b"
    C = "c"
    D = "d"