"""Gens API configuration."""
import os

# Database connection
# standard URI has the form:
# mongodb://[username:password@]host1[:port1][,...hostN[:portN]][/[defaultauthdb][?options]]
# read more: https://docs.mongodb.com/manual/reference/connection-string/
GENS_DB_NAME = os.getenv("GENS_DB_NAME", "gens")
SCOUT_DB_NAME = os.getenv("SCOUT_DB_NAME", "scout")
MONGODB_HOST = os.getenv("MONGODB_HOST", "mongodb")
MONGODB_PORT = os.getenv("MONGODB_PORT", "27017")
MONGODB_URI = f"mongodb://{MONGODB_HOST}:{MONGODB_PORT}"

# Configure allowed origins (CORS) for development. Origins are a comma seperated list.
# https://fastapi.tiangolo.com/tutorial/cors/
allowed_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
