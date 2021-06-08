import logging
from pathlib import Path

import click
from flask import current_app as app
from flask.cli import with_appcontext
from pymongo import ASCENDING

from gens.constants import HG_TYPE
from gens.db import register_data_update
from gens.load import (ParserError, build_transcripts, parse_annotation_entry,
                       parse_annotation_file, parse_chrom_sizes,
                       update_height_order)

LOG = logging.getLogger(__name__)


@click.group()
def load():
    """Load information into Gens database"""
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
    "-b",
    "--genome-build",
    type=click.Choice(HG_TYPE),
    required=True,
    help="Genome build",
)
@with_appcontext
def annotations(file, genome_build):
    """Load annotations from file into the database."""
    COLLECTION = "annotations"
    # check if path is a directoy of a file
    path = Path(file)
    files = path.glob("*") if path.is_dir() else [path]
    db = app.config["GENS_DB"][COLLECTION]
    LOG.info("Create indexes")
    for param in ["start", "end", "chrom", "source", "height_order"]:
        db.create_index([(param, ASCENDING)], unique=False)
    db.create_index("hg_type", unique=False)
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
    "-b",
    "--genome-build",
    type=click.Choice(HG_TYPE),
    required=True,
    help="Genome build",
)
@with_appcontext
def transcripts(file, mane, genome_build):
    """Load transcripts into the database."""
    COLLECTION = "transcripts"
    LOG.info("Building transcript object")
    try:
        transcripts = build_transcripts(file, mane, genome_build)
    except Exception as err:
        raise click.UsageError(str(err))
    LOG.info("Add transcripts to database")
    db = app.config["GENS_DB"][COLLECTION]
    db.insert_many(transcripts)
    LOG.info("Create indexes")
    for param in ["start", "end", "chrom", "hg_type"]:
        db.create_index([(param, ASCENDING)], unique=False)
    db.create_index("hg_type", unique=False)
    register_data_update(COLLECTION)
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
    "-b",
    "--genome-build",
    type=click.Choice(HG_TYPE),
    required=True,
    help="Genome build",
)
@with_appcontext
def chrom_sizes(file, genome_build):
    """Load chromosome size information into the database."""
    COLLECTION = "chromsizes"
    try:
        chrom_sizes = parse_chrom_sizes(file, genome_build)
    except Exception as err:
        raise click.UsageError(str(err))
    db = app.config["GENS_DB"]
    # insert collection
    LOG.info("Add chromosome sizes to database")
    db[COLLECTION].insert_many(chrom_sizes)
    LOG.info("Update database index")
    db[COLLECTION].create_index("hg_type", unique=False)
    register_data_update(COLLECTION)
    click.secho("Finished updating chromosome sizes ✔", fg="green")
