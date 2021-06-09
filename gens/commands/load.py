import logging
from pathlib import Path

import click
from flask import current_app as app
from flask.cli import with_appcontext
from pymongo import ASCENDING
from gens.db import create_index, get_indexes

from gens.db import register_data_update
from gens.constants import GENOME_BUILDS
from gens.load import (ParserError, build_transcripts, parse_annotation_entry,
                       parse_annotation_file, parse_chrom_sizes,
                       update_height_order)

LOG = logging.getLogger(__name__)
valid_genome_builds = [str(gb) for gb in GENOME_BUILDS]


@click.group()
def load():
    """Load information into Gens database"""


@load.command()
@click.option(
    "-a",
    "--bam",
    required=True,
    type=click.Path(exists=True),
    help="File or directory of annotation files to load into the database",
)
@click.option(
    "-c",
    "--coverage",
    required=True,
    type=click.Path(exists=True),
    help="File or directory of annotation files to load into the database",
)
@click.option("-i", "--sample-id", type=str, required=True, help="Sample id")
@click.option(
    "-b", "--genome-build", type=click.Choice(valid_genome_builds), required=True, help="Genome build"
)
@with_appcontext
def sample(bam, coverage, sample_id, genome_build):
    """Load a sample into Gens database."""
    pass


@load.command()
@click.option(
    "-f",
    "--file",
    required=True,
    type=click.Path(exists=True),
    help="File or directory of annotation files to load into the database",
)
@click.option(
    "-b", "--genome-build", type=click.Choice(valid_genome_builds), required=True, help="Genome build"
)
@with_appcontext
def annotations(file, genome_build):
    """Load annotations from file into the database."""
    COLLECTION = "annotations"
    db = app.config["GENS_DB"][COLLECTION]
    # if collection is not indexed, crate index
    if len(get_indexes(db, COLLECTION)) == 0:
        create_index(db, COLLECTION)
    # check if path is a directoy of a file
    path = Path(file)
    files = path.glob("*") if path.is_dir() else [path]
    LOG.info("Processing files")
    for annot_file in files:
        # verify file format
        if annot_file.suffix in [".bed", ".aed"]:
            click.UsageError("Invalid file format, expects either a bed or aed file")
        # base the annotation name on the filename
        annotation_name = annot_file.name[: -len(annot_file.suffix)]
        try:
            parser = parse_annotation_file(
                annot_file, genome_build, format=annot_file.suffix[1:]
            )
            annotation_obj = []
            for entry in parser:
                try:
                    entry_obj = parse_annotation_entry(
                        entry, genome_build, annotation_name
                    )
                    annotation_obj.append(entry_obj)
                except ParserError as err:
                    LOG.warning(str(err))
                    continue

        except Exception as err:
            LOG.error(f"{str(err)}")
            raise click.UsageError(str(err))

        # Remove existing annotations in database
        LOG.info(f"Remove old entry in the database")
        db.remove({"source": annotation_name})
        # add the annotations
        LOG.info(f"Load annoatations in the database")
        db.insert_many(annotation_obj)
        LOG.info("Update height order")
        # update the height order of annotations in the database
        update_height_order(db, annotation_name)
        register_data_update(COLLECTION, name=annotation_name)
    click.secho("Finished loading annotations ✔", fg="green")


@load.command()
@click.option("-f", "--file", type=click.File(), help="Transcript file")
@click.option("-m", "--mane", type=click.File(), required=True, help="Mane file")
@click.option(
    "-b", "--genome-build", type=click.Choice(valid_genome_builds), required=True, help="Genome build"
)
@with_appcontext
def transcripts(file, mane, genome_build):
    """Load transcripts into the database."""
    COLLECTION = "transcripts"
    db = app.config["GENS_DB"][COLLECTION]
    # if collection is not indexed, crate index
    if len(get_indexes(db, COLLECTION)):
        create_index(db, COLLECTION)
    LOG.info("Building transcript object")
    try:
        transcripts = build_transcripts(file, mane, genome_build)
    except Exception as err:
        raise click.UsageError(str(err))
    LOG.info("Add transcripts to database")
    db.insert_many(transcripts)
    click.secho("Finished loading transcripts ✔", fg="green")


@load.command()
@click.option(
    "-f",
    "--file",
    required=True,
    type=click.File(),
    help="Chromosome sizes in tsv format",
)
@click.option(
    "-b", "--genome-build", type=click.Choice(valid_genome_builds), required=True, help="Genome build"
)
@with_appcontext
def chrom_sizes(file, genome_build):
    """Load chromosome size information into the database."""
    COLLECTION = "chromsizes"
    db = app.config["GENS_DB"][COLLECTION]
    # if collection is not indexed, crate index
    if len(get_indexes(db, COLLECTION)) == 0:
        create_index(db, COLLECTION)
    # parse chromosome size
    try:
        chrom_sizes = parse_chrom_sizes(file, genome_build)
    except Exception as err:
        raise click.UsageError(str(err))
    # insert collection
    LOG.info("Add chromosome sizes to database")
    db[COLLECTION].insert_many(chrom_sizes)
    click.secho("Finished updating chromosome sizes ✔", fg="green")
