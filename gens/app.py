"""
Whole genome visualization of BAF and log2 ratio
"""

import logging
import os
import re
from collections import namedtuple
from datetime import date
from logging.config import dictConfig
from os import path, walk
from subprocess import PIPE, CalledProcessError, Popen

import pysam
from flask import (Flask, Response, abort, current_app, jsonify,
                   render_template, request)
from pymongo import MongoClient

from .__version__ import VERSION as version
from .graph import (overview_chrom_dimensions, parse_region_str,
                    set_graph_values, set_region_values)
from .io import BAF_SUFFIX, COV_SUFFIX, convert_data, load_data
from .utils import dir_last_updated, get_hg_type

dictConfig(
    {
        "version": 1,
        "formatters": {
            "default": {
                "format": "[%(asctime)s] %(levelname)s in %(module)s: %(message)s",
            }
        },
        "handlers": {
            "wsgi": {
                "class": "logging.StreamHandler",
                "stream": "ext://flask.logging.wsgi_errors_stream",
                "formatter": "default",
            }
        },
        "root": {"level": "INFO", "handlers": ["wsgi"]},
    }
)
LOG = logging.getLogger(__name__)

REQUEST = namedtuple(
    "request",
    (
        "region",
        "x_pos",
        "y_pos",
        "plot_height",
        "top_bottom_padding",
        "baf_y_start",
        "baf_y_end",
        "log2_y_start",
        "log2_y_end",
    ),
)


