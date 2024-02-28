"""Gens default configuration."""
# Database connection
MONGODB_GENS_URI = "mongodb://localhost:27017"
MONGODB_SCOUT_URI = "mongodb://localhost:27017"
GENS_DBNAME = "gens"
SCOUT_DBNAME = "scout"

# Scout browser base URL for link out and API
SCOUT_BASE_URL = "http://localhost:8000"

# Annotation
DEFAULT_ANNOTATION_TRACK = (
    "Mimisbrunnr_databank_plausibly_pathogenic_CNVs_Lund_hg38.aed"
)
# UI colors
UI_COLORS = {
    "variants": {"del": "#C84630", "dup": "#4C6D94"},
    "transcripts": {"strand_pos": "#aa4362", "strand_neg": "#43AA8B"},
}

#GOOGLE = dict(
#    client_id="some.apps.googleusercontent.com",
#    client_secret="a_secret",
#    discovery_url="https://accounts.google.com/.well-known/openid-configuration",
#)
