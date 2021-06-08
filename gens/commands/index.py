"""Index collections in the database."""

import logging
import click
from flask.cli import with_appcontext
from flask import current_app
from gens.db import create_indexes, update_indexes


LOG = logging.getLogger(__name__)

@click.command("index", short_help="Index the database")
@click.option(
    "--yes",
    is_flag=True,
    required=True,
    prompt="This will delete and rebuild all indexes(if not --update). Are you sure?",
)
@click.option("--update", help="Update the indexes", is_flag=True)
@with_appcontext
def index(yes, update):
    """Create indexes for the database."""
    LOG.info("Creating indexes for the database.")
    db = current_app.config['GENS_DB']

    if update:
        n_updated = update_indexes(db)
        if n_updated == 0:
            click.secho('All indexes in place, nothing updated', fg='green')
    else:
        create_indexes(db)
        click.secho('New indexes created', fg='green')
