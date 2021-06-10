"""About the software page."""

import logging
from itertools import groupby

from flask import Blueprint, current_app, render_template
import os

from gens import version
from gens.db import get_timestamps, get_samples

LOG = logging.getLogger(__name__)

IN_CONFIG = (
    "ENV",
    "DEFAULT_ANNOTATION_TRACK",
    "GENS_DBNAME",
    "SCOUT_DBNAME",
    "MONGODB_HOST",
    "MONGODB_PORT",
)

home_bp = Blueprint(
    "home",
    __name__,
    template_folder="templates",
    static_folder="static",
    static_url_path="/home/static",
)


# define views
@home_bp.route("/", methods=['GET', 'POST'])
@home_bp.route("/home", methods=['GET', 'POST'])
def home():
    db = current_app.config["GENS_DB"]

    samples = [{
        'sample_id': smp.sample_id,
        'genome_build': smp.genome_build,
        'has_overview_file': smp.overview_file is not None,
        'files_present': os.path.isfile(smp.baf_file) and os.path.isfile(smp.coverage_file),
        'created_at': smp.created_at.strftime("%Y-%m-%d"),
        } for smp in get_samples(db)]
    return render_template(
        "home.html",
        samples=samples,
        version=version,
    )

@home_bp.route("/about")
def about():
    with current_app.app_context():
        timestamps = get_timestamps()
        config = {cnf: current_app.config.get(cnf) for cnf in IN_CONFIG}
        ui_colors = current_app.config.get("UI_COLORS")
    return render_template(
        "about.html",
        timestamps=timestamps,
        version=version,
        config=config,
        ui_colors=ui_colors,
    )
