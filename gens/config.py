"""Gens default configuration."""
# Database connection
MONGODB_HOST = "mongodb"
MONGODB_PORT = 27017
GENS_DBNAME = 'gens'
SCOUT_DBNAME = 'scout'
# IO access for coverage files
HG19_PATH = "/home/app/access/wgs/plot_data"
HG38_PATH = "/home/app/access/wgs/plot_data"
# UI colors
UI_COLORS = {
    "variants": {"del": "#F94144", "dup": "#277DA1"},
    "transcripts": {"strand_pos": "#4D908E", "strand_neg": "#43AA8B"},
}
