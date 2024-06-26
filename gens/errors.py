"""Defenition of custom error pages"""

import os

from flask import render_template


def sample_not_found(error):
    """Resource not found."""
    file_name = os.path.basename(str(error))

    return (
        render_template(
            "sample_not_found.html",
            missing_file=file_name,
        ),
        404,
    )


def generic_error(error):
    """Internal server error page."""
    return (
        render_template(
            "generic_error.html",
            error_code=error.code,
            error_desc=error.description,
        ),
        error.code,
    )