def create_app(test_config=None):
    """Create and setup Gens application."""

    app = Flask(__name__)

    # configure app
    app.config["JSONIFY_PRETTYPRINT_REGULAR"] = False
    client = MongoClient(
        host=os.environ.get("MONGODB_HOST", "10.0.224.63"),
        port=os.environ.get("MONGODB_PORT", 27017),
    )
    app.config["DB"] = client["gens"]
    app.config.from_object("gens.config")
    if os.environ.get("GENS_CONFIG") is None:
        LOG.warning("No user configuration set, set path with $GENS_CONFIG variable")
    else:
        app.config.from_envvar("GENS_CONFIG")

    @app.route("/")
    def gens_welcome():
        return render_template('home.html',
                               version=version)

    @app.route("/", defaults={"sample_name": ""})
    @app.route("/<path:sample_name>", methods=["GET"])
    def gens_view(sample_name):
        """
        Renders the Gens template
        Expects sample_id as input to be able to load the sample data
        """
        if not sample_name:
            LOG.error("No sample requested")
            abort(404)

        # Set whether to get HG37 och HG38 files
        with app.app_context():
            hg_filedir, hg_type = get_hg_type()

        # Check that BAF and Log2 file exists
        baf_path = path.join(hg_filedir, sample_name + BAF_SUFFIX)
        if not path.exists(baf_path):
            LOG.error(f"BAF file not found, expected: {baf_path}")
            abort(404)
        cov_path = path.join(hg_filedir, sample_name + COV_SUFFIX)
        if not path.exists(cov_path):
            LOG.error(f"Log2 file not found, expected: {cov_path}")
            abort(404)

        # Fetch and parse region
        region = request.args.get("region", None)
        print_page = request.args.get("print_page", "false")
        if not region:
            region = request.form.get("region", "1:100000-200000")

        # Parse region
        with app.app_context():
            parsed_region = parse_region_str(region)
        if not parsed_region:
            return abort(416)

        _, chrom, start_pos, end_pos = parsed_region

        # get annotation track
        annotation = request.args.get("annotation")

        return render_template(
            "gens.html",
            chrom=chrom,
            start=start_pos,
            end=end_pos,
            sample_name=sample_name,
            hg_type=hg_type,
            last_updated=dir_last_updated(app.static_folder),
            hg_filedir=hg_filedir,
            print_page=print_page,
            todays_date=date.today(),
            annotation=annotation,
        )

    @app.route("/_getcoverage", methods=["GET"])
    def get_coverage():
        """
        Reads and formats Log2 ratio and BAF values for overview graph
        Returns the coverage in screen coordinates for frontend rendering
        """
        # Set some input values
        req = REQUEST(
            request.args.get("region", "1:100000-200000"),
            float(request.args.get("xpos", 1)),
            float(request.args.get("ypos", 1)),
            float(request.args.get("plot_height", 1)),
            float(request.args.get("top_bottom_padding", 1)),
            float(request.args.get("baf_y_start", 0)),
            float(request.args.get("baf_y_end", 0)),
            float(request.args.get("log2_y_start", 0)),
            float(request.args.get("log2_y_end", 0)),
        )
        x_ampl = float(request.args.get("x_ampl", 1))

        graph = set_graph_values(req)

        # Parse region
        with app.app_context():
            parsed_region = parse_region_str(req.region)
        if not parsed_region:
            LOG.error("No parsed region")
            return abort(416)

        # Set values that are needed to convert coordinates to screen coordinates
        reg, new_start_pos, new_end_pos, x_ampl, extra_plot_width = set_region_values(
            parsed_region, x_ampl
        )

        # Load BAF and Log2 data from tabix files
        (
            log2_list,
            baf_list,
            new_start_pos,
        ) = load_data(reg, new_start_pos, new_end_pos)

        # Convert the data to screen coordinates
        log2_records, baf_records = convert_data(
            graph,
            req,
            log2_list,
            baf_list,
            req.x_pos - extra_plot_width,
            new_start_pos,
            x_ampl,
        )

        if not new_start_pos and not log2_records and not baf_records:
            LOG.error("No records")
            return abort(404)

        return jsonify(
            data=log2_records,
            baf=baf_records,
            status="ok",
            chrom=reg.chrom,
            x_pos=req.x_pos,
            y_pos=req.y_pos,
            start=reg.start_pos,
            end=reg.end_pos,
        )

    @app.route("/_overviewchromdim", methods=["GET"])
    def call_overview_chrom_dim():
        """
        Returns the dimensions of all chromosome graphs in screen coordinates
        for drawing the chromosomes correctly in the overview graph
        """
        x_pos = float(request.args.get("x_pos", 0))
        y_pos = float(request.args.get("y_pos", 0))
        full_plot_width = float(request.args.get("full_plot_width", 0))

        chrom_dims = overview_chrom_dimensions(x_pos, y_pos, full_plot_width)

        return jsonify(status="ok", chrom_dims=chrom_dims)

    @app.route("/_gettranscriptdata", methods=["GET"])
    def get_transcript_data():
        """
        Gets transcript data for requested region and converts the coordinates to
        screen coordinates
        """
        region = request.args.get("region", None)
        collapsed = request.args.get("collapsed", None)

        res, chrom, start_pos, end_pos = parse_region_str(region)

        if region is None:
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

        hg_type = request.args.get("hg_type", "38")
        collection = app.config["DB"]["transcripts" + hg_type]

        # Get transcripts within span [start_pos, end_pos] or transcripts that go over the span
        if collapsed == "true":
            # Only fetch transcripts with height_order = 1 in collapsed view
            transcripts = collection.find(
                {
                    "chrom": chrom,
                    "height_order": 1,
                    "$or": [
                        {"start": {"$gte": start_pos, "$lte": end_pos}},
                        {"end": {"$gte": start_pos, "$lte": end_pos}},
                        {
                            "$and": [
                                {"start": {"$lte": start_pos}},
                                {"end": {"$gte": end_pos}},
                            ]
                        },
                    ],
                },
                {"_id": False},
                sort=[("start", 1)],
            )
        else:
            # Fetch all transcripts
            transcripts = collection.find(
                {
                    "chrom": chrom,
                    "$or": [
                        {"start": {"$gte": start_pos, "$lte": end_pos}},
                        {"end": {"$gte": start_pos, "$lte": end_pos}},
                        {
                            "$and": [
                                {"start": {"$lte": start_pos}},
                                {"end": {"$gte": end_pos}},
                            ]
                        },
                    ],
                },
                {"_id": False},
                sort=[("height_order", 1), ("start", 1)],
            )
        transcripts = list(transcripts)

        # Calculate maximum height order
        max_height_order = 1
        if transcripts:
            height_orders = [t["height_order"] for t in transcripts]
            max_height_order = max(height_orders)

        return jsonify(
            status="ok",
            transcripts=list(transcripts),
            start_pos=start_pos,
            end_pos=end_pos,
            max_height_order=max_height_order,
            res=res,
        )

    @app.route("/_getannotationdata", methods=["GET"])
    def get_annotation_data():
        """
        Gets annotation data in requested region and converts the coordinates
        to screen coordinates
        """
        region = request.args.get("region", None)
        source = request.args.get("source", None)
        hg_type = request.args.get("hg_type", None)
        collapsed = request.args.get("collapsed", None)

        if region is None or source is None:
            LOG.error("Could not find annotation data in DB")
            return abort(404)

        res, chrom, start_pos, end_pos = parse_region_str(region)

        # Do not show annotations at 'a'-resolution
        if not res or res == "a":
            return jsonify(
                status="ok",
                annotations=[],
                start_pos=start_pos,
                end_pos=end_pos,
                max_height_order=0,
            )

        collection = app.config["DB"]["annotations"]

        # Get annotations within span [start_pos, end_pos] or annotations that
        # go over the span
        if collapsed == "true":
            # Only fetch annotations with height_order = 1 in collapsed view
            annotations = collection.find(
                {
                    "chrom": chrom,
                    "source": source,
                    "hg_type": hg_type,
                    "height_order": 1,
                    "$or": [
                        {"start": {"$gte": start_pos, "$lte": end_pos}},
                        {"end": {"$gte": start_pos, "$lte": end_pos}},
                        {
                            "$and": [
                                {"start": {"$lte": start_pos}},
                                {"end": {"$gte": end_pos}},
                            ]
                        },
                    ],
                },
                {"_id": False},
                sort=[("start", 1)],
            )
        else:
            # Fetch all annotations
            annotations = collection.find(
                {
                    "chrom": chrom,
                    "source": source,
                    "hg_type": hg_type,
                    "$or": [
                        {"start": {"$gte": start_pos, "$lte": end_pos}},
                        {"end": {"$gte": start_pos, "$lte": end_pos}},
                        {
                            "$and": [
                                {"start": {"$lte": start_pos}},
                                {"end": {"$gte": end_pos}},
                            ]
                        },
                    ],
                },
                {"_id": False},
                sort=[("height_order", 1), ("start", 1)],
            )
        annotations = list(annotations)

        # Calculate maximum height order
        if annotations:
            height_orders = [t["height_order"] for t in annotations]
            max_height_order = max(height_orders)
        else:
            max_height_order = 1

        return jsonify(
            status="ok",
            annotations=annotations,
            start_pos=start_pos,
            end_pos=end_pos,
            max_height_order=max_height_order,
            res=res,
        )

    @app.route("/_getannotationsources", methods=["GET"])
    def get_annotation_sources():
        """
        Returns available annotation source files
        """
        hg_type = request.args.get("hg_type", None)
        collection = app.config["DB"]["annotations"]
        sources = collection.distinct("source", {"hg_type": hg_type})
        return jsonify(status="ok", sources=sources)

    return app
