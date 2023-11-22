"""Sample related entrypoints, including upload and get coverage."""

from typing import Dict

from fastapi import APIRouter
from fastapi.encoders import jsonable_encoder

from app.models.sample import FrequencyQueryObject, MultipleCoverageOutput
from app.crud.sample import read_multiple_coverages

router = APIRouter()

DEFAULT_TAGS = ["sample"]

#, response_model=Frequencies
# -> Dict[str, str | MultipleCoverageOutput]
@router.post("/get-multiple-coverages", tags=DEFAULT_TAGS)
async def get_multiple_coverages(query: FrequencyQueryObject) -> Dict[str, str | MultipleCoverageOutput]:
    """Get BAF and LOG2 coverage information"""
    coverages: Frequencies = read_multiple_coverages(query)
    return jsonable_encoder({"results": coverages, "status": "ok"})