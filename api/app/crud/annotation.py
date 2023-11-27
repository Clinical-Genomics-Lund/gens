"""CRUD operations for annotations."""
from app.db import gens_db
from app.models.genomic import GenomeBuild, RegionPosition

from .utils import query_region_helper


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
