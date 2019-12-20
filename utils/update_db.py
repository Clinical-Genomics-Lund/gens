#!/usr/bin/python3
'''
Write cromosome sizes to database
'''

import csv
import argparse
from gtfparse import read_gtf
from pymongo import MongoClient

CLIENT = MongoClient()
COVIZ_DB = CLIENT['coviz']

class UpdateMongo:
    '''
    Update mongoDB with values from input files
    '''
    def __init__(self, input_file, collection_name):
        self.input_file = input_file
        self.collection = COVIZ_DB[collection_name]

    def write_chromsizes(self):
        '''
        Write cromosome sizes to database
        '''
        with open(self.input_file) as cs_file:
            first_chrom_len = 1
            cs_reader = csv.reader(cs_file, delimiter='\t')
            for line in cs_reader:
                chrom = line[0]
                chrom = '23' if chrom == 'X' else '24' if chrom == 'Y' else chrom
                chrom_size = int(line[1])

                if chrom == '1':
                    first_chrom_len = chrom_size

                self.collection.insert_one({
                    'chrom': chrom,
                    'size': chrom_size,
                    'scale': round(chrom_size / first_chrom_len, 2)
                })

    def write_tracks(self):
        '''
        Write cromosome tracks to database
        '''
        with open(self.input_file) as track_file:
            tracks = read_gtf(track_file)

            for gene_name, start, end, strand, transcript_id, transcript_biotype, exon_number \
                in zip(tracks['gene_name'], tracks['start'], tracks['end'],
                       tracks['strand'], tracks['transcript_id'],
                       tracks['transcript_biotype'], tracks['exon_number']):
                if transcript_biotype != 'protein_coding':
                    continue

                #  Insert track in DB
                self.collection.insert_one({
                    'gene_name': gene_name,
                    'start': start,
                    'end': end,
                    'strand': strand,
                    'transcript_id': transcript_id,
                    'transcript_biotype': transcript_biotype,
                    'exon_number': exon_number,
                })

if __name__ == '__main__':
    PARSER = argparse.ArgumentParser(description='Update mongoDB database with data')
    PARSER.add_argument('--chromsizes', action='store_true',
                        help='Option for updating mongoDB with chromosome sizes')
    PARSER.add_argument('--csfile', default='chrom_sizes.tsv',
                        help='Input file for updating mongoDB with chromosome sizes')
    PARSER.add_argument('--track', action='store_true',
                        help='Option for updating mongoDB with chromosome tracks')
    PARSER.add_argument('--trackfile', default='Homo_sapiens.GRCh37.87.gtf',
                        help='Input file for updating mongoDB with chromosome tracks')
    ARGS = PARSER.parse_args()

    if ARGS.chromsizes:
        print('Updating chrom sizes')
        UPDATE = UpdateMongo(ARGS.csfile, 'chromsizes')
        UPDATE.write_chromsizes()
    elif ARGS.track:
        print('UPDATING TRACKS')
        UPDATE = UpdateMongo(ARGS.trackfile, 'tracks')
        UPDATE.write_tracks()
