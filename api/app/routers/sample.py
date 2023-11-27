"""Sample related entrypoints, including upload and get coverage."""

from typing import Dict

from fastapi import APIRouter
from fastapi.encoders import jsonable_encoder

from app.crud.sample import get_multiple_coverages
from app.models.sample import FrequencyQueryObject, MultipleCoverageOutput

router = APIRouter()

DEFAULT_TAGS = ["sample"]


@router.post("/get-multiple-coverages", tags=DEFAULT_TAGS)
async def fetch_multiple_coverages(
    query: FrequencyQueryObject,
) -> Dict[str, str | MultipleCoverageOutput]:
    """Get BAF and LOG2 coverage information"""
    coverages: MultipleCoverageOutput = get_multiple_coverages(query)
    return jsonable_encoder({"results": coverages, "status": "ok"})
