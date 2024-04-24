"""Entrypoints relating to annotation tracks with regions of interest."""
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException, Query, status

from app.crud.annotation import (
    get_annotations_in_region,
    get_track_names,
    search_annotation_db,
    get_track_info, TrackInfo
)
from app.crud.transcript import search_transcript_db
from app.graph import parse_region_str
from app.models.base import AnnotationRecordTypes, AnnotationTrackBaseOutput
from app.models.genomic import Chromosomes, GenomeBuild, RegionPosition

router = APIRouter()

DEFAULT_TAGS = ["sample", "annotation"]


class AnnotationOutput(
    AnnotationTrackBaseOutput
):  # pylint: disable=too-few-public-methods
    """Get variants entrypoint output format."""

    annotations: List[Any]


# -> AnnotationOutput
@router.get("/get-annotation-data", tags=DEFAULT_TAGS)
async def get_annotations(
    region: str,
    source: str = Query(..., description="Annotation track"),
    genome_build: int = Query(..., description="Genome build."),
    collapsed: bool = Query(
        ..., description="If track should be rendered as collapsed or not"
    ),
):
    """Get annotation for track."""
    genome_build = GenomeBuild(genome_build)  # todo remove
    res, chrom, start_pos, end_pos = parse_region_str(region, genome_build)
    region = RegionPosition(
        chromosome=Chromosomes(chrom),
        start=start_pos,
        end=end_pos,
        genome_build=genome_build,
    )
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


@router.get("/get-annotation-sources", tags=DEFAULT_TAGS)
async def get_annotation_sources(genome_build: int) -> Dict[str, str | List[str]]:
    """Get annotation tracks in Gens.

    :param genome_build: Genome build
    :type genome_build: int
    :return: List of annotation tracks
    :rtype: List[str]
    """
    genome_build = GenomeBuild(genome_build)
    names = get_track_names(genome_build)
    return {"status": "ok", "sources": names}


@router.get("/search-annotation", tags=DEFAULT_TAGS)
async def search_annotations(
    query: str, genome_build: int, annotation_type: AnnotationRecordTypes
) -> RegionPosition:
    """Search annotation database."""
    genome_build = GenomeBuild(genome_build)

    if annotation_type == AnnotationRecordTypes.ANNOTATION:
        result = search_annotation_db(query, genome_build)
    else:
        result = search_transcript_db(query, genome_build)

    if len(result) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No element found"
        )
    else:
        result = result[0]

    position = RegionPosition(
        chromosome=Chromosomes(result.get("chrom")),
        start=result.get("start"),
        end=result.get("end"),
        genome_build=genome_build,
    )
    return position


@router.get("/annotations/info", tags=DEFAULT_TAGS)
async def get_annotation_track_info() -> TrackInfo:
    info = get_track_info()
    return info