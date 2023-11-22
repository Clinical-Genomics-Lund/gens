"""Functions for sample CRUD operations."""
import gzip
import json
import logging
import os

from app.db import gens_db
from app.exceptions import RegionParserError, SampleNotFoundError
from app.graph import Request, get_coverage
from app.io import read_tabix_files
from app.models.sample import Sample, FrequencyQueryObject, GenomeBuild, MultipleCoverageOutput, Chromosomes

LOG = logging.getLogger(__name__)


def read_sample(sample_id: str, genome_build: GenomeBuild) -> Sample:
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


def read_multiple_coverages(query: FrequencyQueryObject) -> MultipleCoverageOutput:
    """Read default Log2 ratio and BAF values for overview graph."""
    sample_info: Sample = read_sample(query.sample_id, query.genome_build)
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