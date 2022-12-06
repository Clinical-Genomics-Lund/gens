"""Functions for rendering Gens"""

import logging
from datetime import date

from flask import Blueprint, abort, current_app, render_template, request

from gens import version
from gens.cache import cache
from gens.db import query_sample
from gens.graph import parse_region_str
from gens.io import BAF_SUFFIX, COV_SUFFIX, _get_filepath

LOG = logging.getLogger(__name__)

gens_bp = Blueprint(
    "gens",
    __name__,
    template_folder="templates",
    static_folder="static",
    static_url_path="/gens/static",
)


@gens_bp.route("/<path:sample_name>", methods=["GET"])
@cache.cached(timeout=60)
def display_case(sample_name):
    """
    Renders the Gens template
    Expects sample_id as input to be able to load the sample data
    """
    case_name = request.args.get("case_name", None)
    
    # get genome build and region
    region = request.args.get("region", None)
    print_page = request.args.get("print_page", "false")
    # if region is not set with args get it from the form
    if not region:
        region = request.form.get("region", "1:1-None")

    # Parse region, default to grch38
    with current_app.app_context():
        genome_build = request.args.to_dict().get("genome_build", "38")

    parsed_region = parse_region_str(region, genome_build)
    if not parsed_region:
        abort(416)

    # verify that sample has been loaded
    db = current_app.config["GENS_DB"]
    sample = query_sample(db, sample_name, case_name, genome_build)

    # Check that BAF and Log2 file exists
    try:
        _get_filepath(sample.baf_file)
        _get_filepath(sample.coverage_file)
        if sample.overview_file:  # verify json if it exists
            _get_filepath(sample.overview_file)
    except FileNotFoundError as err:
        raise err
    else:
        LOG.info(f"Found BAF and COV files for {sample_name}")
    # which variant to highlight as focused
    selected_variant = request.args.get("variant")

    # get annotation track
    annotation = request.args.get(
        "annotation", current_app.config["DEFAULT_ANNOTATION_TRACK"]
    )

    _, chrom, start_pos, end_pos = parsed_region
    return render_template(
        "gens.html",
        ui_colors=current_app.config["UI_COLORS"],
        chrom=chrom,
        start=start_pos,
        end=end_pos,
        sample_name=sample_name,
        case_name=case_name,
        genome_build=genome_build,
        print_page=print_page,
        annotation=annotation,
        selected_variant=selected_variant,
        todays_date=date.today(),
        version=version,
    )
