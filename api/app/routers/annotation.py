"""Entrypoints relating to annotation tracks with regions of interest."""
from typing import Any, List

from fastapi import APIRouter, Query

from app.crud.annotation import get_annotations_in_region
from app.graph import parse_region_str
from app.models.base import AnnotationTrackBaseOutput
from app.models.genomic import Chromosomes, GenomeBuild, RegionPosition

router = APIRouter()

DEFAULT_TAGS = ["sample", "annotation"]


class AnnotationOutput(
    AnnotationTrackBaseOutput
):  # pylint: disable=too-few-public-methods
    """Get variants entrypoint output format."""

    annotations: List[Any]


@router.get("/get-annotation-data", tags=DEFAULT_TAGS)
async def get_annotations(
    region: str,
    source: str = Query(..., description="Annotation track"),
    genome_build: int = Query(..., description="Genome build."),
    collapsed: bool = Query(
        ..., description="If track should be rendered as collapsed or not"
    ),
) -> AnnotationOutput:
    """Get annotation for track."""
    genome_build = GenomeBuild(genome_build)  # todo remove
    res, chrom, start_pos, end_pos = parse_region_str(region, genome_build)
    region = RegionPosition(chromosome=Chromosomes(chrom), start=start_pos, end=end_pos)
    annotations = list(
        get_annotations_in_region(
            track_name=source,
            region=region,
            genome_build=genome_build,
            height_order=1 if collapsed else None,
        )
    )
    # Calculate maximum height order
    max_height_order = (
        max(annot["height_order"] for annot in annotations) if annotations else 1
    )
    output = AnnotationOutput(
        chromosome=chrom,
        start_pos=start_pos,
        end_pos=end_pos,
        annotations=annotations,
        res=res,
        max_height_order=max_height_order,
        status="ok",
    )
    return output
