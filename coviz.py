import tabix
import json
from flask import Flask, request, session, g, redirect, url_for, abort, render_template, flash, jsonify, send_from_directory, make_response
app = Flask(__name__)


@app.route('/', methods=['POST', 'GET'])
def coverage_view():
        region = request.form.get('region', '1:100000-200000')

        call_chrom = 1
        call_start = 1011000
        call_end   = 1015000
        res, chrom, start_pos, end_pos = parse_region_str(region)
        cov_file = "/trannel/proj/wgs/sentieon/bam/merged.cov.gz"
        tb = tabix.open(cov_file)
        records = list(tb.query(res+'_'+chrom, int(start_pos), int(end_pos)))

        baf_file = "/trannel/proj/wgs/sentieon/bam/BAF.bed.gz"
        baf = tabix.open(baf_file)
        baf_records = list(baf.query(chrom, int(start_pos), int(end_pos)))
        
        return render_template('show_cov.html', data=json.dumps(records), baf=json.dumps(baf_records), chrom=chrom, start=start_pos, end=end_pos, call_chrom=call_chrom, call_start=call_start, call_end=call_end)


@app.route('/_getcov', methods=['GET'])
def get_cov():
        region = request.args.get('region', '1:100000-200000')

        res, chrom, start_pos, end_pos = parse_region_str(region)        
        cov_file = "/trannel/proj/wgs/sentieon/bam/merged.cov.gz"
        tb = tabix.open(cov_file)
        records = list(tb.query(res+'_'+chrom, int(start_pos), int(end_pos)))

        baf_file = "/trannel/proj/wgs/sentieon/bam/BAF.bed.gz"
        baf = tabix.open(baf_file)
        baf_records = list(baf.query(chrom, int(start_pos), int(end_pos)))
       
        return jsonify(data=records, baf=baf_records, status="ok", chrom=chrom, start=start_pos, end=end_pos)

def parse_region_str(region):
        chrom =""
        start_pos = 0
        end_pos = 0
        if ":" in region and "-" in region:
                chrom, pos_range = region.split(':')
                start_pos, end_pos = pos_range.split('-')
        else:
                chrom, start_pos, end_pos = region.split()

        if "chr" in chrom:
                chrom.lstrip('chr')
        if int(start_pos) < 0:
                start_pos = 0
        size = int(end_pos) - int(start_pos)

        resolution = "d"
        if size > 25000000:
                resolution = "a"
        elif size > 3000000:
                resolution = "b"
        elif size > 200000:
                resolution = "c"
                
        return resolution, chrom, start_pos, end_pos
