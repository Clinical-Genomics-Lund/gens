#!/usr/bin/env python3
"""
Write cromosome sizes to database
"""

import argparse
import csv
import os

from pymongo import MongoClient

host = os.environ.get("MONGODB_HOST", "10.0.224.63")
port = int(os.environ.get("MONGODB_PORT", 27017)
print(f"connecting to db: {host}:{port}")
CLIENT = MongoClient(
    host=host,
    port=port,
)
GENS_DB = CLIENT[os.environ["GENS_DBNAME"]]


class UpdateChromosomeSizes:
    """
    Update mongoDB with values from the input file
    """

    def __init__(self, args):
        self.input_file = args.file
        self.temp_collection = GENS_DB[args.collection + "temp"]
        self.collection_name = args.collection
        self.collection = GENS_DB[args.collection]

    def write_chromsizes(self):
        """
        Write cromosome sizes to database
        """
        with open(self.input_file) as cs_file:
            first_chrom_len = 1
            cs_reader = csv.reader(cs_file, delimiter="\t")
            chrom_sizes = []
            tot_scale = 0
            for line in cs_reader:
                chrom = line[0]
                chrom_size = int(line[1])

                if chrom == "1":
                    first_chrom_len = chrom_size

                scale = round(chrom_size / first_chrom_len, 2)
                tot_scale += round(chrom_size / first_chrom_len, 2)

                chrom_sizes.append({"chrom": chrom, "size": chrom_size, "scale": scale})
            for chrom in chrom_sizes:
                chrom["scale"] /= tot_scale
            self.temp_collection.insert_many(chrom_sizes)

    def clean_up(self):
        """
        Remove temporary collection
        """
        self.temp_collection.drop()

    def save_to_collection(self):
        """
        Save temporary collection as real collection name
        """
        # Drop existing database
        self.collection.drop()

        # Rename temp collection to target collection
        self.temp_collection.rename(self.collection_name)


def main():
    """
    Main function
    """
    parser = argparse.ArgumentParser(
        description="Update mongoDB database with chromosome size data",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "-f",
        "--file",
        default="chrom_sizes38.tsv",
        help="Input file for updating mongoDB with chromosome sizes",
    )
    parser.add_argument(
        "-c", "--collection", help="Optional collection name", default="chromsizes38"
    )
    args = parser.parse_args()

    print("Updating chromosome sizes")
    update = UpdateChromosomeSizes(args)
    try:
        update.write_chromsizes()
    except Exception as e:
        print(str(e))
        print("Error, could not update. Rollback")
        update.clean_up()
        return
    update.save_to_collection()
    print("Finished updating chromosome sizes")


if __name__ == "__main__":
    main()
