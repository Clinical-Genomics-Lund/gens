"""Mongo database interface."""

from .db import gens_db, scout_db, GensDbCollections
from .utils import close_mongo_connection, connect_to_mongo
from .index import create_index, get_indexes