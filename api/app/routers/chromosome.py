"""Query database for chromosome information."""
from fastapi import APIRouter, Query

from app.crud.chromosome import get_chromosome
from app.graph import overview_chrom_dimensions
from app.models.genomic import Chromosomes, GenomeBuild

router = APIRouter()

DEFAULT_TAGS = ["chromosome"]


@router.get("/get-chromosome-info", tags=DEFAULT_TAGS)
def get_chromosome_info(chromosome: Chromosomes, genome_build: int):
    """Get chromosome information."""
    genome_build = GenomeBuild(genome_build)
    return get_chromosome(chromosome, genome_build)


@router.get("/get-overview-chrom-dim", tags=DEFAULT_TAGS)
def get_dimensions(
    x_pos: float = Query(..., description="X position"),
    y_pos: float = Query(..., description="Y position"),
    plot_width: float = Query(..., description="Full width of the plot"),
    genome_build: int = Query(...),
):
    """Calclulate the on screen dimensions of the ideogram."""
    genome_build = GenomeBuild(genome_build)
    dimensions = overview_chrom_dimensions(x_pos, y_pos, plot_width, genome_build.value)
    return {"status": "ok", "chrom_dims": dimensions}
