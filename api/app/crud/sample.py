"""Functions for sample CRUD operations."""
import gzip
import json
import logging
import os
from typing import Dict
from pymongo import DESCENDING
from fastapi import HTTPException, status
from fastapi.encoders import jsonable_encoder

from app.db import gens_db, scout_db
from app.exceptions import RegionParserError, SampleNotFoundError
from app.graph import Request, get_coverage
from app.io import read_tabix_files
from app.models.sample import (
    Chromosomes,
    FrequencyQueryObject,
    GenomeBuild,
    MultipleCoverageOutput,
    Sample,
)
from ..exceptions import RegionParserError

LOG = logging.getLogger(__name__)


def get_gens_sample(sample_id: str, genome_build: GenomeBuild) -> Sample:
    """Get a sample with id."""
    result = gens_db.samples.find_one(
        {"sample_id": sample_id, "genome_build": str(genome_build.value)}
    )

    if result is None:
        raise SampleNotFoundError(
            f'No sample with id: "{sample_id}" in database', sample_id
        )
    return Sample(
        sample_id=result["sample_id"],
        genome_build=genome_build,
        baf_file=result["baf_file"],
        coverage_file=result["coverage_file"],
        overview_file=result["overview_file"],
        created_at=result["created_at"],
    )


def create_gens_sample(sample: Sample) -> Sample:
    """Create new sample."""
    resp = gens_db.samples.insert_one(jsonable_encoder(sample, by_alias=False))
    return resp.inserted_id


def get_gens_samples(skip=None, limit=None):
    """Get samples stored in the databse.

    use n_samples to limit the results to x most recent samples
    """
    samples = []
    query = gens_db.samples.find().sort("created_at", DESCENDING) 
    # add limit
    if skip is not None and isinstance(skip, int):
        query = query.skip(skip)

    if limit is not None and isinstance(limit, int):
        query = query.limit(limit)

    # fetch result and cast to sample object
    results = []
    for res in query:
        sample_obj = Sample(
            sample_id=res["sample_id"],
            genome_build=int(res["genome_build"]),
            baf_file=res["baf_file"],
            coverage_file=res["coverage_file"],
            overview_file=res["overview_file"],
            created_at=res["created_at"],
        )
        results.append(sample_obj)
    return results


def get_scout_case(case_name: str, **projection: Dict[str, int]):
    """Query the Scout database for a case.

    :param case_name: Case display name
    :type case_name: str
    :raises SampleNotFoundError: raised if sample is not in the Scout db
    :return: Case information
    :rtype: _type_
    """
    result = scout_db.case.find_one({"display_name": case_name}, projection)

    if result is None:
        raise SampleNotFoundError(f'No sample with id: "{case_name}" in database')
    return result


def get_region_coverage(
    sample_id,
    region,
    x_pos,
    y_pos,
    plot_height,
    top_bottom_padding,
    baf_y_start,
    baf_y_end,
    log2_y_start,
    log2_y_end,
    genome_build,
    reduce_data,
    x_ampl,
):
    """
    Reads and formats Log2 ratio and BAF values for overview graph
    Returns the coverage in screen coordinates for frontend rendering
    """
    # Validate input
    if sample_id == "":
        msg = f"Invalid case_id: {sample_id}"
        LOG.error(msg)
        raise HTTPException(
            status=status.HTTP_416_RANGE_NOT_SATISFIABLE,
            detail=msg,
        )

    # Set some input values
    req = Request(
        region,
        x_pos,
        y_pos,
        plot_height,
        top_bottom_padding,
        baf_y_start,
        baf_y_end,
        log2_y_start,
        log2_y_end,
        genome_build,
        reduce_data,
    )
    sample_obj = get_gens_sample(sample_id, genome_build)
    cov_file, baf_file = read_tabix_files(sample_obj.coverage_file, sample_obj.baf_file)
    # Parse region
    try:
        reg, n_start, n_end, log2_rec, baf_rec = get_coverage(
            req, x_ampl, cov_fh=cov_file, baf_fh=baf_file
        )
    except RegionParserError as err:
        LOG.error(f"{type(err).__name__} - {err}")
    except Exception as err:
        LOG.error(f"{type(err).__name__} - {err}")

    return { 
        "data": log2_rec,
        "baf": baf_rec,
        "chrom": reg.chrom,
        "x_pos": round(req.x_pos),
        "y_pos": round(req.y_pos),
        "query_start": reg.start_pos,
        "query_end": reg.end_pos,
        "padded_start": n_start,
        "padded_end": n_end,
     }


def get_multiple_coverages(query: FrequencyQueryObject) -> MultipleCoverageOutput:
    """Read default Log2 ratio and BAF values for overview graph."""
    sample_info: Sample = get_gens_sample(query.sample_id, query.genome_build)
    # Try to find and load an overview json data file
    json_data, cov_file, baf_file = None, None, None
    if sample_info.overview_file is not None and os.path.isfile(
        sample_info.overview_file
    ):
        LOG.info("Using json overview file: %s", sample_info.overview_file)
        with gzip.open(sample_info.overview_file, "r") as json_gz:
            json_data = json.loads(json_gz.read().decode("utf-8"))
    else:
        # Fall back to BED files if json files does not exists
        cov_file, baf_file = read_tabix_files(
            sample_info.coverage_file, sample_info.baf_file
        )

    results = {}
    for chrom_info in query.chromosome_pos:
        # Set some input values
        req = Request(
            chrom_info.region,
            chrom_info.x_pos,
            chrom_info.y_pos,
            query.plot_height,
            query.top_bottom_padding,
            query.baf_y_start,
            query.baf_y_end,
            query.log2_y_start,
            query.log2_y_end,
            query.genome_build,
            query.reduce_data,
        )
        chromosome = Chromosomes(chrom_info.region.split(":")[0])
        try:
            reg, *_, log2_rec, baf_rec = get_coverage(
                req,
                chrom_info.x_ampl,
                json_data=json_data,
                cov_fh=cov_file,
                baf_fh=baf_file,
            )
        except RegionParserError as err:
            LOG.error("%s - %s", type(err).__name__, err)

        results[chromosome] = {
            "data": log2_rec,
            "baf": baf_rec,
            "chrom": chromosome,
            "x_pos": round(req.x_pos),
            "y_pos": round(req.y_pos),
            "start": reg.start_pos,
            "end": reg.end_pos,
        }
    return results


def create_sample(sample_obj: Sample) -> None:
    """Store a new sample in the database."""
    LOG.info(f'Store sample %s in database', sample_obj.sample_id)
    gens_db.samples.insert_one(sample_obj)