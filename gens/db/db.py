"""Functions for handeling database connection."""
import logging
import os

from flask import current_app as app
from pymongo import MongoClient

from gens.exceptions import ConfigurationException
from .models import VariantCategory, RecordType

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


def query_variants(case_name: str, variant_category: VariantCategory, **kwargs):
    """Search the scout database for variants associated with a case.

    case_id :: name for a case (not database uid)
    varaint_category :: categories

    Kwargs are optional search parameters that are passed to db.find().
    """
    case_id = app.config["SCOUT_DB"].find_one({"display_name": case_name})
    if case_id is None:
        raise LOG.warning(f"No case with name: {case_name}")
    return app.config["SCOUT_DB"].find(
        {"case_id": case_id, "category": variant_category, **kwargs}
    )


def query_records_in_region(
    record_type: RecordType,
    chrom,
    start_pos,
    end_pos,
    hg_type,
    height_order=None,
    **kwargs,
):
    """Query the gens database for transcript information."""
    # build base query
    pos = {"$gte": start_pos, "$lte": end_pos}
    query = {
        "chrom": chrom,
        "hg_type": hg_type,
        "$or": [
            {"start": pos},
            {"end": pos},
            {"$and": [{"start": {"$lte": start_pos}}, {"end": {"$gte": end_pos}}]},
        ],
        **kwargs,  # add optional search params
    }
    # build sort order
    sort_order = [("start", 1)]
    if height_order is None:
        sort_order.append(("height_order", 1))
    else:
        query["height_order"] = height_order
    # query database
    return app.config["GENS_DB"][record_type.value].find(
        query, {"_id": False}, sort=sort_order
    )
