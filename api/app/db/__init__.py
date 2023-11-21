"""Mongo database interface."""

from .utils import close_mongo_connection, connect_to_mongo
from .db import gens_db, scout_db
