"""Utility functions."""
from os import path, walk

from flask import current_app, request


def dir_last_updated(directory):
    """
    Returns the date for when the given directory was last updated
    """
    return str(
        max(
            path.getmtime(path.join(root_path, f))
            for root_path, dirs, files in walk(directory)
            for f in files
        )
    )


def get_hg_type():
    """
    Returns whether to fetch files of type HG37 or HG38
    HG38 is default
    """
    hg_type = request.args.get("hg_type", None)
    if hg_type == "38" or hg_type is None:
        return current_app.config["HG38_PATH"], "38"
    return current_app.config["HG19_PATH"], hg_type
