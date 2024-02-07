"""Sample related entrypoints, including upload and get coverage."""

from typing import Dict, List

from fastapi import APIRouter
from fastapi.encoders import jsonable_encoder

from app.crud.sample import (
    create_gens_sample,
    get_gens_sample,
    get_gens_samples,
    get_multiple_coverages,
    get_region_coverage,
)
from app.models.sample import (
    FrequencyQueryObject,
    GenomeBuild,
    MultipleCoverageOutput,
    Sample,
)

router = APIRouter()

DEFAULT_TAGS = ["sample"]


@router.get("/samples", tags=DEFAULT_TAGS)
async def get_multiple_samples(
    limit: int | None = None, skip: int | None = None
) -> List[Sample]:
    """Read multiple samples from the database."""
    samples = get_gens_samples(skip=skip, limit=limit)
    return jsonable_encoder(samples)


@router.get("/samples/<sample_id>", tags=DEFAULT_TAGS)
async def get_sample(sample_id: str, genome_build: int) -> Sample:
    """Read info on a single sample."""
    genome_build = GenomeBuild(int(genome_build))
    sample = get_gens_sample(sample_id=sample_id, genome_build=genome_build)
    return jsonable_encoder(sample)


@router.post("/samples/<sample_id>", tags=DEFAULT_TAGS)
async def create_sample(sample: Sample) -> Sample:
    """Read info on a single sample."""
    status = create_gens_sample(sample)
    return jsonable_encoder(sample)


# region=1:1-248956422
# sample_id=23MD10254
# genome_build=38
# hg_filedir=undefined
# x_pos=949.8000000000001
# y_pos=94
# plot_height=180
# extra_plot_width=949.8000000000001&
# top_bottom_padding=8&x_ampl=1424.7&baf_y_start=1&baf_y_end=0&log2_y_start=4&log2_y_end=-4&reduce_data=1
@router.get("/get-coverage", tags=DEFAULT_TAGS)
async def get_coverage_for_region(
    sample_id: str,
    region: str,
    genome_build: int,
    x_pos: float,
    y_pos: float,
    plot_height: int,
    extra_plot_width: float,
    top_bottom_padding: int,
    x_ampl: float,
    baf_y_start: int,
    baf_y_end: int,
    log2_y_start: int,
    log2_y_end: int,
    reduce_data: int,
):
    """Get BAF and LOG2 coverage information for a given region."""
    genome_build = GenomeBuild(genome_build)
    coverage = get_region_coverage(
        sample_id=sample_id,
        region=region,
        genome_build=genome_build,
        x_pos=x_pos,
        y_pos=y_pos,
        plot_height=plot_height,
        extra_plot_width=extra_plot_width,
        top_bottom_padding=top_bottom_padding,
        baf_y_start=baf_y_start,
        baf_y_end=baf_y_end,
        log2_y_start=log2_y_start,
        log2_y_end=log2_y_end,
        reduce_data=reduce_data,
        x_ampl=x_ampl,
    )
    return jsonable_encoder({"status": "ok", **coverage})


@router.post("/get-multiple-coverages", tags=DEFAULT_TAGS)
async def fetch_multiple_coverages(
    query: FrequencyQueryObject,
) -> Dict[str, str | MultipleCoverageOutput]:
    """Get BAF and LOG2 coverage information"""
    coverages: MultipleCoverageOutput = get_multiple_coverages(query)
    return jsonable_encoder({"results": coverages, "status": "ok"})
