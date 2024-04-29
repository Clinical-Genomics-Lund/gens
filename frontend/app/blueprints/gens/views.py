"""Functions for rendering Gens"""

import logging
from datetime import date

from flask import Blueprint, abort, current_app, render_template, request

from app import __version__ as version
from app.api import get_sample
from app.io import parse_region_str

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

    # which variant to highlight as focused
    selected_variant = request.args.get("variant")
    # get annotation track
    annotation = request.args.get(
        "annotation", current_app.config["DEFAULT_ANNOTATION_TRACK"]
    )
    parsed_region = parse_region_str(region)

    api_url = current_app.config["GENS_API_URL"]
    return render_template(
        "gens.html",
        ui_colors=current_app.config["UI_COLORS"],
        chrom=parsed_region.chrom,
        start=parsed_region.start,
        end=parsed_region.end,
        sample_name=sample_name,
        genome_build=genome_build,
        print_page=print_page,
        annotation=annotation,
        selected_variant=selected_variant,
        api_url=api_url,
        todays_date=date.today(),
        version=version,
    )
