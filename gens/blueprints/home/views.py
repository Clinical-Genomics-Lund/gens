"""About the software page."""

import logging

from flask import Blueprint, render_template
from flask import current_app as app
from gens.db import get_samples

import cattr
from gens import version

LOG = logging.getLogger(__name__)

home_bp = Blueprint("home", __name__, template_folder="templates")

# define views
@home_bp.route("/")
def home():
    db = app.config['GENS_DB']
    samples = [cattr.unstructure(s) for s in get_samples(db)]
    return render_template("home.html", samples=samples)

@home_bp.route("/about")
def about():
    return render_template("about.html", version=version)
