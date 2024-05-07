"""Gens API root entrypoints."""

from typing import Dict

from app import VERSION
from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def read_root() -> Dict[str, str]:
    """API root message

    :return: a welcome message
    :rtype: _type_
    """
    return {"message": "Welcome to the Gens API", "version": VERSION}
