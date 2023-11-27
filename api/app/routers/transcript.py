"""Entrypoints relating to annotation tracks with regions of interest."""
from typing import Any, List

from fastapi import APIRouter, Query

from app.crud.transcript import get_transcripts_in_region
from app.graph import parse_region_str
from app.models.base import AnnotationTrackBaseOutput
from app.models.genomic import Chromosomes, GenomeBuild, RegionPosition

router = APIRouter()

DEFAULT_TAGS = ["sample", "transcript"]


class TranscriptOutput(
    AnnotationTrackBaseOutput
):  # pylint: disable=too-few-public-methods
    """Get variants entrypoint output format."""

    transcripts: List[Any]


@router.get("/get-transcript-data", tags=DEFAULT_TAGS)
def get_transcript_data(
    region: str = Query(
        ..., description="Region string [chromosome:start-end].", min_length=1
    ),
    genome_build: int = Query(..., description="Genome build."),
    collapsed: bool = Query(
        ..., description="If track should be rendered as collapsed or not"
    ),
) -> TranscriptOutput:
    """Get transcripts in requested region and to screen coordinates."""
    genome_build = GenomeBuild(genome_build)  # todo remove
    res, chrom, start_pos, end_pos = parse_region_str(region, genome_build)
    region = RegionPosition(chromosome=Chromosomes(chrom), start=start_pos, end=end_pos)

    # Get transcripts within span [start_pos, end_pos] or transcripts that go over the span
    transcripts = list(
        get_transcripts_in_region(
            chrom=chrom,
            start_pos=start_pos,
            end_pos=end_pos,
            genome_build=genome_build,
            height_order=1 if collapsed else None,
        )
    )
    # Calculate maximum height order
    max_height_order = max(t["height_order"] for t in transcripts) if transcripts else 1

    output = TranscriptOutput(
        chromosome=chrom,
        start_pos=start_pos,
        end_pos=end_pos,
        transcripts=transcripts,
        res=res,
        max_height_order=max_height_order,
        status="ok",
    )
    return output
