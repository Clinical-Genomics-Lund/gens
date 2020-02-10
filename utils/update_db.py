#!/usr/bin/python3
'''
Write cromosome sizes to database
'''

import csv
import argparse
from functools import cmp_to_key
from pymongo import MongoClient
from gtfparse import read_gtf

CLIENT = MongoClient('10.0.224.63', 27017)
GENS_DB = CLIENT['gens']

class UpdateMongo:
    '''
    Update mongoDB with values from input files
    '''
    def __init__(self, input_file, collection_name):
        self.input_file = input_file
        self.collection = GENS_DB[collection_name]

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
            tracks = [list(a) for a in zip(tracks['seqname'], tracks['gene_name'],
                                           tracks['feature'], tracks['start'],
                                           tracks['end'], tracks['strand'],
                                           tracks['transcript_id'],
                                           tracks['transcript_biotype'],
                                           tracks['exon_number'])]

            # Sort transcripts to the top, also sort tracks belonging to the same gene
            tracks.sort(key=cmp_to_key(track_sorter))

            # Variables for setting height order of track
            previous_gene_name = ''
            height_order = 1

            features = {}

            # Insert tracks in DB
            for seqname, gene_name, feature, start, end, strand, transcript_id, \
                transcript_biotype, exon_number in tracks:

                if transcript_biotype != 'protein_coding':
                    continue

                if feature == 'transcript':
                    if gene_name != previous_gene_name:
                        height_order = 1
                    else:
                        height_order += 1

                    self.collection.insert_one({
                        'seqname': seqname,
                        'gene_name': gene_name,
                        'start': start,
                        'end': end,
                        'strand': strand,
                        'height_order': height_order,
                        'transcript_id': transcript_id,
                        'transcript_biotype': transcript_biotype,
                        'features': []
                    })
                    previous_gene_name = gene_name
                else:
                    # Gather features for a bulk update
                    features.setdefault(transcript_id, []).\
                        append({'feature': feature,
                                'exon_number': exon_number,
                                'start': start,
                                'end': end})

            # Bulk update transcripts with features
            for transcript_id in features:
                self.collection.update(
                    {'transcript_id': transcript_id},
                    {'$set': {'features': features[transcript_id]}}
                )

def track_sorter(track1, track2):
    '''
    Sorts a track depending on feature, gene name and start position
    '''
    track1_gene_name = track1[1]
    track2_gene_name = track2[1]
    track1_feature = track1[2]
    track2_feature = track2[2]
    track1_start = track1[3]
    track2_start = track2[3]

    if track1_feature == 'transcript' and track2_feature != 'transcript':
        return -1
    if track1_feature != 'transcript' and track2_feature == 'transcript':
        return 1

    # Both are transcripts, sort by gene name and start position
    if track1_gene_name == track2_gene_name:
        if track1_start < track2_start:
            return -1
        if track1_start > track2_start:
            return 1

    return 0

if __name__ == '__main__':
    PARSER = argparse.ArgumentParser(description='Update mongoDB database with data')
    PARSER.add_argument('--chromsizes', action='store_true',
                        help='Option for updating mongoDB with chromosome sizes')
    PARSER.add_argument('--csfile', default='chrom_sizes38.tsv',
                        help='Input file for updating mongoDB with chromosome sizes')
    PARSER.add_argument('--track', action='store_true',
                        help='Option for updating mongoDB with chromosome tracks')
    PARSER.add_argument('--trackfile', default='Homo_sapiens.GRCh38.99.gtf',
                        help='Input file for updating mongoDB with chromosome tracks')
    ARGS = PARSER.parse_args()

    if ARGS.chromsizes:
        print('UPDATING CHROMOSOME SIZES')
        UPDATE = UpdateMongo(ARGS.csfile, 'chromsizes')
        UPDATE.write_chromsizes()
        print('FINISHED UPDATING CHROMOSOME SIZES')
    elif ARGS.track:
        print('UPDATING TRACKS')
        UPDATE = UpdateMongo(ARGS.trackfile, 'tracks')
        UPDATE.write_tracks()
        print('FINISHED UPDATING TRACKS')
