import click
from gens.constants import HG_TYPE

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
              type=click.Path(exists=True, resolve_path=True),
              help='Chromosome sizes in tsv format')
@click.option('-b', '--genome-build', type=click.Choice(HG_TYPE), required=True,
              help='Genome build')
@click.option('-u', '--update', is_flag=True,
              help="Update existing database with new information")
def chrom_sizes(file, genome_build, update):
    """Load chromosome size information into the database."""
    pass
