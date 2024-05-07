"""Gens default configuration."""
import os

# Database connection
MONGODB_HOST = "mongodb"
MONGODB_PORT = 27017
GENS_DBNAME = "gens"
SCOUT_DBNAME = "scout"

GENS_API_URL = os.getenv("GENS_API_URL", "http://mtlucmds2.lund.skane.se:8815/")
REQUEST_TIMEOUT = 60

# Annotation
DEFAULT_ANNOTATION_TRACK = (
    "Mimisbrunnr_databank_plausibly_pathogenic_CNVs_Lund_hg38.aed"
)
# UI colors
UI_COLORS = {
    "variants": {"del": "#C84630", "dup": "#4C6D94"},
    "transcripts": {"strand_pos": "#aa4362", "strand_neg": "#43AA8B"},
}
