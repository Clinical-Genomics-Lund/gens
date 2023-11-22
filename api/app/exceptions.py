"""Collection of shared exceptions."""


class ConfigurationException(BaseException):
    """Configuration error."""


class DatabaseException(BaseException):
    """Paranet class for database releated errors."""


class GraphException(BaseException):
    """Parent class for graph and coordinate exceptions."""


class NoRecordsException(GraphException):
    """Record related error."""


class SampleNotFoundError(Exception):
    """Raised when a sample is not found."""


class RegionParserError(Exception):
    """Raised if there are errors parsing coverage or frequency info."""
