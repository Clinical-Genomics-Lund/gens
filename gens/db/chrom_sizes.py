"""Read and write chrom sizes."""

CHROMSIZES = 'chrom-sizes'


def get_chromosome_size(db, chrom, genome_build=38):
    """
    Gets the size in base pairs of a chromosome
    """
    chrom_data = db[CHROMSIZES].find_one(
        {
            "chrom": str(chrom),
            "genome_build": int(genome_build),
        }
    )
    if chrom_data is None:
        raise ValueError(
            f"Could not find data for chromosome {chrom} in DB; genome_build: {genome_build}"
        )
    return chrom_data
