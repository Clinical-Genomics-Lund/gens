"""API entry point and helper functions."""
import gzip
import json
import logging
import os
import re
from datetime import date
from typing import List

import attr
import cattr
import connexion
from flask import abort, current_app, jsonify, request

from gens.db import (ANNOTATIONS_COLLECTION, TRANSCRIPTS_COLLECTION,
                     VariantCategory, get_chromosome_size,
                     query_records_in_region, query_sample, query_variants)
from gens.exceptions import RegionParserException
from gens.graph import (REQUEST, get_cov, overview_chrom_dimensions,
                        parse_region_str)

from .constants import CHROMOSOMES, GENOME_BUILDS
from .io import get_tabix_files

LOG = logging.getLogger(__name__)


@attr.s(auto_attribs=True, frozen=True)
class ChromosomePosition:
    """Data model for the chromosome position data"""

    region: str = attr.ib()
    x_pos: float
    y_pos: float
    x_ampl: float

    @region.validator
    def valid_region(self, attribute, value):
        """Validate region string.

        Expected format <chom>:<start>-<end>
        chrom: in CHROMOSOMES
        start: >= 0
        end: [0-9]+|None
        """
        chrom, start, end = re.search(r"^(.+):(.+)-(.+)$", value).groups()
        if chrom not in CHROMOSOMES:
            raise ValueError(f"{chrom} is not a valid chromosome name")
        if 0 > float(start):
            raise ValueError(f"{start} is not a valid start position")


@attr.s(auto_attribs=True, frozen=True)
class ChromCoverageRequest:
    """Request for getting coverage from multiple chromosome and regions."""

    sample_id: str
    case_name: str
    genome_build: int = attr.ib()
    plot_height: float
    top_bottom_padding: float
    baf_y_start: float
    baf_y_end: float
    log2_y_start: float
    log2_y_end: float
    overview: bool
    reduce_data: float = attr.ib()
    chromosome_pos: List[ChromosomePosition]

    @genome_build.validator
    def valid_genome_build(self, attribute, value):
        if not value in GENOME_BUILDS:
            raise ValueError(f"{value} is not of valid hg types; {GENOME_BUILDS}")

    @reduce_data.validator
    def valid_perc(self, attribute, value):
        if not 0 <= value <= 1:
            raise ValueError(f"{value} is not within 0-1")


def get_overview_chrom_dim(x_pos, y_pos, plot_width, genome_build):
    """
    Returns the dimensions of all chromosome graphs in screen coordinates
    for drawing the chromosomes correctly in the overview graph
    """
    LOG.info(
        f"Get overview chromosome dim: ({x_pos}, {y_pos}), w={plot_width}, {genome_build}"
    )
    chrom_dims = overview_chrom_dimensions(x_pos, y_pos, plot_width, genome_build)
    return jsonify(status="ok", chrom_dims=chrom_dims)


def get_annotation_sources(genome_build):
    """
    Returns available annotation source files
    """
    with current_app.app_context():
        collection = current_app.config["GENS_DB"][ANNOTATIONS_COLLECTION]
        sources = collection.distinct("source", {"genome_build": str(genome_build)})
    return jsonify(status="ok", sources=sources)


def get_annotation_data(region, source, genome_build, collapsed):
    """
    Gets annotation data in requested region and converts the coordinates
    to screen coordinates
    """
    if region == "" or source == "":
        LOG.error("Could not find annotation data in DB")
        return abort(404)

    genome_build = request.args.get("genome_build", "38")
    res, chrom, start_pos, end_pos = parse_region_str(region, genome_build)

    # Get annotations within span [start_pos, end_pos] or annotations that
    # go over the span
    annotations = list(
        query_records_in_region(
            record_type=ANNOTATIONS_COLLECTION,
            chrom=chrom,
            start_pos=start_pos,
            end_pos=end_pos,
            genome_build=genome_build,
            source=source,
            height_order=1 if collapsed else None,
        )
    )
    # Calculate maximum height order
    max_height_order = max(t["height_order"] for t in annotations) if annotations else 1

    return jsonify(
        status="ok",
        chromosome=chrom,
        start_pos=start_pos,
        end_pos=end_pos,
        annotations=annotations,
        max_height_order=max_height_order,
        res=res,
    )


def get_transcript_data(region, genome_build, collapsed):
    """
    Gets transcript data for requested region and converts the coordinates to
    screen coordinates
    """
    res, chrom, start_pos, end_pos = parse_region_str(region, genome_build)

    if region == "":
        LOG.error("Could not find transcript in database")
        return abort(404)

    # Get transcripts within span [start_pos, end_pos] or transcripts that go over the span
    transcripts = list(
        query_records_in_region(
            record_type=TRANSCRIPTS_COLLECTION,
            chrom=chrom,
            start_pos=start_pos,
            end_pos=end_pos,
            genome_build=genome_build,
            height_order=1 if collapsed else None,
        )
    )
    # Calculate maximum height order
    max_height_order = max(t["height_order"] for t in transcripts) if transcripts else 1

    return jsonify(
        status="ok",
        chromosome=chrom,
        start_pos=start_pos,
        end_pos=end_pos,
        max_height_order=max_height_order,
        res=res,
        transcripts=list(transcripts),
    )


