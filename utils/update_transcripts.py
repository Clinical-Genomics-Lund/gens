#!/usr/bin/env python3
"""
Write transcripts to DB
"""

from collections import defaultdict
import sys
import argparse
import csv
import os
from itertools import chain

from pymongo import ASCENDING, MongoClient

import logging
import click

LOG = logging.getLogger(__name__)

host = os.environ.get("MONGODB_HOST", "10.0.224.63")
port = int(os.environ.get("MONGODB_PORT", 27017))
LOG.info(f"connecting to db: {port}:{host}")
CLIENT = MongoClient(
    host=host,
    port=port,
)
GENS_DB = CLIENT[os.environ["GENS_DBNAME"]]


def _parse_attribs(attribs):
    """Parse attribute strings."""
    attribs = attribs.strip()
    return dict(
        [
            map(lambda x: x.replace('"', ""), a.strip().split(" ", 1))
            for a in attribs.split(";")
            if a
        ]
    )


def _assign_height_order(transcripts):
    """Assign height order for an list or transcripts.

    MANE transcript allways have height order == 1
    Rest are assinged height order depending on their start position
    """
    # assign height order to name transcripts
    mane_transcript = [tr for tr in transcripts if tr["mane"] is not None]
    if len(mane_transcript) == 1:
        mane_transcript[0]["height_order"] = 1
        rest_start_height_order = 2
    elif len(mane_transcript) > 1:
        sorted_mane = [
            *[tr for tr in mane_transcript if tr['mane'] == 'MANE Select'],
            *[tr for tr in mane_transcript if tr['mane'] == 'MANE Plus Clinical'],
            *[tr for tr in mane_transcript
              if not any([tr['mane'] == 'MANE Plus Clinical', tr['mane'] == 'MANE Select'])],
        ]
        for order, tr in enumerate(sorted_mane, 1):
            tr['height_order'] = order

    # assign height order to the rest of the transcripts
    rest = (tr for tr in transcripts if tr["mane"] is None)
    for order, tr in enumerate(
        sorted(rest, key=lambda x: int(x["start"])),
            start=len(mane_transcript) + 1
    ):
        tr["height_order"] = order


def _sort_transcript_features(transcripts):
    """Sort transcript features on start coordinate."""
    for tr in transcripts:
        tr["features"] = sorted(tr["features"], key=lambda x: x["start"])


class UpdateTranscripts:
    """
    Update mongoDB with values from the input files
    """

    def __init__(self, args):
        self.input_file = args.file
        self.mane_file = args.mane
        self.mane = {}
        self.hg_type = args.hg_type
        self.temp_collection = GENS_DB[args.collection + "temp"]
        self.collection_name = args.collection
        self.collection = GENS_DB[args.collection]
        self.update = args.update  # if shuld update existing db

    def write_transcripts(self):
        """
        Write transcripts to database
        """
        if self.update:
            self.temp_collection.insert_many(self.collection.find())

        # Set index to be able to sort quicker
        self.temp_collection.create_index([("start", ASCENDING)], unique=False)
        self.temp_collection.create_index([("end", ASCENDING)], unique=False)
        self.temp_collection.create_index([("chrom", ASCENDING)], unique=False)
        self.collection.create_index([("height_order", ASCENDING)], unique=False)
        self.collection.create_index("hg_type", unique=False)

        LOG.info("Indexing MANE transcripts")
        # Set MANE transcripts
        with open(self.mane_file) as mane_file:
            creader = csv.DictReader(mane_file, delimiter="\t")
            for row in creader:
                ensemble_nuc = row['Ensembl_nuc'].split(".")[0]
                self.mane[ensemble_nuc] = {
                    "hgnc_id": row['HGNC_ID'].replace("HGNC:", ""),
                    "refseq_id": row['RefSeq_nuc'],
                    "mane_status": row['MANE_status'],
                }

        # Set the rest
        LOG.info("Parsing transcript file")
        num_lines = sum(1 for line in open(self.input_file))
        with open(self.input_file) as track_file:
            # setup reader
            COLNAMES = [
                "seqname",
                "source",
                "feature",
                "start",
                "end",
                "score",
                "strand",
                "frame",
                "attribute",
            ]
            raw_file = csv.DictReader(track_file, COLNAMES, delimiter="\t")

            # Variables for setting height order of track
            transc_index = {}
            results = defaultdict(list)
            with click.progressbar(
                raw_file, length=num_lines, label="Processing features"
            ) as bar:
                for row in bar:
                    if row["seqname"].startswith("#") or row["seqname"] is None:
                        continue
                    attribs = _parse_attribs(row["attribute"])
                    # skip non protein coding genes
                    if not attribs.get("gene_biotype") == "protein_coding":
                        continue

                    transcript_id = attribs.get("transcript_id")
                    if row["feature"] == "transcript":
                        if transcript_id in self.mane:
                            mane = self.mane[transcript_id]["mane_status"]
                            hgnc_id = self.mane[transcript_id]["hgnc_id"]
                            refseq_id = self.mane[transcript_id]["refseq_id"]
                        else:
                            mane = None
                            hgnc_id = None
                            refseq_id = None

                        res = {
                            "chrom": row["seqname"],
                            "hg_type": int(self.hg_type),
                            "gene_name": attribs["gene_name"],
                            "start": int(row["start"]),
                            "end": int(row["end"]),
                            "strand": row["strand"],
                            "height_order": None,  # will be set later
                            "transcript_id": transcript_id,
                            "transcript_biotype": attribs["transcript_biotype"],
                            "mane": mane,
                            "hgnc_id": hgnc_id,
                            "refseq_id": refseq_id,
                            "features": [],
                        }
                        transc_index[transcript_id] = res
                        results[attribs["gene_name"]].append(res)
                    elif row["feature"] in [
                        "exon",
                        "three_prime_utr",
                        "five_prime_utr",
                    ]:
                        # Add features in transcript
                        if transcript_id in transc_index:
                            specific_params = {}
                            if row["feature"] == "exon":
                                specific_params["exon_number"] = int(
                                    attribs["exon_number"]
                                )
                            transc_index[transcript_id]["features"].append(
                                {
                                    **{
                                        "feature": row["feature"],
                                        "start": int(row["start"]),
                                        "end": int(row["end"]),
                                    },
                                    **specific_params,
                                }
                            )
        # assign height order to stored transcripts
        LOG.info("Assign height order values and sort features")
        for transcripts in results.values():
            _assign_height_order(transcripts)
            _sort_transcript_features(transcripts)
        # Bulk insert collections
        self.temp_collection.insert_many(chain(*results.values()))

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
    parser.add_argument("-hg", "--hg_type", help="Set hg-type", default="38")
    parser.add_argument(
        "-u",
        "--update",
        help="Update existing database with new information",
        action="store_true",
    )
    parser.add_argument(
        "-c", "--collection", help="Optional collection name", default="transcripts"
    )
    args = parser.parse_args()

    LOG.info("Updating transcripts")
    update = UpdateTranscripts(args)
    try:
        update.write_transcripts()
    except Exception as e:
        LOG.error(str(e))
        LOG.error("Error, could not update. Rollback")
        update.clean_up()
        click.secho(
            "Could not perform update due to an error. Rolling back ✘", fg="red"
        )
        return
    update.save_to_collection()
    click.secho("Finished updating transcripts ✔", fg="green")


if __name__ == "__main__":
    main()
