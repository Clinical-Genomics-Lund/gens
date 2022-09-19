"""Gens default configuration."""
# Database connection
MONGODB_GENS_URI = "mongodb"
MONGODB_SCOUT_URI = "mongodb"
GENS_DBNAME = "gens"
SCOUT_DBNAME = "scout"

# Annotation
DEFAULT_ANNOTATION_TRACK = (
    "Mimisbrunnr_databank_plausibly_pathogenic_CNVs_Lund_hg38.aed"
)
# UI colors
UI_COLORS = {
    "variants": {"del": "#C84630", "dup": "#4C6D94"},
    "transcripts": {"strand_pos": "#aa4362", "strand_neg": "#43AA8B"},
}
