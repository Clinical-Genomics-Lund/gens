"""Utility functions for open and closing database connections."""
import logging

from app.config import MONGODB_URI

from .db import gens_db, scout_db

LOG = logging.getLogger(__name__)


async def connect_to_mongo() -> None:
    """Setup connection to Gens and Scout mongo databases."""
    logging.info("Initiate connection to mongo database")
    gens_db.setup(MONGODB_URI)
    scout_db.setup(MONGODB_URI)
    logging.info("Connection successfull")


async def close_mongo_connection() -> None:
    """Teardown connection to the mongo databases."""
    logging.info("Initiate teardown of database connections")
    gens_db.client.close()
    scout_db.client.close()
    logging.info("Teardown successfull")
