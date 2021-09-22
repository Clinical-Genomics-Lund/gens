"""Writing chromosomze size information to the database."""

import csv
import requests
import re
import logging

LOG = logging.getLogger(__name__)

def build_chromosomes_obj(chromosome_data, genome_build, timeout):
    """Build chromosome object containing normalized size."""
    chromosomes = []

    first_chrom_len = None
    tot_scale = 0
    for name, data in chromosome_data.items():
        LOG.info(f'Processing chromosome {name}')
        # calculate genome scale
        chrom_len = data['length']
        if first_chrom_len is None:
            first_chrom_len = chrom_len

        scale = round(chrom_len / first_chrom_len, 2)
        tot_scale += round(chrom_len / first_chrom_len, 2)
        # skip for mitochondria
        if not name == 'MT':
            # get centeromer position by querying assembly annotation from EBI
            assembly_id = next(
                syn['name'].rsplit('.')[0]  # strip assembly version
                for syn in data.get('synonyms', []) 
                if syn['dbname'] == 'INSDC'
            )
            embl_annot = get_assembly_annotation(assembly_id, timeout=timeout)
            start, end = parse_centromere_pos(embl_annot)
            centro_pos = {"start": start, "end": end}
            # parse cytogenic bands
            cyto_bands = [{
                'id': band['id'],
                'stain': band['stain'],
                'start': band['start'],
                'end': band['end'],
                'strand': band['strand'],
            } for band in data['bands']]
        else: 
            centro_pos = None
            cyto_bands = None

        chromosomes.append({
            "chrom": name,
            "genome_build": int(genome_build),
            "bands": cyto_bands,
            "size": chrom_len,
            "scale": scale,
            "centromere": centro_pos,
        })
    return chromosomes

def get_assembly_info(genome_build, specie: str='homo_sapiens', bands: bool=True, synonyms: bool=True, timeout=2):
    """Get assembly info from ensembl."""
    base_rest_url = {'37': 'grch37.rest.ensembl.org', '38': 'rest.ensembl.org'}
    resp = requests.get(
        f'https://{base_rest_url[genome_build]}/info/assembly/{specie}', 
        params={
            'content-type': 'application/json',
            'bands': int(bands),
            'synonyms': int(synonyms)
        },
        timeout=timeout
    )
    # crash if not successful
    resp.raise_for_status()
    return resp.json()

def get_assembly_annotation(insdc_id, format='embl', timeout=2):
    """Get assembly for id from EBI using INSDC id."""
    LOG.debug(f"Get assembly annotation for {insdc_id}")
    resp = requests.get(f'https://www.ebi.ac.uk/ena/browser/api/{format}/{insdc_id}', timeout=timeout)
    # crash if not successful
    resp.raise_for_status()
    return resp.text

def parse_centromere_pos(embl_annot):
    """Query EBI for centeromere position from embl annotation."""
    centeromere_pos = None
    for line in embl_annot.splitlines():
        if not line.startswith('FT'):
            continue
        # find centromere
        match = re.match(r'FT\s+centromere\s+(?P<start>\d+)\.\.(?P<end>\d+)', line)
        if match:
            centeromere_pos = tuple(map(int, match.groups()))
    if not centeromere_pos:
        genome_id = re.search(r"ID\s+(\w+);", embl_annot).group(1)
        raise ValueError(f'No centeromere position found for {genome_id}')
    return centeromere_pos