"""Functions for rendering Gens"""

import logging
from datetime import date

from flask import Blueprint, abort, current_app, render_template, request

from app import version
from app.api import get_sample
from app.io import _get_filepath, parse_region_str

LOG = logging.getLogger(__name__)

gens_bp = Blueprint(
    "gens",
    __name__,
    template_folder="templates",
    static_folder="static",
    static_url_path="/gens/static",
)


@gens_bp.route("/<path:sample_name>", methods=["GET"])
def display_case(sample_name):
    """
    Renders the Gens template
    Expects sample_id as input to be able to load the sample data
    """
    # get genome build and region
    region = request.args.get("region", None)
    print_page = request.args.get("print_page", "false")
    # if region is not set with args get it from the form
    if not region:
        region = request.form.get("region", "1:1-None")

    # Parse region, default to grch38
    with current_app.app_context():
        genome_build = request.args.to_dict().get("genome_build", "38")

    # verify that sample has been loaded
    sample = get_sample(sample_name, genome_build)

    """
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

    if not parsed_region:
        abort(416)

    chrom, start_pos, end_pos = parsed_region
    """
    api_url = current_app.config["GENS_API_URL"]
    return render_template(
        "gens.html",
        ui_colors=current_app.config["UI_COLORS"],
        chrom='12', #chrom,
        start=1, #start_pos,
        end=10000, #end_pos,
        sample_name=sample_name,
        genome_build=genome_build,
        print_page=print_page,
        annotation='bar', #annotation,
        selected_variant='foo', #selected_variant,
        api_url=api_url,
        todays_date=date.today(),
        version=version,
    )
