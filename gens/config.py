"""Gens default configuration."""
# Database connection
MONGODB_HOST = "mongodb"
MONGODB_PORT = 27017
GENS_DBNAME = "gens"
SCOUT_DBNAME = "scout"
# IO access for coverage files
HG37_PATH = "/home/app/access/wgs/plot_data"
HG38_PATH = "/home/app/access/wgs/plot_data"
# Annotation
DEFAULT_ANNOTATION_TRACK = (
    "Mimisbrunnr_databank_plausibly_pathogenic_CNVs_Lund_hg38.aed"
)
# UI colors
UI_COLORS = {
    "variants": {"del": "#C84630", "dup": "#4C6D94"},
    "transcripts": {"strand_pos": "#aa4362", "strand_neg": "#43AA8B"},
}
