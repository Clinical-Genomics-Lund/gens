"""Mongo database interface."""

from .db import GensDbCollections, gens_db, scout_db
from .index import create_index, get_indexes
from .utils import close_mongo_connection, connect_to_mongo
