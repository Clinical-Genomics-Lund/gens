"""Function for running the app wsgi."""
from .app import create_app

app = create_app()
