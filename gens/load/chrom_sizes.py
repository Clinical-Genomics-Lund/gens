"""Writing chromosomze size information to the database."""

import csv
import datetime
from gens.constants import CHROMOSOMES

def parse_chrom_sizes(cfile, genome_build, delimiter='\t'):
    creader = csv.DictReader(cfile, delimiter=delimiter,
                             fieldnames=['chrom', 'size'])
    chrom_sizes = []
    # first pass to calculate the total scale of all chromosomzes
    first_chrom_len = None
    tot_scale = 0
    for row in creader:
        if not row['chrom'] in CHROMOSOMES:
            raise ValueError(f'Invalid chromosome name {row["chrom"]}')

        chrom_size = int(row['size'])
        if first_chrom_len is None:
            first_chrom_len = chrom_size

        # calculate scale
        scale = round(chrom_size / first_chrom_len, 2)
        tot_scale += round(chrom_size / first_chrom_len, 2)
        chrom_sizes.append({
            'chrom': row['chrom'],
            "hg_type": int(genome_build),
            "size": chrom_size,
            "scale": scale,
            "created_at": datetime.datetime.now(),
        })

    # normalize the scale of all chromosomes
    for chrom in chrom_sizes:
        chrom["scale"] /= tot_scale
    return chrom_sizes
