import logging
from pathlib import Path

import click
from flask import current_app as app
from flask.cli import with_appcontext
from pymongo import ASCENDING
from gens.db import create_index, get_indexes, CHROMSIZES_COLLECTION, TRANSCRIPTS_COLLECTION, ANNOTATIONS_COLLECTION, SAMPLES_COLLECTION

from gens.db import register_data_update
from gens.constants import GENOME_BUILDS
from gens.db import store_sample
from gens.load import (ParserError, build_transcripts, parse_annotation_entry,
                       parse_annotation_file, parse_chrom_sizes,
                       update_height_order)

LOG = logging.getLogger(__name__)
valid_genome_builds = [str(gb) for gb in GENOME_BUILDS]


@click.group()
def load():
    """Load information into Gens database"""


@load.command()
@click.option("-i", "--sample-id", type=str, required=True, help="Sample id")
@click.option(
    "-b", "--genome-build", type=click.Choice(valid_genome_builds), required=True, help="Genome build"
)
@click.option(
    "-a",
    "--baf",
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
@click.option(
    "-j",
    "--overview-json",
    type=click.Path(exists=True),
    help="Json file that contains preprocessed overview coverage",
)
@with_appcontext
def sample(sample_id, genome_build, baf, coverage, overview_json):
    """Load a sample into Gens database."""
    db = app.config["GENS_DB"]
    # if collection is not indexed, crate index
    if len(get_indexes(db, SAMPLES_COLLECTION)) == 0:
        create_index(db, SAMPLES_COLLECTION)
    # load samples
    store_sample(db, sample_id=sample_id, genome_build=genome_build, baf=baf, coverage=coverage, overview=overview_json)
    click.secho("Finished adding a new sample to database ✔", fg="green")


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
    db = app.config["GENS_DB"]
    # if collection is not indexed, crate index
    if len(get_indexes(db, ANNOTATIONS_COLLECTION)) == 0:
        create_index(db, ANNOTATIONS_COLLECTION)
    # check if path is a directoy of a file
    path = Path(file)
    files = path.glob("*") if path.is_dir() else [path]
    LOG.info("Processing files")
    for annot_file in files:
        # verify file format
        if annot_file.suffix not in [".bed", ".aed"]:
            continue
        LOG.info(f'Processing {annot_file}')
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
        db[ANNOTATIONS_COLLECTION].remove({"source": annotation_name})
        # add the annotations
        LOG.info(f"Load annoatations in the database")
        db[ANNOTATIONS_COLLECTION].insert_many(annotation_obj)
        LOG.info("Update height order")
        # update the height order of annotations in the database
        update_height_order(db, annotation_name)
        register_data_update(ANNOTATIONS_COLLECTION, name=annotation_name)
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
    db = app.config["GENS_DB"]
    # if collection is not indexed, crate index
    if len(get_indexes(db, TRANSCRIPTS_COLLECTION)):
        create_index(db, TRANSCRIPTS_COLLECTION)
    LOG.info("Building transcript object")
    try:
        transcripts = build_transcripts(file, mane, genome_build)
    except Exception as err:
        raise click.UsageError(str(err))
    LOG.info("Add transcripts to database")
    db[TRANSCRIPTS_COLLECTION].insert_many(transcripts)
    register_data_update(TRANSCRIPTS_COLLECTION)
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
    db = app.config["GENS_DB"]
    # if collection is not indexed, crate index
    if len(get_indexes(db, CHROMSIZES_COLLECTION)) == 0:
        create_index(db, CHROMSIZES_COLLECTION)
    # parse chromosome size
    try:
        chrom_sizes = parse_chrom_sizes(file, genome_build)
    except Exception as err:
        raise click.UsageError(str(err))
    # insert collection
    LOG.info("Add chromosome sizes to database")
    db[CHROMSIZES_COLLECTION].insert_many(chrom_sizes)
    register_data_update(CHROMSIZES_COLLECTION)
    click.secho("Finished updating chromosome sizes ✔", fg="green")
