"""
Whole genome visualization of BAF and log2 ratio
"""
import logging
import os
from datetime import date
from logging.config import dictConfig

import connexion
from flask import abort, render_template, request
from flask_compress import Compress
from flask_debugtoolbar import DebugToolbarExtension

from .__version__ import VERSION as version
from .blueprints import gens_bp, home_bp
from .cache import cache
from .db import SampleNotFoundError, init_database
from .errors import (generic_abort_error, generic_exception_error, sample_not_found)
from .graph import parse_region_str
from .io import BAF_SUFFIX, COV_SUFFIX, _get_filepath

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
compress = Compress()


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
        LOG.info("Using default Gens configuration")
        LOG.debug("No user configuration set with $GENS_CONFIG environmental variable")
    else:
        app.config.from_envvar("GENS_CONFIG")
    # initialize database and store db content
    with app.app_context():
        init_database()
    # connect to mongo client
    app.config["DEBUG"] = True
    app.config["SECRET_KEY"] = "pass"

    # prepare app context
    initialize_extensions(app)
    # register bluprints and errors
    register_blueprints(app)
    register_errors(app)

    return app


def initialize_extensions(app):
    """Initialize flask extensions."""
    cache.init_app(app)
    compress.init_app(app)


def register_errors(app):
    """Register error pages for gens app."""
    app.register_error_handler(SampleNotFoundError, sample_not_found)
    app.register_error_handler(404, generic_abort_error)
    app.register_error_handler(416, generic_abort_error)
    app.register_error_handler(500, generic_abort_error)
    app.register_error_handler(Exception, generic_exception_error)


def register_blueprints(app):
    """Register blueprints."""
    app.register_blueprint(gens_bp)
    app.register_blueprint(home_bp)
