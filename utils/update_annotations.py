#!/usr/bin/python3
'''
Parses files into mongo database
'''

import csv
import argparse
from pymongo import MongoClient, ASCENDING

CLIENT = MongoClient('10.0.224.63', 27017)
GENS_DB = CLIENT['gens']

class UpdateAnnotations:
    '''
    Update mongoDB with values from input files
    '''
    def __init__(self, args):
        self.input_file = args.file
        self.file_name = args.file.split('/')[-1]
        self.hg_type = args.hg_type
        self.collection_name = args.collection
        self.collection = GENS_DB[args.collection]
        self.annotations = []
        self.header = []
        self.fields_to_save = ['sequence', 'start', 'end', 'name',
                               'strand', 'color', 'score']

    def write_annotations(self, annotation_type):
        '''
        Write annotations to database
        '''
        # Set index to be able to sort quicker
        self.collection.create_index([('start', ASCENDING)], unique=False)
        self.collection.create_index([('end', ASCENDING)], unique=False)
        self.collection.create_index([('chrom', ASCENDING)], unique=False)
        self.collection.create_index([('source', ASCENDING)], unique=False)
        self.collection.create_index([('hg_type', ASCENDING)], unique=False)
        self.collection.create_index([('height_order', ASCENDING)], unique=False)

        if annotation_type == 'aed':
            self.parse_aed()
        else:
            self.parse_bed()

        # Remove existing annotations in database
        self.collection.remove({'source': self.file_name})

        # Bulk upload annotations to database
        print('Inserting to DB')
        self.collection.insert_many(self.annotations)

        # Update height order for annotations
        print('Updating height order')
        self.update_height_order()

    def update_height_order(self):
        '''
        Updates height order for annotations
        Height order is used for annotation placement
        '''
        for chrom in range(1, 25):
            chrom = 'X' if chrom == 23 else \
                    'Y' if chrom == 24 else str(chrom)
            annotations = self.collection.find({
                'chrom': chrom,
                'source': self.file_name}).sort([('start', ASCENDING)])

            height_tracker = [-1] * 200
            current_height = 1
            for annot in annotations:
                while True:
                    if int(annot['start']) > height_tracker[current_height - 1]:

                        # Add height to DB
                        self.collection.update({
                            '_id': annot['_id'],
                            'source': annot['source']
                            }, {'$set': {'height_order': current_height}})

                        # Keep track of added height order
                        height_tracker[current_height - 1] = int(annot['end'])

                        # Start from the beginning
                        current_height = 1
                        break

                    current_height += 1

                    # Extend height tracker
                    if len(height_tracker) < current_height:
                        height_tracker += [-1] * 100

    def parse_bed(self):
        '''
        Parses a bed file
        '''
        with open(self.input_file) as bed:
            bed_reader = csv.reader(bed, delimiter='\t')

            # Set header since existing header is bad
            self.header = ['sequence', 'start', 'end', 'name',
                           'score', 'strand', 'null', 'null', 'color']

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
                if title == 'sequence':
                    title = 'chrom'
                try:
                    annotation[title] = format_field(title, field)
                except ValueError:
                    print(line)
                    return
        if annotation['end'] < annotation['start']:
            annotation['start'], annotation['end'] = \
                annotation['end'], annotation['start']
        self.set_missing_fields(annotation)
        annotation['source'] = self.file_name
        annotation['hg_type'] = self.hg_type
        self.annotations.append(annotation)

    def set_missing_fields(self, annotation):
        '''
        Sets default values to fields that are missing
        '''
        for key in self.fields_to_save:
            if key in annotation.keys():
                continue
            elif key == 'color':
                annotation['color'] = 'gray'
            elif key == 'score':
                annotation['score'] = 'None'
            elif key == 'sequence' or key == 'strand':
                pass
            else:
                print('Warning, field {} is missing from annotation {} in file {}'.\
                    format(key, annotation, self.file_name))

def format_field(title, field):
    '''
    Formats field depending on title
    '''
    if 'color' in title:
        if not field:
            return 'gray'
        return field if 'rgb(' in field else 'rgb({})'.format(field)
    if 'chrom' in title:
        if not field:
            print('"{}" is not defined. Value was "{}" Skipping line:'.format(title, field))
            raise ValueError(title + ' field must exist')
        return field.strip('chr')
    if 'start' in title or 'end' in title:
        if not field:
            print('"{}" is not defined. Value was "{}" Skipping line:'.format(title, field))
            raise ValueError(title + 'field must exist')
        return int(field)
    if 'score' in title:
        if not field:
            return ''
        return int(field)
    return field

def main():
    '''
    Main function for annotation parser
    '''
    parser = argparse.ArgumentParser(
        description='Update annotations from either a bed or aed file',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument('-f', '--file', help='A file to parse', required=True)
    parser.add_argument('-hg', '--hg_type', help='Set hg-type', default='38')
    parser.add_argument('-c', '--collection', default='annotations',
                        help='Optional collection name')
    args = parser.parse_args()
    update = UpdateAnnotations(args)

    if '.bed' in args.file:
        print('Parsing bed file')
        update.write_annotations('bed')
    elif '.aed' in args.file:
        print('Parsing aed file')
        update.write_annotations('aed')
    else:
        print('Wrong file type')
        return
    print('Finished')

if __name__ == '__main__':
    main()
