"""Sample related entrypoints, including upload and get coverage."""

from typing import Dict, List

from fastapi import APIRouter
from fastapi.encoders import jsonable_encoder

from app.crud.sample import get_multiple_coverages, get_gens_samples, get_gens_sample, create_gens_sample
from app.models.sample import FrequencyQueryObject, MultipleCoverageOutput, Sample, GenomeBuild

router = APIRouter()

DEFAULT_TAGS = ["sample"]


@router.get("/samples", tags=DEFAULT_TAGS)
async def get_multiple_samples(limit: int | None = None, skip: int | None = None) -> List[Sample]:
    """Read multiple samples from the database."""
    samples = get_gens_samples(skip=skip, limit=limit)
    return jsonable_encoder(samples)


@router.get("/samples/<sample_id>", tags=DEFAULT_TAGS)
async def get_sample(
    sample_id: str, 
    genome_build: int) -> Sample:
    """Read info on a single sample."""
    genome_build = GenomeBuild(int(genome_build))
    sample = get_gens_sample(sample_id=sample_id, genome_build=genome_build)
    return jsonable_encoder(sample)


@router.post("/samples/<sample_id>", tags=DEFAULT_TAGS)
async def create_sample(sample: Sample) -> Sample:
    """Read info on a single sample."""
    status = create_gens_sample(sample)
    return jsonable_encoder(sample)


@router.post("/get-multiple-coverages", tags=DEFAULT_TAGS)
async def fetch_multiple_coverages(
    query: FrequencyQueryObject,
) -> Dict[str, str | MultipleCoverageOutput]:
    """Get BAF and LOG2 coverage information"""
    coverages: MultipleCoverageOutput = get_multiple_coverages(query)
    return jsonable_encoder({"results": coverages, "status": "ok"})
