"""View information stored in the database."""

import logging
from itertools import groupby

import click
from flask import current_app as app
from flask.cli import with_appcontext
from tabulate import tabulate

from gens.db import get_samples

LOG = logging.getLogger(__name__)


@click.group()
def view():
    """Load information into Gens database"""


@view.command()
@click.option("-s", "--summary", is_flag=True, help="Summarize the number of samples")
@with_appcontext
def samples(summary):
    """View samples stored in the database"""
    db = app.config["GENS_DB"]
    # print samples to terminal
    samples, _ = get_samples(db)
    if summary:  # count number of samples per genome build
        columns = ("Genome build", "N samples")
        sample_tbl = (
            (gr, sum(1 for v in vals))
            for gr, vals in groupby(samples, key=lambda x: x.genome_build)
        )
    else:  # show all samples
        columns = (
            "Sample Id",
            "Case name",
            "Genome build",
            "Created at",
            "baf file",
            "cov file",
            "overview_file",
        )
        sample_tbl = (
            (
                s.sample_id,
                s.case_id,
                str(s.genome_build),
                s.created_at.isoformat(),
                s.baf_file,
                s.coverage_file,
                s.overview_file,
            )
            for s in samples
        )
    print(tabulate(sample_tbl, headers=columns))
