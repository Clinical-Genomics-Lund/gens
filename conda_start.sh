#!/bin/bash 
source ~/miniconda3/etc/profile.d/conda.sh
conda activate Gens
export FLASK_ENV=development
export FLASK_APP=gens.py
flask run -h localhost || flask run
