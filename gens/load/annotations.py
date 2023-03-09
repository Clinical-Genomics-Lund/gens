"""Annotations."""
import csv
import logging
import re

from pymongo import ASCENDING

from gens.constants import CHROMOSOMES
from gens.db import ANNOTATIONS_COLLECTION

LOG = logging.getLogger(__name__)
FIELD_TRANSLATIONS = {
    "chromosome": "sequence",
    "position": "start",
    "stop": "end",
    "chromstart": "start",
    "chromend": "end"
}
CORE_FIELDS = ("sequence", "start", "end", "name", "strand", "color", "score")
AED_ENTRY = re.compile(r"[.+:]?(\w+)\(\w+:(\w+)\)", re.I)

DEFAULT_COLOR = "grey"


class ParserError(Exception):
    pass


def parse_bed(file, genome_build):
    """Parse bed file."""
    with open(file) as bed:
        bed_reader = csv.DictReader(bed, delimiter="\t")

        # Load in annotations
        for line in bed_reader:
            yield line


def parse_aed(file):
    """Parse aed file."""
    header = {}
    with open(file) as aed:
        aed_reader = csv.reader(aed, delimiter="\t")

        # Parse the aed header and get the keys and data formats
        for head in next(aed_reader):
            field, data_type = re.search(AED_ENTRY, head).groups()
            header[field] = data_type.lower()

        # iterate over file content
        for line in aed_reader:
            if any("(aed:" in l for l in line):
                continue
            yield dict(zip(header, line))


def parse_annotation_entry(entry, genome_build, annotation_name):
    """Parse a bed or aed entry"""
    annotation = {}
    # parse entry and format the values
    for name, value in entry.items():
        name = name.strip("#")
        name = name.lower()
        if name in FIELD_TRANSLATIONS:
            name = FIELD_TRANSLATIONS[name]
        if name in CORE_FIELDS:
            name = "chrom" if name == "sequence" else name  # for compatibility
            try:
                annotation[name] = format_data(name, value)
            except ValueError as err:
                LOG.debug(f"Bad line: {entry}")
                raise ParserError(str(err))

    # ensure that coordinates are in correct order
    annotation["start"], annotation["end"] = sorted(
        [annotation["end"], annotation["start"]]
    )
    # set missing fields to default values
    set_missing_fields(annotation, annotation_name)
    # set additional values
    annotation = {
        "source": annotation_name,
        "genome_build": genome_build,
        **annotation,
    }
    return annotation


def format_data(name, value):
    """Formats the data depending on title"""
    if name == "color":
        if not value:
            fmt_val = DEFAULT_COLOR
        elif value.startswith("rgb("):
            fmt_val = value
        else:
            fmt_val = f"rgb({value})"
    elif name == "chrom":
        if not value:
            raise ValueError(f"field {name} must exist")
        fmt_val = value.strip("chr")
    elif name == "start" or name == "end":
        if not value:
            raise ValueError(f"field {name} must exist")
        fmt_val = int(value)
    elif name == "score":
        fmt_val = int(value) if value else ""
    else:
        fmt_val = value
    return fmt_val


def set_missing_fields(annotation, name):
    """Sets default values to fields that are missing"""
    for field_name in CORE_FIELDS:
        if field_name in annotation:
            continue
        elif field_name == "color":
            annotation[field_name] = DEFAULT_COLOR
        elif field_name == "score":
            annotation[field_name] = "None"
        elif field_name == "sequence" or field_name == "strand":
            pass
        else:
            LOG.warning(
                f"field {field_name} is missing from annotation {annotation} in file {name}"
            )


def update_height_order(db, name):
    """Updates height order for annotations.

    Height order is used for annotation placement
    """
    for chrom in CHROMOSOMES:
        annotations = (
            db[ANNOTATIONS_COLLECTION]
            .find({"chrom": chrom, "source": name})
            .sort([("start", ASCENDING)])
        )

        height_tracker = [-1] * 200
        current_height = 1
        for annot in annotations:
            while True:
                if int(annot["start"]) > height_tracker[current_height - 1]:
                    # Add height to DB
                    db[ANNOTATIONS_COLLECTION].update_one(
                        {"_id": annot["_id"], "source": annot["source"]},
                        {"$set": {"height_order": current_height}},
                    )

                    # Keep track of added height order
                    height_tracker[current_height - 1] = int(annot["end"])

                    # Start from the beginning
                    current_height = 1
                    break

                current_height += 1
                # Extend height tracker
                if len(height_tracker) < current_height:
                    height_tracker += [-1] * 100


def parse_annotation_file(file, genome_build, file_format):
    """Parse a annotation file in bed or aed format."""
    if file_format == "bed":
        return parse_bed(file, genome_build)
    if file_format == "aed":
        return parse_aed(file)
