import click
from flask import current_app as app
from flask.cli import with_appcontext
from gens.constants import HG_TYPE
from gens.load import parse_chrom_sizes, build_transcripts
import logging
from pymongo import ASCENDING

LOG = logging.getLogger(__name__)

@click.group()
def load():
    """Load information into Gens database"""
    pass

@load.command()
@click.option('-f', '--file', required=True,
              type=click.File(),
              help='Annotation file')
@click.option('-b', '--genome-build', type=click.Choice(HG_TYPE), required=True,
              help='Genome build')
@click.option('-u', '--update', is_flag=True,
              help="Update existing database with new information")
def annotations(file, genome_build, update):
    """Load annotations from file into the database."""
    pass


@load.command()
@click.option('-f', '--file', required=True,
              type=click.File(),
              help='Transcript file')
@click.option('-m', '--mane', type=click.File(), required=True,
              help='Mane file')
@click.option('-b', '--genome-build', type=click.Choice(HG_TYPE), required=True,
              help='Genome build')
@click.option('-u', '--update', is_flag=True,
              help="Update existing database with new information")
@with_appcontext
def transcripts(file, mane, genome_build, update):
    """Load transcripts into the database."""
    COLLECTION = 'transcripts'
    LOG.info('Building transcript object')
    try:
        transcripts = build_transcripts(file, mane, genome_build)
    except Exception as err:
        raise click.UsageError(str(err))
    LOG.info('Add transcripts to database')
    db = app.config['GENS_DB'][COLLECTION]
    db.insert_many(transcripts)
    LOG.info('Create indexes')
    db.create_index([("start", ASCENDING)], unique=False)
    db.create_index([("end", ASCENDING)], unique=False)
    db.create_index([("chrom", ASCENDING)], unique=False)
    db.create_index([("height_order", ASCENDING)], unique=False)
    db.create_index("hg_type", unique=False)
    click.secho("Finished loading transcripts ✔", fg="green")


@load.command()
@click.option('-f', '--file', required=True,
              type=click.File(),
              help='Chromosome sizes in tsv format')
@click.option('-b', '--genome-build', type=click.Choice(HG_TYPE), required=True,
              help='Genome build')
@click.option('-u', '--update', is_flag=True,
              help="Update existing database with new information")
@with_appcontext
def chrom_sizes(file, genome_build, update):
    """Load chromosome size information into the database."""
    COLLECTION = 'chromsizes'
    try:
        chrom_sizes = parse_chrom_sizes(file, genome_build)
    except Exception as err:
        raise click.UsageError(str(err))
    db = app.config['GENS_DB']
    # insert collection
    LOG.info('Add chromosome sizes to database')
    db[COLLECTION].insert_many(chrom_sizes)
    LOG.info('Update database index')
    db[COLLECTION].create_index("hg_type", unique=False)
    click.secho("Finished updating chromosome sizes ✔", fg='green')
