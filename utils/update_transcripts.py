#!/usr/bin/env python3
"""
Write transcripts to DB
"""

import csv
import argparse
from functools import cmp_to_key
from pymongo import MongoClient, ASCENDING
from gtfparse import read_gtf
import os

CLIENT = MongoClient(
    host=os.environ.get("MONGO_HOST", "10.0.224.63"),
    port=os.environ.get("MONGO_PORT", 27017),
)
GENS_DB = CLIENT["gens"]


class UpdateTranscripts:
    """
    Update mongoDB with values from the input files
    """

    def __init__(self, args):
        self.input_file = args.file
        self.mane_file = args.mane
        self.mane = {}
        self.temp_collection = GENS_DB[args.collection + "temp"]
        self.collection_name = args.collection
        self.collection = GENS_DB[args.collection]

    def write_transcripts(self):
        """
        Write transcripts to database
        """

        # Set index to be able to sort quicker
        self.temp_collection.create_index([("start", ASCENDING)], unique=False)
        self.temp_collection.create_index([("end", ASCENDING)], unique=False)
        self.temp_collection.create_index([("chrom", ASCENDING)], unique=False)
        self.collection.create_index([("height_order", ASCENDING)], unique=False)

        # Set MANE transcripts
        with open(self.mane_file) as mane_file:
            cs_reader = csv.reader(mane_file, delimiter="\t")
            next(cs_reader)  # Skip header
            for line in cs_reader:
                hgnc_id = line[2].replace("HGNC:", "")
                refseq_id = line[5]
                ensemble_nuc = line[7].split(".")[0]
                self.mane[ensemble_nuc] = {"hgnc_id": hgnc_id, "refseq_id": refseq_id}

        # Set the rest
        with open(self.input_file) as track_file:
            tracks = read_gtf(track_file)
            tracks = [
                list(a)
                for a in zip(
                    tracks["seqname"],
                    tracks["gene_name"],
                    tracks["feature"],
                    tracks["start"],
                    tracks["end"],
                    tracks["strand"],
                    tracks["transcript_id"],
                    tracks["transcript_biotype"],
                    tracks["exon_number"],
                )
            ]

            # Sort transcripts to the top, also sort tracks belonging to the same gene
            tracks.sort(key=cmp_to_key(self.track_sorter))

            # Variables for setting height order of track
            previous_gene_name = ""
            height_order = 1

            features = {}

            # Insert tracks in DB
            for (
                seqname,
                gene_name,
                feature,
                start,
                end,
                strand,
                transcript_id,
                transcript_biotype,
                exon_number,
            ) in tracks:

                if transcript_biotype != "protein_coding":
                    continue

                if feature == "transcript":
                    if gene_name != previous_gene_name:
                        height_order = 1
                    else:
                        height_order += 1

                    if transcript_id in self.mane:
                        mane = True
                        hgnc_id = self.mane[transcript_id]["hgnc_id"]
                        refseq_id = self.mane[transcript_id]["refseq_id"]
                    else:
                        mane = False
                        hgnc_id = None
                        refseq_id = None

                    mane = True if transcript_id in self.mane else False
                    self.temp_collection.insert_one(
                        {
                            "chrom": seqname,
                            "gene_name": gene_name,
                            "start": start,
                            "end": end,
                            "strand": strand,
                            "height_order": height_order,
                            "transcript_id": transcript_id,
                            "transcript_biotype": transcript_biotype,
                            "mane": mane,
                            "hgnc_id": hgnc_id,
                            "refseq_id": refseq_id,
                            "features": [],
                        }
                    )
                    previous_gene_name = gene_name
                else:
                    # Gather features for a bulk update
                    features.setdefault(transcript_id, []).append(
                        {
                            "feature": feature,
                            "exon_number": exon_number,
                            "start": start,
                            "end": end,
                        }
                    )

            # Bulk update transcripts with features
            for transcript_id in features:
                self.temp_collection.update_one(
                    {"transcript_id": transcript_id},
                    {"$set": {"features": features[transcript_id]}},
                )

    def track_sorter(self, track1, track2):
        """
        Sorts a track depending on feature, gene name and start position
        """
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
        if (
            (t1_feature == "transcript" and t2_feature != "transcript")
            or t1_transcript_id in self.mane
            or (t1_gene_name == t2_gene_name and t1_start < t2_start)
        ):
            return -1
        if (
            (t1_feature != "transcript" and t2_feature == "transcript")
            or t2_transcript_id in self.mane
            or (t1_gene_name == t2_gene_name and t1_start > t2_start)
        ):
            return 1
        return 0

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
        description="Update transcripts in Gens DB",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "-f",
        "--file",
        default="Homo_sapiens.GRCh38.99.gtf",
        help="Input file for updating mongoDB with chromosome transcripts",
    )
    parser.add_argument("-m", "--mane", help="Mane file for updating transcripts")
    parser.add_argument(
        "-c", "--collection", help="Optional collection name", default="transcripts38"
    )
    args = parser.parse_args()

    print("Updating transcripts")
    update = UpdateTranscripts(args)
    try:
        update.write_transcripts()
    except Exception as e:
        print(str(e))
        print("Error, could not update. Rollback")
        update.clean_up()
        return
    update.save_to_collection()
    print("Finished updating transcripts")


if __name__ == "__main__":
    main()
