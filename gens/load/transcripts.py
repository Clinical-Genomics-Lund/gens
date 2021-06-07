"""Load transcripts into database"""

import csv
import logging
from collections import defaultdict
from itertools import chain
import click

LOG = logging.getLogger(__name__)


def parse_mane_transc(mane_file):
    """Parse mane tranascript file and index on ensemble id."""
    mane = {}
    LOG.info("parsing mane transcripts")
    creader = csv.DictReader(mane_file, delimiter="\t")
    for row in creader:
        ensemble_nuc = row["Ensembl_nuc"].split(".")[0]
        mane[ensemble_nuc] = {
            "hgnc_id": row["HGNC_ID"].replace("HGNC:", ""),
            "refseq_id": row["RefSeq_nuc"],
            "mane_status": row["MANE_status"],
        }
    return mane


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


def _count_file_len(file):
    """Count number of lines in file."""
    n_lines = sum(1 for line in file)
    file.seek(0)  # reset file to begining
    return n_lines


def parse_transcript_gtf(transc_file, delimiter="\t"):
    """Parse transcripts."""
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
    target_features = ("transcript", "exon", "three_prime_utr", "five_prime_utr")
    LOG.debug("parsing transcripts")
    cfile = csv.DictReader(transc_file, COLNAMES, delimiter=delimiter)
    for row in cfile:
        if row["seqname"].startswith("#") or row["seqname"] is None:
            continue

        if row["feature"] not in target_features:
            continue

        attribs = _parse_attribs(row["attribute"])
        # skip non protein coding genes
        if attribs.get("gene_biotype") == "protein_coding":
            yield row, attribs


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
            *[tr for tr in mane_transcript if tr["mane"] == "MANE Select"],
            *[tr for tr in mane_transcript if tr["mane"] == "MANE Plus Clinical"],
            *[
                tr
                for tr in mane_transcript
                if not any([tr["mane"] == "MANE Plus Clinical", tr["mane"] == "MANE Select"])
            ],
        ]
        for order, tr in enumerate(sorted_mane, 1):
            tr["height_order"] = order

    # assign height order to the rest of the transcripts
    rest = (tr for tr in transcripts if tr["mane"] is None)
    for order, tr in enumerate(
        sorted(rest, key=lambda x: int(x["start"])), start=len(mane_transcript) + 1
    ):
        tr["height_order"] = order


def _sort_transcript_features(transcripts):
    """Sort transcript features on start coordinate."""
    for tr in transcripts:
        tr["features"] = sorted(tr["features"], key=lambda x: x["start"])


def build_transcripts(transc_file, mane_file, genome_build):
    """Build transcript object from transcript and mane file."""
    mane_transc = parse_mane_transc(mane_file)
    results = defaultdict(list)
    transc_index = {}
    n_lines = _count_file_len(transc_file)
    with click.progressbar(transc_file, length=n_lines, label="Processing transcripts") as bar:
        for transc, attribs in parse_transcript_gtf(bar):
            transcript_id = attribs.get("transcript_id")
            # store transcripts in index
            if transc["feature"] == "transcript":
                selected_name = mane_transc.get(transcript_id, {})
                res = {
                    "chrom": transc["seqname"],
                    "hg_type": int(genome_build),
                    "gene_name": attribs["gene_name"],
                    "start": int(transc["start"]),
                    "end": int(transc["end"]),
                    "strand": transc["strand"],
                    "height_order": None,  # will be set later
                    "transcript_id": transcript_id,
                    "transcript_biotype": attribs["transcript_biotype"],
                    "mane": selected_name.get("mane_status"),
                    "hgnc_id": selected_name.get("hgnc_id"),
                    "refseq_id": selected_name.get("refseq_id"),
                    "features": [],
                }
                transc_index[transcript_id] = res
                results[attribs["gene_name"]].append(res)
            elif transc["feature"] in ["exon", "three_prime_utr", "five_prime_utr"]:
                # add features to existing transcript
                if transcript_id in transc_index:
                    specific_params = {}
                    if transc["feature"] == "exon":
                        specific_params["exon_number"] = int(attribs["exon_number"])
                    transc_index[transcript_id]["features"].append(
                        {
                            **{
                                "feature": transc["feature"],
                                "start": int(transc["start"]),
                                "end": int(transc["end"]),
                            },
                            **specific_params,
                        }
                    )

    LOG.info("Assign height order values and sort features")
    for transcripts in results.values():
        _assign_height_order(transcripts)
        _sort_transcript_features(transcripts)
    return chain(*results.values())
