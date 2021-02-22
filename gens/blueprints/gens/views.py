"""Functions for rendering Gens"""

import logging

from flask import Blueprint, abort, current_app, render_template, request

from gens.__version__ import VERSION as version
from gens.cache import cache
from gens.graph import parse_region_str
from gens.io import BAF_SUFFIX, COV_SUFFIX, _get_filepath
from gens.utils import get_hg_type
from datetime import date


LOG = logging.getLogger(__name__)

gens_bp = Blueprint(
    "gens", __name__,
    template_folder="templates",
    static_folder="static",
    static_url_path="/gens/static",
)


@gens_bp.route("/", defaults={"sample_name": ""})
@gens_bp.route("/<path:sample_name>", methods=["GET"])
@cache.cached(timeout=60)
def display_case(sample_name):
    """
    Renders the Gens template
    Expects sample_id as input to be able to load the sample data
    """
    if not sample_name:
        LOG.error("No sample requested")
        abort(404)

    # Set whether to get HG37 och HG38 files
    with current_app.app_context():
        hg_filedir, hg_type = get_hg_type()

    # Check that BAF and Log2 file exists
    try:
        _get_filepath(hg_filedir, sample_name + BAF_SUFFIX)
        _get_filepath(hg_filedir, sample_name + COV_SUFFIX)
    except FileNotFoundError as err:
        abort(416)
        raise err
    else:
        LOG.info(f"Found BAF and COV files for {sample_name}")

    # Fetch and parse region
    region = request.args.get("region", None)
    print_page = request.args.get("print_page", "false")
    if not region:
        region = request.form.get("region", "1:100000-200000")

    # Parse region
    with current_app.app_context():
        hg_type = request.args.get("hg_type", "38")
        parsed_region = parse_region_str(region, hg_type)
    if not parsed_region:
        return abort(416)

    _, chrom, start_pos, end_pos = parsed_region

    # which variant to highlight as focused
    selected_variant = request.args.get("variant")

    # get annotation track
    annotation = request.args.get("annotation", current_app.config["DEFAULT_ANNOTATION_TRACK"])

    return render_template(
        "gens.html",
        ui_colors=current_app.config["UI_COLORS"],
        chrom=chrom,
        start=start_pos,
        end=end_pos,
        sample_name=sample_name,
        hg_type=hg_type,
        hg_filedir=hg_filedir,
        print_page=print_page,
        todays_date=date.today(),
        annotation=annotation,
        selected_variant=selected_variant,
        version=version,
    )
