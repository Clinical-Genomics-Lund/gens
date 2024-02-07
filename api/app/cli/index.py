"""Index collections in the database."""

import logging

import click

from app.db import gens_db
from app.db.index import create_indexes, update_indexes

LOG = logging.getLogger(__name__)


@click.command("index", short_help="Index the database")
@click.option("--update", help="Update the indexes", is_flag=True)
def index(update):
    """Create indexes for the database."""
    LOG.info("Creating indexes for the database.")

    if update:
        n_updated = update_indexes(gens_db)
        if n_updated == 0:
            click.secho("All indexes in place, nothing updated", fg="green")
    else:
        create_indexes(gens_db)
        click.secho("New indexes created", fg="green")
