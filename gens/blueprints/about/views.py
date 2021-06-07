"""About the software page."""

import logging

from flask import Blueprint, render_template, current_app

from gens import version
from gens.db import get_timestamps
from itertools import groupby

LOG = logging.getLogger(__name__)

about_bp = Blueprint(
        "about",
        __name__, 
        template_folder="templates", 
        static_folder="static",
        static_url_path="/about/static",
)

# define views
@about_bp.route("/")
@about_bp.route("/about")
def home():
    with current_app.app_context():
        timestamps = get_timestamps()
    return render_template("about.html", timestamps=timestamps, version=version)
