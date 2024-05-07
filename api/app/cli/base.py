"""Gens command line interface."""

import click
from app.__version__ import VERSION as version

from .index import index as index_command
from .load import load as load_command
from .view import view as view_command


@click.group(
    add_default_commands=False,
    add_version_option=False,
)
@click.version_option(version)
def cli(*args, **kwargs):
    """Management of Gens API"""
    pass


cli.add_command(index_command)
cli.add_command(load_command)
cli.add_command(view_command)
