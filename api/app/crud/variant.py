"""Database CRUD operations for variants."""
from app.db import scout_db
from app.models.genomic import VariantCategory, RegionPosition
from app.exceptions import SampleNotFoundError
from .sample import get_scout_case
import logging


LOG = logging.getLogger(__name__)


def get_variants(case_name: str, variant_category: VariantCategory, position: RegionPosition | None = None):
    """Search the scout database for variants associated with a case.

    :param case_name: name for a case (not database uid)
    :type case_name: str
    :param variant_category: filter variants on category
    :type variant_category: VariantCategory
    :raises SampleNotFoundError: raised if sample is not in the Scout database
    :return: variants
    :rtype: _type_
    """    
    # lookup case_id from the displayed name
    get_scout_case(case_name)
    # build mongodb query
    query = {
        "case_id": response["_id"],
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
    return scout_db.variant.find(query)