"""CRUD operations for annotations."""
import logging
from typing import Any, Dict, List

from app.db import gens_db
from app.models.genomic import GenomeBuild, RegionPosition

from .utils import query_region_helper

LOG = logging.getLogger(__name__)


def get_annotations_in_region(
    track_name: str,
    region: RegionPosition,
    genome_build: GenomeBuild,
    height_order: int | None = None,
):
    """Query the gens database for transcript information."""
    # build base query
    query = {
        "chrom": region.chromosome.value,
        "genome_build": genome_build.value,
        **query_region_helper(region.start, region.end),
        "source": track_name,
    }
    # build sort order
    sort_order = [("start", 1)]
    if height_order is None:
        sort_order.append(("height_order", 1))
    else:
        query["height_order"] = height_order
    # query database
    resp = gens_db.annotations.find(query, {"_id": False}, sort=sort_order)
    return resp


def search_annotation_db(
    text: str, genome_build: GenomeBuild | None
) -> List[Dict[str, Any]]:
    """Search annotation database for annotations.

    :param text: Query text.
    :type text: str
    :param genome_build: Genome build
    :type genome_build: GenomeBuild | None
    :return: List of documents matching query.
    :rtype: List[Dict[str, Any]]
    """
    query = {"name": {"$regex": f"^{text}.+$"}, "genome_build": str(genome_build.value)}
    result = list(gens_db.annotations.find(query, sort=[("start", 1), ("chrom", 1)]))
    return result


def get_track_names(genome_build: GenomeBuild) -> List[str]:
    """Get names of annotation tracks loaded into the Gens db.

    :param genome_build: Genome build
    :type genome_build: GenomeBuild
    :return: List of annotation track names.
    :rtype: List[str]
    """
    names = gens_db.annotations.distinct("source", {"genome_build": genome_build.value})
    return names