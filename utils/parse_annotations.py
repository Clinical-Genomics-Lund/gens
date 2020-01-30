#!/usr/bin/python3
'''
Parses files into mongo database
'''

import csv
import argparse
from pymongo import MongoClient

CLIENT = MongoClient('10.0.224.63', 27017)
GENS_DB = CLIENT['gens']

class ParseAnnotations:
    '''
    Update mongoDB with values from input files
    '''
    def __init__(self, input_file, annot_type, file_name):
        self.input_file = input_file
        self.collection = GENS_DB['annotations']
        self.file_name = file_name
        self.header = []
        self.fields_to_save = ['sequence', 'start', 'end', 'name', 'strand',
                               'color', 'score']

        if annot_type == 'aed':
            self.parse_aed()
        else:
            self.parse_bed()

    def parse_bed(self):
        '''
        Parses a bed file
        '''

    def parse_aed_header(self, header):
        '''
        Parses the aed header
        '''
        for head in header:
            self.header.append(head.split(':')[1].split('(')[0])

    def parse_aed(self):
        '''
        Parses an aed file
        '''
        with open(self.input_file) as aed:
            aed_reader = csv.reader(aed, delimiter='\t')
            self.parse_aed_header(next(aed_reader))

            annotations = []
            for line in aed_reader:
                # Skip extra header info
                if any('(aed:' in l for l in line):
                    continue

                # Add relevant fields for annotation
                annotation = {}
                for title, field in zip(self.header, line):
                    if title in self.fields_to_save:
                        annotation[title] = field
                annotation['track_source'] = self.file_name
                annotations.append(annotation)

            # Bulk upload annotations to database
            self.collection.insert_many(annotations)

if __name__ == '__main__':
    PARSER = argparse.ArgumentParser(description='Parse annotations from different file types')
    PARSER.add_argument('--bed', help='A bed file to parse')
    PARSER.add_argument('--aed', help='An aed file to parse')
    PARSER.add_argument('--name', help='A representative name for annotations \
            based on input file', required=True)
    ARGS = PARSER.parse_args()

    if ARGS.bed:
        print('Parsing bed file')
        ParseAnnotations(ARGS.bed, 'bed', ARGS.name)
    elif ARGS.aed:
        print('Parsing aed file')
        ParseAnnotations(ARGS.aed, 'aed', ARGS.name)
