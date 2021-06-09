"""Utility functions."""
from os import path, walk

from flask import current_app, request


def get_genome_build():
    """
    Returns whether to fetch files of type HG37 or HG38
    HG38 is default
    """
    genome_build = request.args.get("genome_build", None)
    if genome_build == "38" or genome_build is None:
        return current_app.config["HG38_PATH"], "38"
    return current_app.config["HG37_PATH"], genome_build
