"""Mongodb interface."""

import logging

from pymongo import MongoClient
from pymongo.database import Database as MongoDatabase
from pymongo.errors import ServerSelectionTimeoutError

from app.config import GENS_DB_NAME, SCOUT_DB_NAME

from .errors import ConnectionNotConfigured, DatabaseConnectionError

LOG = logging.getLogger(__name__)


class Database:
    """Generic mongodb interface."""

    def __init__(self, db_name: str) -> None:
        """Setup database connection."""

        self.uri: str = ""
        self.client: MongoClient | None = None
        self.db_name: str = db_name

    @property
    def db(self) -> MongoDatabase:
        """Get database instance.

        :return: Mongo database instance
        :rtype: MongoDatabase
        """
        return self.client[self.db_name]

    def test_connection(self):
        """Test database connection."""
        if self.client is None:
            LOG.warning("Database %s has not been setup", self.db_name)
            raise ConnectionNotConfigured("Database have not been setup.")
        # test connection by performing simple db operation
        try:
            self.client.list_databases()
        except ServerSelectionTimeoutError as exc:
            LOG.warning("Cant connect to database: %s", self.uri)
            raise DatabaseConnectionError() from exc

    def setup(self, uri: str):
        """Setup database connection

        :param uri: Mongodb URI
        :type uri: str
        :raises ValueError: If database have already been setup.
        """
        if self.client is not None:
            raise ConnectionNotConfigured("Database is already initialized.")

        self.uri = uri
        self.client = MongoClient(uri)
        self.test_connection()


class GensDb(Database):
    """Gens database interface."""

    def __init__(self) -> None:
        super().__init__(GENS_DB_NAME)

    def setup(self, uri: str):
        """Setup database connection and collections.

        :param uri: mongodb URI
        :type uri: str
        """
        super().setup(uri)
        self.setup_collections()

    def setup_collections(self) -> None:
        """Store Gens collections as methods."""

        self.samples = self.db["samples"]
        self.updates = self.db["updates"]
        self.chrom_sizes = self.db["chrom-sizes"]
        self.annotations = self.db["annotations"]
        self.transcripts = self.db["transcripts"]


class ScoutDb(Database):
    """Scout database interface."""

    def __init__(self) -> None:
        """Create Scout db interface."""
        super().__init__(SCOUT_DB_NAME)

    def setup(self, uri: str):
        """Setup database connection and collections.

        :param uri: mongodb URI
        :type uri: str
        """
        super().setup(uri)
        self.setup_collections()

    def setup_collections(self) -> None:
        """."""


gens_db = GensDb()
scout_db = ScoutDb()
