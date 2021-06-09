"""Functions for handeling database connection."""
import logging
import os

from flask import current_app as app
from pymongo import MongoClient
from gens.exceptions import ConfigurationException

LOG = logging.getLogger(__name__)


def _get_config_var(name: str, app: app) -> str:
    """Get application configuration variable.

    Variables set as environment overrides variables defined in the configfile."""
    if not any([name in os.environ, name in app.config]):
        raise ConfigurationException(f"{name} not defined")
    return


def init_database_connection() -> None:
    """Initialize database connection and store variables to the two databases."""
    # verify that database was properly configured
    LOG.info("Initialize db connection")
    variables = {}
    for var_name in ["MONGODB_HOST", "MONGODB_PORT", "SCOUT_DBNAME", "GENS_DBNAME"]:
        if not any([var_name in os.environ, var_name in app.config]):
            raise ConfigurationException(
                f"Variable {var_name} not defined in either config or env variable"
            )
        variables[var_name] = os.environ.get(var_name, app.config.get(var_name))
    # connect to database
    client = MongoClient(
        host=variables["MONGODB_HOST"], port=int(variables["MONGODB_PORT"])
    )
    # store db handlers in configuration
    app.config["SCOUT_DB"] = client[variables["SCOUT_DBNAME"]]
    app.config["GENS_DB"] = client[variables["GENS_DBNAME"]]
