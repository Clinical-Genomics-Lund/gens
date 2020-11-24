"""Manages possible exceptions."""

class GraphException(BaseException):
    """Parent class for graph and coordinate exceptions."""


class RegionParserException(GraphException):
    """Errors when parsing regions."""

class NoRecordsException(GraphException):
    """Record related error."""
