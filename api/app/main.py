"""Gens API entrypoint."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import allowed_origins
from .db import close_mongo_connection, connect_to_mongo
from .routers import root, sample, variant


def configure_cors(application):
    """Configure cros site resource sharing for API.

    configuration is only applied if there are allowed origins specified in config
    """
    if len(allowed_origins) > 0:
        application.add_middleware(
            CORSMiddleware,
            allow_origins=allowed_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )


# Setup API
app = FastAPI(title="Gens")

# configure events
app.add_event_handler("startup", connect_to_mongo)
app.add_event_handler("shutdown", close_mongo_connection)

# add api routes
app.include_router(root.router)
app.include_router(sample.router)
app.include_router(variant.router)
