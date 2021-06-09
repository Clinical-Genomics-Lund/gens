"""Store and retrive samples from the database."""

import datetime
import logging
from pymongo import ASCENDING
import itertools
from .models import SampleObj

LOG = logging.getLogger(__name__)

COLLECTION = 'samples'

def store_sample(db, sample_id, baf, coverage, genome_build):
    """Store a new sample in the database."""
    LOG.info(f'Store sample "{sample_id}" in database')
    db[COLLECTION].insert_one({
        'sample_id': sample_id,
        'baf_file': baf,
        'coverage_file': coverage,
        'hg_type': genome_build,
        'created_at': datetime.datetime.now(),
    })


def get_samples(db, start = 0, n_samples = None):
    """
    Get samples stored in the databse.

    use n_samples to limit the results to x most recent samples
    """
    results = (SampleObj(
        sample_id=r['sample_id'],
        genome_build=r['hg_type'],
        baf_file=r['baf_file'],
        coverage_file=r['coverage_file'],
        created_at=r['created_at'],
        )
            for r in db[COLLECTION].find().sort('created_at', ASCENDING))
    # limit results to n results
    if n_samples and 0 < n_samples:
        results = itertools.islice( results, start=start, stop=start + n_samples)
    return results
