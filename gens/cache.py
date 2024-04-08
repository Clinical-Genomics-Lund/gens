"""Initiate cachig for app."""
from flask_caching import Cache
import tempfile

tmp_dir = tempfile.TemporaryDirectory(prefix="gens_cache_")
cache = Cache(config={"CACHE_TYPE": "FileSystemCache", "CACHE_DIR": tmp_dir.name})
