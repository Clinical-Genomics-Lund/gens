"""Data models returned when fetching information from SCOUT and GENS database interactions."""
from enum import Enum
import attr


class VariantCategory(Enum):
    """Valid categories for variants."""

    STRUCTURAL = "str"
    SINGLE_VAR = "sv"
    SINGLE_NT_VAR = "snv"


class RecordType(Enum):
    """Valid record types in the database."""

    ANNOTATION = "annotations"
    TRANSCRIPT = "transcripts"
