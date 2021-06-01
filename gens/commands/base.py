"""Gens command line interface."""

from flask.cli import FlaskGroup
import click
from gens.app import create_app

from gens.__version__ import VERSION as version

from .load import load as load_command


@click.group(
    cls=FlaskGroup,
    create_app=create_app,
    invoke_without_command=True,
    add_default_commands=False,
    add_version_option=False,
)
@click.version_option(version)
def cli(*args, **kwargs):
    """Management of Gens application"""
    pass


cli.add_command(load_command)
