"""Initiate cachig for app."""
from flask_caching import Cache

cache = Cache(config={"CACHE_TYPE": "FileSystemCache", "CACHE_DIR": "/tmp"})
