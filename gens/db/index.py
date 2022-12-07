"""Create indexes in the database."""
import logging

from pymongo import ASCENDING, IndexModel

from .annotation import ANNOTATIONS, TRANSCRIPTS
from .chrom_sizes import CHROMSIZES
from .samples import COLLECTION as SAMPLES

LOG = logging.getLogger(__name__)

INDEXES = {
    ANNOTATIONS: [
        IndexModel(
            [("chrom", ASCENDING), ("start", ASCENDING), ("end", ASCENDING)],
            name="genome_position",
            background=True,
        ),
        IndexModel(
            [("chrom", ASCENDING), ("source", ASCENDING)],
            name="chrom_source",
            background=True,
        ),
        IndexModel(
            [("source", ASCENDING)],
            name="source",
            background=True,
        ),
        IndexModel(
            [("height_order", ASCENDING)],
            name="height_order",
            background=True,
        ),
        IndexModel(
            [("genome_build", ASCENDING)],
            name="genome_build",
            background=True,
        ),
    ],
    TRANSCRIPTS: [
        IndexModel(
            [("chrom", ASCENDING), ("start", ASCENDING), ("end", ASCENDING)],
            name="genome_position",
            background=True,
        ),
        IndexModel(
            [("height_order", ASCENDING)],
            name="height_order",
            background=True,
        ),
        IndexModel(
            [("genome_build", ASCENDING)],
            name="genome_build",
            background=True,
        ),
    ],
    CHROMSIZES: [
        IndexModel(
            [("genome_build", ASCENDING)],
            name="genome_build",
            background=True,
        ),
    ],
    SAMPLES: [
        IndexModel(
            [("sample_id", ASCENDING), ("genome_build", ASCENDING)],
            name="sample__sample_id_genome_build",
            background=True,
            unique=True,
        ),
        IndexModel(
            [("sample_id", ASCENDING), ("case_name", ASCENDING), ("genome_build", ASCENDING)],
            name="sample__sample_id_case_name_genome_build",
            background=True,
            unique=True,
        ),
        IndexModel(
            [("created_at", ASCENDING)],
            name="sample__creation_date",
            background=True,
        ),
    ],
}


def get_indexes(db, collection):
    """Get current indexes for a collection."""
    indexes = []
    for collection_name in db.list_collection_names():
        if collection and collection != collection_name:
            continue
        for index_name in db[collection_name].index_information():
            if index_name != "_id_":
                indexes.append(index_name)
    return indexes


def create_index(db, collection_name):
    """Create indexe for collection in Gens db."""
    indexes = INDEXES[collection_name]
    existing_indexes = get_indexes(db, collection_name)
    # Drop old indexes
    for index in indexes:
        index_name = index.document.get("name")
        if index_name in existing_indexes:
            LOG.info(f"Removing old index: {index_name}")
            db[collection_name].drop_index(index_name)
    # Create new indexes
    names = ", ".join([i.document.get("name") for i in indexes])
    LOG.info(f"Creating indexes {names} for collection: {collection_name}")
    db[collection_name].create_indexes(indexes)


def create_indexes(db):
    """Create indexes for Gens db."""
    for collection_name in INDEXES:
        create_index(db, collection_name)


def update_indexes(db):
    """Add missing indexes to the database."""
    LOG.info("Updating indexes.")
    n_updated = 0
    for collection_name, indexes in INDEXES.items():
        existing_indexes = get_indexes(db, collection_name)
        for index in indexes:
            index_name = index.document.get("name")
            if index_name not in existing_indexes:
                LOG.info(f"Creating index : {index_name}")
                db[collection_name].create_indexes([index])
                n_updated += 1
    LOG.info(f"Updated {n_updated} indexes to the database")
    return n_updated
