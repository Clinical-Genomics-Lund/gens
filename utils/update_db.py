#!/usr/bin/python3
'''
Write cromosome sizes to database
'''

import csv
import argparse
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
        with open(self.input_file) as tsv_file:
            first_chrom_len = 1
            tsv_reader = csv.reader(tsv_file, delimiter='\t')
            for line in tsv_reader:
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

if __name__ == '__main__':
    PARSER = argparse.ArgumentParser(description='Update mongoDB database with data')
    PARSER.add_argument('--csfile', default='chrom_sizes.tsv',
                        help='Input file for updating mongoDB with chromosome sizes')
    PARSER.add_argument('--chromsizes', action='store_true',
                        help='Option for updating mongoDB with chromosome sizes')
    ARGS = PARSER.parse_args()

    if (ARGS.chromsizes):
        UPDATE = UpdateMongo(ARGS.csfile, 'chromsizes')
        UPDATE.write_chromsizes()
