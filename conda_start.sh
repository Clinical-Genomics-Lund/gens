#!/bin/bash 
# i) create environment
#    conda create -n Gens
# ii) install packages
#    conda install --file requirements.txt
# then you can proceed 

source ~/miniconda3/etc/profile.d/conda.sh
conda activate Gens
export FLASK_ENV=development
export FLASK_APP=gens.py
flask run -h localhost || flask run
