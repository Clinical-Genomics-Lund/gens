"""Gens API interface."""

import requests
from pathlib import Path
from .config import GENS_API_URL, REQUEST_TIMEOUT


def build_url(*path):
    paths = [sub_path.rstrip("/") for sub_path in path]
    return "/".join(paths)


def get_sample(sample_id: str, genome_build: str):
    url = build_url(GENS_API_URL, 'samples', sample_id)
    resp = requests.get(url, timeout=REQUEST_TIMEOUT, params={"genome_build": genome_build})

    resp.raise_for_status()
    return resp.json()


def get_samples(limit: int, skip: int):
    """Get multiple samples from API."""
    url = build_url(GENS_API_URL, 'samples')
    resp = requests.get(url, timeout=REQUEST_TIMEOUT, params={"limit": limit, "skip": skip})

    resp.raise_for_status()
    return resp.json()


def get_timestamps():
    url = build_url(GENS_API_URL, 'annotations', 'info')
    resp = requests.get(url, timeout=REQUEST_TIMEOUT)

    resp.raise_for_status()
    return resp.json()