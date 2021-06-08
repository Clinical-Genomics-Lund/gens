"""Create indexes in the database."""
from .db import INDEXES
import logging

LOG = logging.getLogger(__name__)

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


def create_indexes(db):
    """Create indexes for Gens db."""
    for collection_name, indexes in INDEXES.items():
        existing_indexes = get_indexes(db, collection_name)
        # Drop old indexes
        for index in indexes:
            index_name = index.document.get('name')
            if index_name in existing_indexes:
                LOG.info(f'Removing old index: {index_name}')
                db[collection_name].drop_index(index_name)
        # Create new indexes
        names = ', '.join([i.document.get('name') for i in indexes])
        LOG.info('Creating indexes {names} for collection: {collection_name}')
        db[collection_name].create_indexes(indexes)


def update_indexes(db):
    """Add missing indexes to the database."""
    LOG.info('Updating indexes.')
    n_updated = 0
    for collection_name, indexes in INDEXES.items():
        existing_indexes = get_indexes(db, collection_name)
        for index in indexes:
            index_name = index.document.get('name')
            if index_name not in existing_indexes:
                LOG.info(f"Creating index : {index_name}")
                db[collection_name].create_indexes([index])
                n_updated += 1
    LOG.info(f'Updated {n_updated} indexes to the database')
    return n_updated
