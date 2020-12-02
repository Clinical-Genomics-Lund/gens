"""API entry point and helper functions."""
import logging
from datetime import date

from flask import abort, current_app, jsonify, request

from .db import RecordType, init_database, query_records_in_region
from .exceptions import RegionParserException
from .graph import (REQUEST, get_overview_cov, overview_chrom_dimensions,
                    parse_region_str)
from .io import get_tabix_files

LOG = logging.getLogger(__name__)


def get_overview_chrom_dim(x_pos, y_pos, plot_width, hg_type):
    """
    Returns the dimensions of all chromosome graphs in screen coordinates
    for drawing the chromosomes correctly in the overview graph
    """
    LOG.info(f"Get overview chromosome dim: ({x_pos}, {y_pos}), w={plot_width}, {hg_type}")
    chrom_dims = overview_chrom_dimensions(x_pos, y_pos, plot_width, hg_type)
    return jsonify(status="ok", chrom_dims=chrom_dims)


def get_annotation_sources(hg_type=None):
    """
    Returns available annotation source files
    """
    with current_app.app_context():
        collection = current_app.config["GENS_DB"]["annotations"]
        sources = collection.distinct("source", {"hg_type": hg_type})
    return jsonify(status="ok", sources=sources)


def get_annotation_data(region, source, hg_type, collapsed):
    """
    Gets annotation data in requested region and converts the coordinates
    to screen coordinates
    """
    if region == "" or source == "":
        LOG.error("Could not find annotation data in DB")
        return abort(404)

    hg_type = request.args.get("hg_type", "38")
    res, chrom, start_pos, end_pos = parse_region_str(region, hg_type)

    # Do not show annotations at 'a'-resolution
    if not res or res == "a":
        return jsonify(
            status="ok",
            annotations=[],
            start_pos=start_pos,
            end_pos=end_pos,
            max_height_order=0,
        )
    # Get annotations within span [start_pos, end_pos] or annotations that
    # go over the span
    annotations = list(
        query_records_in_region(
            record_type=RecordType.ANNOTATION,
            chrom=chrom,
            start_pos=start_pos,
            end_pos=end_pos,
            hg_type=hg_type,
            source=source,
            height_order=1 if collapsed else None,
        )
    )
    # Calculate maximum height order
    max_height_order = max(t["height_order"] for t in annotations) if annotations else 1

    return jsonify(
        status="ok",
        annotations=annotations,
        start_pos=start_pos,
        end_pos=end_pos,
        max_height_order=max_height_order,
        res=res,
    )


def get_transcript_data(region, hg_type, collapsed):
    """
    Gets transcript data for requested region and converts the coordinates to
    screen coordinates
    """
    res, chrom, start_pos, end_pos = parse_region_str(region, hg_type)

    if region == "":
        LOG.error("Could not find transcript in database")
        return abort(404)

    # Do not show transcripts at 'a'-resolution
    if not res or res == "a":
        return jsonify(
            status="ok",
            transcripts=[],
            start_pos=start_pos,
            end_pos=end_pos,
            max_height_order=0,
        )

    with current_app.app_context():
        collection = current_app.config["GENS_DB"][f"transcripts{hg_type}"]

    # Get transcripts within span [start_pos, end_pos] or transcripts that go over the span
    transcripts = list(
        query_records_in_region(
            record_type=RecordType.TRANSCRIPT,
            chrom=chrom,
            start_pos=start_pos,
            end_pos=end_pos,
            hg_type=hg_type,
            height_order=1 if collapsed else None,
        )
    )
    # Calculate maximum height order
    max_height_order = max(t["height_order"] for t in transcripts) if transcripts else 1

    return jsonify(
        status="ok",
        transcripts=list(transcripts),
        start_pos=start_pos,
        end_pos=end_pos,
        max_height_order=max_height_order,
        res=res,
    )


def get_variant_data(region, hg_type, collapsed):
    """Search Scout database for variants associated with a case and return info in JSON format."""
    res, chrom, start_pos, end_pos = parse_region_str(region, hg_type)
    return jsonify(
        status="ok",
        variants=[],
        start_pos=start_pos,
        end_pos=end_pos,
        res=res,
    )


def get_multiple_coverages(case_id, hg_type, reduce_data, plot_height, top_bottom_padding,
                           baf_y_start, baf_y_end, log2_y_start, log2_y_end, overview, **kwargs):
    """Read default Log2 ratio and BAF values for overview graph."""
    LOG.info(f'Got request for all chromosome coverages: {case_id}')
    # open tabix filehandles
    cov_file, baf_file = get_tabix_files(
        case_id,
        current_app.config[f"HG{hg_type}_PATH"]  # dir where cov files are stored
    )
    data = kwargs.get('body', {})  # get request body
    if 'chromosome_pos' not in data:
        raise ValueError(f'Chromosome position not sent to API')
    results = {}
    for chrom_info in data["chromosome_pos"]:
        # Set some input values
        chromosome = chrom_info['chromosome']
        req = REQUEST(
            f"{chromosome}:0-None",
            chrom_info["x_pos"],
            chrom_info["y_pos"],
            data["plot_height"],
            data["top_bottom_padding"],
            data["baf_y_start"],
            data["baf_y_end"],
            data["log2_y_start"],
            data["log2_y_end"],
            data["hg_type"],
            data["reduce_data"],
        )

        try:
            with current_app.app_context():
                reg, log2_rec, baf_rec = get_overview_cov(
                    req,
                    baf_file,
                    cov_file,
                    chrom_info["x_ampl"],
                )
        except RegionParserException as err:
            LOG.error(f"{type(err).__name__} - {err}")
            return abort(416)
        except RegionParserException as err:
            LOG.error(f"{type(err).__name__} - {err}")
            return abort(404)
        except Exception as err:
            LOG.error(f"{type(err).__name__} - {err}")
            raise err
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


def get_coverage(case_id, region, x_pos, y_pos, plot_height,
                 top_bottom_padding, baf_y_start, baf_y_end,
                 log2_y_start, log2_y_end, hg_type, reduce_data, x_ampl):
    """
    Reads and formats Log2 ratio and BAF values for overview graph
    Returns the coverage in screen coordinates for frontend rendering
    """
    # Validate input
    if case_id == '':
        LOG.error(f"Invalid case_id: {case_id}")
        return abort(416)

    # Set some input values
    req = REQUEST(
        region, x_pos, y_pos, plot_height, top_bottom_padding,
        baf_y_start, baf_y_end, log2_y_start, log2_y_end,
        hg_type, reduce_data)

    hg_filedir = current_app.config[f"HG{hg_type}_PATH"]
    cov_file, baf_file = get_tabix_files(case_id, hg_filedir)
    # Parse region
    try:
        with current_app.app_context():
            reg, log2_rec, baf_rec = get_overview_cov(req, baf_file, cov_file, x_ampl)
    except RegionParserException as err:
        LOG.error(f"{type(err).__name__} - {err}")
        return abort(416)
    except Exception as err:
        LOG.error(f"{type(err).__name__} - {err}")
        raise
        return abort(500)

    return jsonify(
        data=log2_rec,
        baf=baf_rec,
        chrom=reg.chrom,
        x_pos=round(req.x_pos),
        y_pos=round(req.y_pos),
        start=reg.start_pos,
        end=reg.end_pos,
        status="ok",
    )
