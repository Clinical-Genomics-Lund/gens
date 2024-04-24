"""Gens API interface."""

import requests
from .config import GENS_API_URL, REQUEST_TIMEOUT


def get_sample(genome_build):
    pass

def get_samples(limit: int, skip: int):
    """Get multiple samples from API."""
    url = f'{GENS_API_URL}/samples'
    resp = requests.get(url, timeout=REQUEST_TIMEOUT, params={"limit": limit, "skip": skip})

    resp.raise_for_status()
    return resp.json()


def get_timestamps():
    url = f'{GENS_API_URL}/annotations/info'
    resp = requests.get(url, timeout=REQUEST_TIMEOUT)

    resp.raise_for_status()
    return resp.json()