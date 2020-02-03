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
        self.file_name = file_name
        self.annotations = []
        self.header = []
        self.fields_to_save = ['sequence', 'start', 'end', 'name',
                               'strand', 'color', 'score']

        if annot_type == 'aed':
            self.parse_aed()
        else:
            self.parse_bed()

        # Bulk upload annotations to database
        collection = GENS_DB['annotations']
        collection.insert_many(self.annotations)

    def parse_bed(self):
        '''
        Parses a bed file
        '''
        with open(self.input_file) as bed:
            bed_reader = csv.reader(bed, delimiter='\t')

            # Set header since existing header is bad
            self.header = ['sequence', 'start', 'end', 'name',
                           'score', 'strand', 'nul', 'null',
                           'color']

            # Skip bad header info
            next(bed_reader)

            # Load in annotations
            for line in bed_reader:
                self.add_annotation(line)

    def parse_aed(self):
        '''
        Parses an aed file
        '''
        with open(self.input_file) as aed:
            aed_reader = csv.reader(aed, delimiter='\t')

            # Parse the aed header
            for head in next(aed_reader):
                self.header.append(head.split(':')[1].split('(')[0])

            for line in aed_reader:
                # Skip extra header info
                if any('(aed:' in l for l in line):
                    continue

                self.add_annotation(line)

    def add_annotation(self, line):
        '''
        Add relevant fields for an annotation
        '''
        annotation = {}
        for title, field in zip(self.header, line):
            if title in self.fields_to_save:
                annotation[title] = format_field(title, field)
        annotation['track_source'] = self.file_name
        self.annotations.append(annotation)

def format_field(title, field):
    '''
    Formats field depending on title
    '''
    if 'color' in title:
        return field if 'rgb(' in field else 'rgb({})'.format(field)
    if 'sequence' in title:
        return field.strip('chr')
    if 'start' in title or 'end' in title or 'score' in title:
        return int(field)
    return field

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
