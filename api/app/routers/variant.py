"""Routers for reading and manipulating variant data."""

from fastapi import APIRouter, HTTPException, status

from app.crud.variant import get_variants as get_variants_data
from app.exceptions import SampleNotFoundError
from app.graph import parse_region_str
from app.models.base import AnnotationTrackBaseOutput
from app.models.genomic import Chromosomes, GenomeBuild, RegionPosition, VariantCategory
from app.models.variant import ScoutVariants

DEFAULT_TAGS = ["sample"]


class VariantOutput(
    AnnotationTrackBaseOutput
):  # pylint: disable=too-few-public-methods
    """Get variants entrypoint output format."""

    variants: ScoutVariants


router = APIRouter()


@router.get("/get-variant-data", tags=DEFAULT_TAGS)
async def get_variants(
    sample_id: str,
    region: str | None,
    genome_build: int,
    variant_category: VariantCategory,
):
    """Get variants for region from the Scout database."""
    genome_build = GenomeBuild(genome_build)  # todo remove
    res, chromosome, start_pos, end_pos = parse_region_str(region, genome_build)
    if chromosome is not None:
        chromosome = Chromosomes(chromosome)
        region = RegionPosition(
            chromosome=chromosome,
            start=start_pos,
            end=end_pos,
            genome_build=genome_build,
        )
    else:
        region = None

    # query variants
    try:
        variants = get_variants_data(sample_id, variant_category, region)
    except SampleNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(error)
        ) from error

    output = VariantOutput(
        chromosome=chromosome,
        start_pos=start_pos,
        end_pos=end_pos,
        variants=variants,
        res=res,
        max_height_order=0 if region is not None else 1,
        status="ok",
    )
    return output
