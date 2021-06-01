import click
from flask import current_app as app
from flask.cli import with_appcontext
from gens.constants import HG_TYPE
from gens.load import parse_chrom_sizes
import logging

LOG = logging.getLogger(__name__)

@click.group()
def load():
    """Load information into Gens database"""
    pass

@load.command()
@click.option('-f', '--file', required=True,
              type=click.Path(exists=True, resolve_path=True),
              help='Chromosome sizes in tsv format')
@click.option('-b', '--genome-build', type=click.Choice(HG_TYPE), required=True,
              help='Genome build')
@click.option('-u', '--update', is_flag=True,
              help="Update existing database with new information")
def annotations(file, genome_build, update):
    """Load annotations from file into the database."""
    pass


@load.command()
@click.option('-f', '--file', required=True,
              type=click.Path(exists=True, resolve_path=True),
              help='Chromosome sizes in tsv format')
@click.option('-b', '--genome-build', type=click.Choice(HG_TYPE), required=True,
              help='Genome build')
@click.option('-u', '--update', is_flag=True,
              help="Update existing database with new information")
def transcripts(file, genome_build, update):
    """Load transcripts into the database."""
    import pdb; pdb.set_trace()


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
    click.secho("Finished updating chromosome sizes", fg='green')
