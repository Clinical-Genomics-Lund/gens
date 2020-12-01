"""
Whole genome visualization of BAF and log2 ratio
"""
import logging
import os
from datetime import date
from logging.config import dictConfig

import pysam
from flask import Flask, abort, jsonify, render_template, request
from flask_debugtoolbar import DebugToolbarExtension
nn
from .db import init_database, query_records_in_region, RecordType
from .__version__ import VERSION as version
from .cache import cache
from .exceptions import NoRecordsException, RegionParserException
from .graph import (REQUEST, get_overview_cov, overview_chrom_dimensions,
                    parse_region_str)
from .io import BAF_SUFFIX, COV_SUFFIX, _get_filepath, get_tabix_files
from .utils import dir_last_updated, get_hg_type

toolbar = DebugToolbarExtension()
dictConfig(
    {
        "version": 1,
        "disable_existing_loggers": False,
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


def create_app(test_config=None):
    """Create and setup Gens application."""
    app = Flask(__name__)
    # configure app
    app.config["JSONIFY_PRETTYPRINT_REGULAR"] = False
    app.config.from_object("gens.config")
    if os.environ.get("GENS_CONFIG") is None:
        LOG.warning("No user configuration set, set path with $GENS_CONFIG variable")
    else:
        app.config.from_envvar("GENS_CONFIG")
    # initialize database and store db content
    with app.app_context():
        init_database()
    # connect to mongo client
    app.config["DEBUG"] = True
    app.config["SECRET_KEY"] = "pass"
    cache.init_app(app)

    # define views
    @app.route("/")
    def gens_welcome():
        return render_template("home.html", version=version)

    @app.route("/", defaults={"sample_name": ""})
    @app.route("/<path:sample_name>", methods=["GET"])
    @cache.cached(timeout=60)
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
        try:
            _get_filepath(hg_filedir, sample_name + BAF_SUFFIX)
            _get_filepath(hg_filedir, sample_name + COV_SUFFIX)
        except FileNotFoundError:
            abort(404)
        else:
            LOG.info(f"Found BAF and COV files for {sample_name}")

        # Fetch and parse region
        region = request.args.get("region", None)
        print_page = request.args.get("print_page", "false")
        if not region:
            region = request.form.get("region", "1:100000-200000")

        # Parse region
        with app.app_context():
            hg_type = request.args.get("hg_type", "38")
            parsed_region = parse_region_str(region, hg_type)
        if not parsed_region:
            return abort(416)

        _, chrom, start_pos, end_pos = parsed_region

        # which variant to highlight as focused
        hightlighted_variant = request.args.get("variant")

        # get annotation track
        annotation = request.args.get("annotation")

        return render_template(
            "gens.html",
            ui_colors=app.config["UI_COLORS"],
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
            hightlighted_variant=hightlighted_variant,
            version=version,
        )

    @app.route("/_getcoverages", methods=["POST"])
    def get_coverages():
        """Read default Log2 ratio and BAF values for overview graph."""
        data = request.get_json()
        LOG.info(f'Got request for all chromosome coverages: {data["sample_name"]}')

        sample_name = data["sample_name"]
        cov_file, baf_file = get_tabix_files(sample_name, data["hg_filedir"])
        # open tabix filehandles
        results = {}
        for chrom, pos in data["chromosome_pos"].items():
            # Set some input values
            req = REQUEST(
                f"{chrom}:0-None",
                pos["xpos"],
                pos["ypos"],
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
                with app.app_context():
                    reg, log2_rec, baf_rec = get_overview_cov(
                        req,
                        baf_file,
                        cov_file,
                        pos["x_ampl"],
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

            results[chrom] = {
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

    @app.route("/_getcoverage", methods=["GET"])
    def get_coverage():
        """
        Reads and formats Log2 ratio and BAF values for overview graph
        Returns the coverage in screen coordinates for frontend rendering
        """
        # Validate input
        for arg in ["sample_name", "hg_filedir"]:
            if request.args.get(arg) is None:
                LOG.error(f"getcoverage - Missing argument: {arg}")
                return abort(416)

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
            int(request.args.get("hg_type", 38)),
            float(request.args["reduce_data"])
            if "reduce_data" in request.args
            else None,
        )
        x_ampl = float(request.args.get("x_ampl", 1))

        cov_file, baf_file = get_tabix_files(
            request.args.get("sample_name"),
            request.args.get("hg_filedir"),
        )
        # Parse region
        try:
            with app.app_context():
                reg, log2_rec, baf_rec = get_overview_cov(
                    req, baf_file, cov_file, x_ampl
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

    @app.route("/_overviewchromdim", methods=["GET"])
    def call_overview_chrom_dim():
        """
        Returns the dimensions of all chromosome graphs in screen coordinates
        for drawing the chromosomes correctly in the overview graph
        """
        x_pos = float(request.args.get("x_pos", 0))
        y_pos = float(request.args.get("y_pos", 0))
        full_plot_width = float(request.args.get("full_plot_width", 0))

        LOG.info(f"Get overview chromosome dim: {x_pos}, {y_pos}, {full_plot_width}")
        chrom_dims = overview_chrom_dimensions(x_pos, y_pos, full_plot_width)

        return jsonify(status="ok", chrom_dims=chrom_dims)

    @app.route("/_getvariantdata", methods=['GET'])
    def get_variant_data():
        """Search Scout database for variants associated with a case and return info in JSON format."""
        region = request.args.get("region", None)
        collapsed = request.args.get("collapsed", None)

        hg_type = request.args.get("hg_type", "38")
        res, chrom, start_pos, end_pos = parse_region_str(region, hg_type)


    @app.route("/_gettranscriptdata", methods=["GET"])
    def get_transcript_data():
        """
        Gets transcript data for requested region and converts the coordinates to
        screen coordinates
        """
        region = request.args.get("region", None)
        collapsed = request.args.get("collapsed", None)

        hg_type = request.args.get("hg_type", "38")
        res, chrom, start_pos, end_pos = parse_region_str(region, hg_type)

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
        collection = app.config["GENS_DB"]["transcripts" + hg_type]

        # Get transcripts within span [start_pos, end_pos] or transcripts that go over the span
        transcripts = list(query_records_in_region(record_type=RecordType.TRANSCRIPT,
                                                   chrom=chrom,
                                                   start_pos=start_pos,
                                                   end_pos=end_pos,
                                                   hg_type=hg_type,
                                                   height_order=1 if collapsed else None))
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
        annotations = list(query_records_in_region(record_type=RecordType.ANNOTATION,
                                                   chrom=chrom,
                                                   start_pos=start_pos,
                                                   end_pos=end_pos,
                                                   hg_type=hg_type,
                                                   source=source,
                                                   height_order=1 if collapsed else None))

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
        collection = app.config["GENS_DB"]["annotations"]
        sources = collection.distinct("source", {"hg_type": hg_type})
        return jsonify(status="ok", sources=sources)

    return app
