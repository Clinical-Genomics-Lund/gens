#!/usr/bin/python3
'''
Write cromosome sizes to database
'''

import csv
from pymongo import MongoClient

CLIENT = MongoClient()
COVIZ_DB = CLIENT['coviz']

def main():
    '''
    Write cromosome sizes to database
    '''
    collection = COVIZ_DB['chromsizes']
    with open('chrom_sizes.tsv') as tsv_file:
        first_chrom_len = 1
        tsv_reader = csv.reader(tsv_file, delimiter='\t')
        for line in tsv_reader:
            chrom = line[0]
            chrom = '23' if chrom == 'X' else '24' if chrom == 'Y' else chrom
            chrom_size = int(line[1])

            if chrom == '1':
                first_chrom_len = chrom_size

            collection.insert_one({
                'chrom': chrom,
                'size': chrom_size,
                'scale': round(chrom_size / first_chrom_len, 2)
            })

if __name__ == '__main__':
    main()
