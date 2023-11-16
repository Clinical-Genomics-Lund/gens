"""Database interface errors."""


class ConnectionNotConfigured(BaseException):
    """Raised when a database have not been configured."""


class DatabaseConnectionError(BaseException):
    """Raised when the connection to the database cant be established."""
