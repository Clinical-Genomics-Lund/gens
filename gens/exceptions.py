"""Manages possible exceptions."""


class ConfigurationException(BaseException):
    """Configuration error."""


class DatabaseException(BaseException):
    """Paranet class for database releated errors."""


class GraphException(BaseException):
    """Parent class for graph and coordinate exceptions."""


class RegionParserException(GraphException):
    """Errors when parsing regions."""


class NoRecordsException(GraphException):
    """Record related error."""
