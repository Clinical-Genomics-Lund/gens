"""Database CRUD operations for variants."""
import logging

from app.db import scout_db
from app.models.genomic import RegionPosition, VariantCategory
from app.models.variant import ScoutVariant, ScoutVariants

from .sample import get_scout_case
from .utils import query_region_helper

LOG = logging.getLogger(__name__)


def get_variants(
    case_name: str,
    variant_category: VariantCategory,
    position: RegionPosition | None = None,
) -> ScoutVariants:
    """Search the scout database for variants associated with a case.

    :param case_name: name for a case (not database uid)
    :type case_name: str
    :param variant_category: filter variants on category
    :type variant_category: VariantCategory
    :raises SampleNotFoundError: raised if sample is not in the Scout database
    :return: variants
    :rtype: _type_
    """
    # check if case is loaded into scout
    get_scout_case(case_name)
    # build mongodb query
    query = {
        "case_id": case_name,
        "category": variant_category.value,
    }
    # add chromosome
    if position is not None:
        query["chromosome"] = position.chromosome.value

        if position.has_coordinates():
            # add positions to query
            query = {
                **query,
                **query_region_helper(
                    position.start, position.end, variant_category.value
                ),
            }
    LOG.info("Query Scout for variants: %s", query)
    # query database with default projection to reduce the amount of data
    projection = {
        "variant_id": 1,
        "display_name": 1,
        "position": 1,
        "end": 1,
        "category": 1,
        "sub_category": 1,
        "variant_type": 1,
        "length": 1,
        "cytoband_start": 1,
        "cytoband_end": 1,
        "reference": 1,
        "alternative": 1,
        "quality": 1,
        "rank_score": 1,
    }
    result = scout_db.variant.find(query, projection)
    variants = [ScoutVariant(**variant) for variant in result]
    return variants
