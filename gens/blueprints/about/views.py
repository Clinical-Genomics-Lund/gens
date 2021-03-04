"""About the software page."""

import logging

from flask import Blueprint, render_template

import gens

LOG = logging.getLogger(__name__)

about_bp = Blueprint("about", __name__, template_folder="templates")

# define views
@about_bp.route("/")
@about_bp.route("/about")
def home():
    return render_template("about.html", version=gens.version)
