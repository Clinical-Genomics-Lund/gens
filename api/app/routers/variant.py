"""Routers for reading and manipulating variant data."""

from fastapi import APIRouter

from app.models.genomic import GenomeBuild
from app.crud.variant import get_variants as get_variants_data
from app.graph import parse_region_str

DEFAULT_TAGS = ["sample"]

@router.post("/get-variant-data", tags=DEFAULT_TAGS)
async def get_variants(region: str | None, genome_build: GenomeBuild):
    """Get BAF and LOG2 coverage information"""
    res, chromosome, start_pos, end_pos = parse_region_str(region, genome_build)
    default_height_order = 0
    base_return = {"status": "ok"}
    # if getting variants from specific regions
    region_params = {}
    if region is not None and genome_build is not None:
        region_params = {
            "chromosome": chromosome,
            "start_pos": start_pos,
            "end_pos": end_pos,
        }
        base_return = {
            **base_return,
            **region_params,
            "res": res,
            "max_height_order": default_height_order,
        }
        # limit renders to b or greater resolution
    # query variants
    variants = list(
        get_variants_data(
            sample_id,
            VariantCategory(variant_category),
            **region_params,
        )
    )
    # return all detected variants
    return { **base_return, "variants": list(variants), "max_height_order": 1 }