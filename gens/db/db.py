"""Functions for handeling database connection."""
import logging
import os

from flask import current_app as app
from pymongo import MongoClient

from gens.exceptions import ConfigurationException

from .models import RecordType, VariantCategory

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
    # lookup case_id from the displayed name
    db = app.config["SCOUT_DB"]
    case_id = db.case.find_one({"display_name": case_name})["_id"]
    if case_id is None:
        raise ValueError(f"No case with name: {case_name}")
    # build query
    query = {
        "case_id": case_id,
        "category": variant_category.value,
    }
    # add chromosome
    if "chromosome" in kwargs:
        query["chromosome"] = kwargs["chromosome"]
    # add start, end position to query
    if all(param in kwargs for param in ["start_pos", "end_pos"]):
        query = {
            **query,
            **_make_query_region(
                kwargs["start_pos"], kwargs["end_pos"], variant_category.value
            ),
        }
    # query database
    LOG.info(f"Query variant database: {query}")
    return db.variant.find(query)


def _make_query_region(start_pos: int, end_pos: int, motif_type="other"):
    """Make a query for a chromosomal region."""
    if motif_type == "sv":  # for sv are start called position
        start_name = "position"
    else:
        start_name = "start"
    pos = {"$gte": start_pos, "$lte": end_pos}
    return {
        "$or": [
            {start_name: pos},
            {"end": pos},
            {"$and": [{start_name: {"$lte": start_pos}}, {"end": {"$gte": end_pos}}]},
        ],
    }


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
    query = {
        "chrom": chrom,
        "hg_type": hg_type,
        **_make_query_region(start_pos, end_pos),
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
