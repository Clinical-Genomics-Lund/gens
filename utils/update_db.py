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
    def __init__(self, input_file, mane_file, collection_name):
        self.input_file = input_file
        self.mane_file = mane_file
        self.mane = {}
        self.collection = GENS_DB[collection_name]

    def write_chromsizes(self):
        '''
        Write cromosome sizes to database
        '''
        with open(self.input_file) as cs_file:
            first_chrom_len = 1
            cs_reader = csv.reader(cs_file, delimiter='\t')
            chrom_sizes = []
            tot_scale = 0
            for line in cs_reader:
                chrom = line[0]
                chrom_size = int(line[1])

                if chrom == '1':
                    first_chrom_len = chrom_size

                scale = round(chrom_size / first_chrom_len, 2)
                tot_scale += round(chrom_size / first_chrom_len, 2)

                chrom_sizes.append({
                    'chrom': chrom,
                    'size': chrom_size,
                    'scale': scale
                })
            for chrom in chrom_sizes:
                chrom['scale'] /= tot_scale
            self.collection.insert_many(chrom_sizes)

    def write_tracks(self):
        '''
        Write cromosome tracks to database
        '''
        # Set MANE transcripts
        with open(self.mane_file) as mane_file:
            cs_reader = csv.reader(mane_file, delimiter='\t')
            next(cs_reader) # Skip header
            for line in cs_reader:
                hgnc_id = line[2].replace('HGNC:', '')
                refsec_id = line[5]
                ensemble_nuc = line[7].split('.')[0]
                self.mane[ensemble_nuc] = {'hgnc_id': hgnc_id, 'refsec_id': refsec_id}

        # Set the rest
        with open(self.input_file) as track_file:
            tracks = read_gtf(track_file)
            tracks = [list(a) for a in zip(tracks['seqname'], tracks['gene_name'],
                                           tracks['feature'], tracks['start'],
                                           tracks['end'], tracks['strand'],
                                           tracks['transcript_id'],
                                           tracks['transcript_biotype'],
                                           tracks['exon_number'])]

            # Sort transcripts to the top, also sort tracks belonging to the same gene
            tracks.sort(key=cmp_to_key(self.track_sorter))

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

                    if transcript_id in self.mane:
                        mane = True
                        hgnc_id = self.mane[transcript_id]['hgnc_id']
                        refsec_id = self.mane[transcript_id]['refsec_id']
                    else:
                        mane = False
                        hgnc_id = None
                        refsec_id = None

                    mane = True if transcript_id in self.mane else False
                    self.collection.insert_one({
                        'chrom': seqname,
                        'gene_name': gene_name,
                        'start': start,
                        'end': end,
                        'strand': strand,
                        'height_order': height_order,
                        'transcript_id': transcript_id,
                        'transcript_biotype': transcript_biotype,
                        'mane': mane,
                        'hgnc_id': hgnc_id,
                        'refsec_id': refsec_id,
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

    def track_sorter(self, track1, track2):
        '''
        Sorts a track depending on feature, gene name and start position
        '''
        t1_gene_name = track1[1]
        t2_gene_name = track2[1]
        t1_feature = track1[2]
        t2_feature = track2[2]
        t1_start = track1[3]
        t2_start = track2[3]
        t1_transcript_id = track1[6]
        t2_transcript_id = track2[6]

        # Sort by:
        # 1) Transcript headers
        # 2) MANE transcripts
        # 3) Both are transcripts: sort by gene name and start position
        if (t1_feature == 'transcript' and t2_feature != 'transcript') or\
            t1_transcript_id in self.mane or\
            (t1_gene_name == t2_gene_name and t1_start < t2_start):
            return -1
        if (t1_feature != 'transcript' and t2_feature == 'transcript') or\
            t2_transcript_id in self.mane or\
            (t1_gene_name == t2_gene_name and t1_start > t2_start):
            return 1
        return 0

def main():
    '''
    Main function
    '''
    parser = argparse.ArgumentParser(description='Update mongoDB database with data')
    parser.add_argument('--chromsizes', action='store_true',
                        help='Option for updating mongoDB with chromosome sizes')
    parser.add_argument('--csfile', default='chrom_sizes38.tsv',
                        help='Input file for updating mongoDB with chromosome sizes')
    parser.add_argument('--track', action='store_true',
                        help='Option for updating mongoDB with chromosome tracks')
    parser.add_argument('--trackfile', default='Homo_sapiens.GRCh38.99.gtf',
                        help='Input file for updating mongoDB with chromosome tracks')
    parser.add_argument('--mane',
                        help='Mane file for updating tracks')
    parser.add_argument('--collection',
                        help='Optional collection name')
    args = parser.parse_args()

    if args.chromsizes:
        print('Updating chromosome sizes')
        collection = args.collection if args.collection else 'chromsizes38'
        update = UpdateMongo(args.csfile, args.mane, collection)
        update.write_chromsizes()
        print('Finished updating chromosome sizes')
    elif args.track:
        print('Updating tracks')
        collection = args.collection if args.collection else 'tracks38'
        update = UpdateMongo(args.trackfile, args.mane, collection)
        update.write_tracks()
        print('Finished updating tracks')

if __name__ == '__main__':
    main()
