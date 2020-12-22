#!/usr/bin/env bash
set -euo pipefail
# start Gens
. venv/bin/activate
export FLASK_ENV=development
export FLASK_APP=gens
flask run -h 10.0.224.64 || flask run