def search_annotation(query: str, genome_build, annotation_type):
    """Search for anntations of genes and return their position."""
    # Lookup queried element
    collection = current_app.config["GENS_DB"][annotation_type]
    db_query = {"gene_name": re.compile("^" + re.escape(query) + "$", re.IGNORECASE)}

    if genome_build and int(genome_build) in GENOME_BUILDS:
        db_query["genome_build"] = genome_build

    elements = collection.find(db_query, sort=[("start", 1), ("chrom", 1)])
    # if no results was found
    if elements.count() == 0:
        msg = f"Did not find gene name: {query}"
        LOG.warning(msg)
        data = {"message": msg}
        response_code = 404
    else:
        start_elem = elements.next()
        end_elem = max(elements, key=lambda elem: elem.get("end"))
        data = {
            "chromosome": start_elem.get("chrom"),
            "start_pos": start_elem.get("start"),
            "end_pos": end_elem.get("end"),
            "genome_build": start_elem.get("genome_build"),
        }
        response_code = 200

    return jsonify({**data, "status": response_code})


def get_variant_data(case_name, sample_id, variant_category, **optional_kwargs):
    """Search Scout database for variants associated with a case and return info in JSON format."""
    default_height_order = 0
    base_return = {"status": "ok"}
    # get optional variables
    genome_build = optional_kwargs.get("genome_build")
    region = optional_kwargs.get("region")
    # if getting variants from specific regions
    region_params = {}
    if region is not None and genome_build is not None:
        res, chromosome, start_pos, end_pos = parse_region_str(region, genome_build)
        region_params = {
            "chromosome": chromosome,
            "start_pos": start_pos,
            "end_pos": end_pos,
        }
        base_return = {
            **base_return,
            **region_params,
            "res": res,
            "max_height_order": default_height_order,
        }
        # limit renders to b or greater resolution
    # query variants
    try:
        variants = list(
            query_variants(
                case_name,
                sample_id,
                cattr.structure(variant_category, VariantCategory),
                **region_params,
            )
        )
    except ValueError as err:
        abort(404, str(err))
    # return all detected variants
    return (
        jsonify(
            {
                **base_return,
                "variants": list(variants),
                "max_height_order": 1,
            }
        ),
        200,
    )


def get_multiple_coverages():
    """Read default Log2 ratio and BAF values for overview graph."""
    if connexion.request.is_json:
        data = cattr.structure(connexion.request.get_json(), ChromCoverageRequest)
    else:
        return data, 404
    LOG.info(f"Got request for all chromosome coverages: {data.sample_id}")

    # read sample information
    db = current_app.config["GENS_DB"]
    sample_obj = query_sample(db, data.sample_id, data.case_name, data.genome_build)
    # Try to find and load an overview json data file
    json_data, cov_file, baf_file = None, None, None
    if sample_obj.overview_file and os.path.isfile(sample_obj.overview_file):
        LOG.info(f"Using json overview file: {sample_obj.overview_file}")
        with gzip.open(sample_obj.overview_file, "r") as json_gz:
            json_data = json.loads(json_gz.read().decode("utf-8"))
    else:
        # Fall back to BED files if json files does not exists
        cov_file, baf_file = get_tabix_files(
            sample_obj.coverage_file, sample_obj.baf_file
        )

    results = {}
    for chrom_info in data.chromosome_pos:
        # Set some input values
        req = REQUEST(
            chrom_info.region,
            chrom_info.x_pos,
            chrom_info.y_pos,
            data.plot_height,
            data.top_bottom_padding,
            data.baf_y_start,
            data.baf_y_end,
            data.log2_y_start,
            data.log2_y_end,
            data.genome_build,
            data.reduce_data,
        )
        chromosome = chrom_info.region.split(":")[0]
        try:
            with current_app.app_context():
                reg, *_, log2_rec, baf_rec = get_cov(
                    req,
                    chrom_info.x_ampl,
                    json_data=json_data,
                    cov_fh=cov_file,
                    baf_fh=baf_file,
                )
        except RegionParserException as err:
            LOG.error(f"{type(err).__name__} - {err}")
            return abort(416)
        except Exception as err:
            LOG.error(f"{type(err).__name__} - {err}")
            return abort(500)

        results[chromosome] = {
            "data": log2_rec,
            "baf": baf_rec,
            "chrom": reg.chrom,
            "x_pos": round(req.x_pos),
            "y_pos": round(req.y_pos),
            "start": reg.start_pos,
            "end": reg.end_pos,
        }
    return jsonify(
        results=results,
        status="ok",
    )


def get_coverage(
    sample_id,
    case_name,
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
        LOG.error(f"Invalid case_id: {sample_id}")
        return abort(416)

    # Set some input values
    req = REQUEST(
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
    db = current_app.config["GENS_DB"]
    sample_obj = query_sample(db, sample_id, case_name, genome_build)
    cov_file, baf_file = get_tabix_files(sample_obj.coverage_file, sample_obj.baf_file)
    # Parse region
    try:
        with current_app.app_context():
            reg, n_start, n_end, log2_rec, baf_rec = get_cov(
                req, x_ampl, cov_fh=cov_file, baf_fh=baf_file
            )
    except RegionParserException as err:
        LOG.error(f"{type(err).__name__} - {err}")
        return abort(416)
    except Exception as err:
        LOG.error(f"{type(err).__name__} - {err}")
        return abort(500)

    return jsonify(
        data=log2_rec,
        baf=baf_rec,
        chrom=reg.chrom,
        x_pos=round(req.x_pos),
        y_pos=round(req.y_pos),
        query_start=reg.start_pos,
        query_end=reg.end_pos,
        padded_start=n_start,
        padded_end=n_end,
        status="ok",
    )


def get_chromosome_info(chromosome, genome_build):
    """Query the database for information on a chromosome."""
    db = current_app.config["GENS_DB"]

    chrom_info = get_chromosome_size(db, chromosome.upper(), genome_build)
    del chrom_info["_id"]
    return jsonify(chrom_info)
