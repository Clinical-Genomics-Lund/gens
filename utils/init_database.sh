#!/bin/bash 

# it is to use the Gens environment in conda 
source ~/miniconda3/etc/profile.d/conda.sh
conda activate Gens

# make a gens database
echo "use gens;" > initmongo.js
echo "db.gens.insert({\"test_for_creation\":\"ignore\"})" >> initmongo.js
echo "show dbs" >> initmongo.js

mongo < initmongo.js

echo "##############################################"
echo "Update annotations using a BED annotation file" 
echo "##############################################"
# you can download data from the Table Browser of
# https://genome-euro.ucsc.edu/
python update_annotations.py -f Gencode_v32.bed

echo "########################"
echo "Update choromosome sizes"
echo "########################"

python update_chromsizes.py -f chrom_sizes38.tsv

echo "#############################"
echo "Update transcript annotations" 
echo "#############################"

# get annotations from ftp://ftp.ensembl.org/pub/release-99/gtf/homo_sapiens/Homo_sapiens.GRCh38.99.gtf.gz 
# but be sure to add chrs like:
# get MANE from ftp://ftp.ncbi.nlm.nih.gov/refseq/MANE/MANE_human/
python update_transcripts.py -f Homo_sapiens.GRCh38.99.gtf -m MANE.GRCh38.v0.9.select_ensembl_genomic.gtf
