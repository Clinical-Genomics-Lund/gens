"""
Whole genome visualization of BAF and log2 ratio
"""
import logging
import os
from datetime import date
from logging.config import dictConfig

import connexion
from flask import abort, render_template, request
from flask_debugtoolbar import DebugToolbarExtension

from .__version__ import VERSION as version
from .cache import cache
from .db import init_database
from .graph import parse_region_str
from .io import BAF_SUFFIX, COV_SUFFIX, _get_filepath
from .utils import dir_last_updated, get_hg_type

toolbar = DebugToolbarExtension()
dictConfig(
    {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "[%(asctime)s] %(levelname)s in %(module)s: %(message)s",
            }
        },
        "handlers": {
            "wsgi": {
                "class": "logging.StreamHandler",
                "stream": "ext://flask.logging.wsgi_errors_stream",
                "formatter": "default",
            }
        },
        "root": {"level": "INFO", "handlers": ["wsgi"]},
    }
)
LOG = logging.getLogger(__name__)


def create_app():
    """Create and setup Gens application."""
    application = connexion.FlaskApp(
        __name__, specification_dir="openapi/", options={"swagger_ui": True}
    )
    application.add_api("openapi.yaml")
    app = application.app
    # configure app
    app.config["JSONIFY_PRETTYPRINT_REGULAR"] = False
    app.config.from_object("gens.config")
    if os.environ.get("GENS_CONFIG") is None:
        LOG.warning("No user configuration set, set path with $GENS_CONFIG variable")
    else:
        app.config.from_envvar("GENS_CONFIG")
    # initialize database and store db content
    with app.app_context():
        init_database()
    # connect to mongo client
    app.config["DEBUG"] = True
    app.config["SECRET_KEY"] = "pass"
    cache.init_app(app)

    # define views
    @app.route("/")
    def gens_welcome():
        return render_template("home.html", version=version)

    @app.route("/", defaults={"sample_name": ""})
    @app.route("/<path:sample_name>", methods=["GET"])
    @cache.cached(timeout=60)
    def display_case(sample_name):
        """
        Renders the Gens template
        Expects sample_id as input to be able to load the sample data
        """
        if not sample_name:
            LOG.error("No sample requested")
            abort(404)

        # Set whether to get HG37 och HG38 files
        with app.app_context():
            hg_filedir, hg_type = get_hg_type()

        # Check that BAF and Log2 file exists
        try:
            _get_filepath(hg_filedir, sample_name + BAF_SUFFIX)
            _get_filepath(hg_filedir, sample_name + COV_SUFFIX)
        except FileNotFoundError:
            abort(404)
        else:
            LOG.info(f"Found BAF and COV files for {sample_name}")

        # Fetch and parse region
        region = request.args.get("region", None)
        print_page = request.args.get("print_page", "false")
        if not region:
            region = request.form.get("region", "1:100000-200000")

        # Parse region
        with app.app_context():
            hg_type = request.args.get("hg_type", "38")
            parsed_region = parse_region_str(region, hg_type)
        if not parsed_region:
            return abort(416)

        _, chrom, start_pos, end_pos = parsed_region

        # which variant to highlight as focused
        selected_variant = request.args.get("variant")

        # get annotation track
        annotation = request.args.get("annotation")

        return render_template(
            "gens.html",
            ui_colors=app.config["UI_COLORS"],
            chrom=chrom,
            start=start_pos,
            end=end_pos,
            sample_name=sample_name,
            hg_type=hg_type,
            last_updated=dir_last_updated(app.static_folder),
            hg_filedir=hg_filedir,
            print_page=print_page,
            todays_date=date.today(),
            annotation=annotation,
            selected_variant=selected_variant,
            version=version,
        )

    return app
