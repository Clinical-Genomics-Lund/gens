"""Chromosome CRUD operation."""
from app.db import gens_db
from typing import Any
from app.models.genomic import GenomeBuild

def read_chromosome_size(chromosome: str, genome_build: GenomeBuild = GenomeBuild.HG38) -> Any:
    """Read chromosome size from the database.

    :param chromosome: Chromosome
    :type chromosome: str
    :param genome_build: Genome build version, defaults to GenomeBuild.HG38
    :type genome_build: GenomeBuild, optional
    :raises ValueError: Raised if chromosome is not added to the database
    :return: Return the chromosome data.
    :rtype: Any
    """    
    chrom_data = gens_db.chrom_sizes.find_one(
        {
            "chrom": str(chromosome),
            "genome_build": int(genome_build.value),
        }
    )
    if chrom_data is None:
        raise ValueError(
            f"Could not find data for chromosome {chromosome} in DB; genome_build: {genome_build}"
        )
    return chrom_data
