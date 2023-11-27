"""CRUD operations for transcripts."""
from typing import Any, Dict, List

from app.db import gens_db
from app.models.genomic import GenomeBuild, RegionPosition

from .utils import query_region_helper


def get_transcripts_in_region(
    region: RegionPosition,
    genome_build: GenomeBuild,
    height_order: int | None = None,
):
    """Query Gens db for transcripts in a region

    :param region: Region to get transcripts for.
    :type region: RegionPosition
    :param genome_build: Genome build
    :type genome_build: GenomeBuild
    :param height_order: annotation height order, defaults to None
    :type height_order: int | None, optional
    :return: transcript object from the database.
    :rtype: Dict[str, Any]
    """
    query = {
        "chrom": region.chromosome.value,
        "genome_build": genome_build.value,
        **query_region_helper(region.start, region.end),
    }
    # build sort order
    sort_order = [("start", 1)]
    if height_order is None:
        sort_order.append(("height_order", 1))
    else:
        query["height_order"] = height_order
    # query database
    resp = gens_db.transcripts.find(query, {"_id": False}, sort=sort_order)
    return resp


def search_transcript_db(
    text: str, genome_build: GenomeBuild | None
) -> List[Dict[str, Any]]:
    """Search transcript database for matching transcripts.

    :param text: Query text.
    :type text: str
    :param genome_build: Genome build
    :type genome_build: GenomeBuild | None
    :return: List of documents matching query.
    :rtype: List[Dict[str, Any]]
    """
    query = {"name": {"$regex": f"^{text}.+$"}, "genome_build": genome_build.value}
    result = list(gens_db.transcripts.find(query, sort=[("start", 1), ("chrom", 1)]))
    return result
