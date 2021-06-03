##
# Gens
#
# @file
# @version 0.1

.DEFAULT_GOAL := help
.PHONY: build run init prune logs help

build:    ## Build new images
	docker-compose build
init:    ## Initialize scout database
	echo "Setup scout database and load demo cases"
	docker-compose run scout scout --host mongo_db setup database --yes
	docker-compose run scout scout --host mongo_db load panel scout/demo/panel_1.txt
	docker-compose run scout scout --host mongo_db load case scout/demo/643594.config.yaml
	echo "Download Gene annotation & MANE files"
	curl --silent --output ./volumes/gens/data/Homo_sapiens.GRCh38.101.gtf.gz ftp://ftp.ensembl.org/pub/release-101/gtf/homo_sapiens/Homo_sapiens.GRCh38.101.gtf.gz
	gzip -df ./volumes/gens/data/Homo_sapiens.GRCh38.101.gtf.gz
	curl --silent --output ./volumes/gens/data/MANE.GRCh38.v0.92.summary.txt.gz ftp://ftp.ncbi.nlm.nih.gov/refseq/MANE/MANE_human/release_0.92/MANE.GRCh38.v0.92.summary.txt.gz
	gzip -df ./volumes/gens/data/MANE.GRCh38.v0.92.summary.txt.gz
	echo "Populate Gens database"
	docker-compose run gens gens load chrom-size --file ./utils/chrom_sizes38.tsv -b 38
	docker-compose run gens gens load transcripts --file /home/app/data/Homo_sapiens.GRCh38.101.gtf --mane /home/app/data/MANE.GRCh38.v0.92.summary.txt -b 38
	docker-compose run gens gens load annotations --file /home/app/data/hg38_annotations -b 38
up:    ## Run Scout software
	docker-compose up --detach
down:    ## Take down Scout software
	docker-compose down --volumes
SERV = "gens"
bash:    ## Remove dangling images, volumes and used data
	docker-compose up --detach
	docker-compose exec $(SERV) /bin/bash
prune:    ## Remove dangling images, volumes and used data
	docker-compose down --remove-orphans
	rm -rf volumes/{mongodb,gens}/data/*
	docker images prune
SERVICE := 'all'
logs:    ## Show logs for SERVICE, default all
ifeq ($(SERVICE), 'all')
	docker-compose logs --follow
else
	docker-compose logs --follow $(SERVICE)
endif
help:    ## Show this help.
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

# end
