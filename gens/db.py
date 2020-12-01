"""Functions for handeling database connection."""
import os
from enum import Enum

from flask import current_app as app
from pymongo import MongoClient

from .exceptions import ConfigurationException, NoQueryResultsException


class VariantCategory(Enum):
    """Valid categories for variants."""

    STRUCTURAL = 'str'
    SINGLE_VAR = 'sv'
    SINGLE_NT_VAR = 'snv'


class RecordType(Enum):
    """Valid record types in the database."""
    ANNOTATION = 'annotations'
    TRANSCRIPT = 'transcripts'


def _get_config_var(name: str) -> str:
    """Get application configuration variable.

    Variables set as environment overrides variables defined in the configfile."""
    if not any([name in os.environ, name in app.config]):
        raise ConfigurationException(f'{name} not defined')
    return os.environ.get(name, app.config[name]),


def init_database() -> None:
    """Initialize database connection and store variables to the two databases."""
    # verify that database was properly configured
    client = MongoClient(
        host=_get_config_var('MONGODB_HOST'),
        port=_get_config_var('MONGODB_PORT'),
    )
    # store db handlers in configuration
    app.config['SCOUT_DB'] = client[_get_config_var('SCOUT_DBNAME')]
    app.config['GENS_DB'] = client[_get_config_var('GENS_DBNAME')]


def query_variants(case_name: str, variant_category: VariantCategory, **kwargs):
    """Search the scout database for variants associated with a case.

    case_id :: name for a case (not database uid)
    varaint_category :: categories

    Kwargs are optional search parameters that are passed to db.find().
    """
    case_id = app.config['SCOUT_DB'].find_one({'display_name': case_name})
    if case_id is None:
        raise NoQueryResultsException(f'No case with name: {case_name}')
    return app.config['SCOUT_DB'].find({'case_id': case_id, 'category': variant_category, **kwargs})


def query_records_in_region(record_type: RecordType, chrom, start_pos,
                            end_pos, hg_type, height_order=None, **kwargs):
    """Query the gens database for transcript information."""
    collection =   # get record type
    # build base query
    pos = {"$gte": start_pos, "$lte": end_pos}
    query = {"chrom": chrom,
             "hg_type": hg_type,
             "$or": [
                 {"start": pos},
                 {"end": pos},
                 {"$and": [{"start": {"$lte": start_pos}},
                           {"end": {"$gte": end_pos}}]},
             ],
             **kwargs,  # add optional search params
             }
    # build sort order
    sort_order = [("start", 1)]
    if height_order is None:
        sort_order.append(("height_order", 1))
    else:
        query['height_order'] = height_order
    # query database
    return app.config['GENS_DB'][record_type].find(query, {"_id": False}, sort=sort_order)
