'''
Whole genome visualization of BAF and log R ratio
'''

import json
import math
from subprocess import Popen, PIPE
from flask import Flask, request, render_template, jsonify, abort

APP = Flask(__name__)

@APP.route('/', methods=['POST', 'GET'])
def coverage_view():
    '''
    Method for displaying a region
    '''
    region = request.form.get('region', '1:100000-200000')

    call_chrom = 1
    call_start = 1011000
    call_end = 1015000

    parsed_region = parse_region_str(region)
    if not parsed_region:
        return abort(416)

    res, chrom, start_pos, end_pos = parsed_region

    cov_file = "/trannel/proj/wgs/sentieon/bam/merged.cov.gz"
    records = list(tabix_query(cov_file, res + '_' + chrom, int(start_pos), int(end_pos)))

    baf_file = "/trannel/proj/wgs/sentieon/bam/BAF.bed.gz"
    baf_records = list(tabix_query(baf_file, chrom, int(start_pos), int(end_pos)))

    # Get sample information
    sample_file = '/trannel/proj/wgs/sentieon/bam/sample_data.json'
    with open(sample_file) as data_file:
        sample_data = json.load(data_file)
    median = float(sample_data['median_depth'])
    title = sample_data['sample_name']

    return render_template('cov.html', chrom=chrom, start=start_pos,
            end=end_pos, call_chrom=call_chrom, call_start=call_start,
            call_end=call_end, median=median, title=title)

@APP.route('/_getcov', methods=['GET'])
def get_cov():
    '''
    Method for redrawing region on button change
    '''
    region = request.args.get('region', '1:100000-200000')
    median = float(request.args.get('median', 1))

    parsed_region = parse_region_str(region)
    if not parsed_region:
        return abort(416)

    res, chrom, start_pos, end_pos = parsed_region

    cov_file = "/trannel/proj/wgs/sentieon/bam/merged.cov.gz"
    records = list(tabix_query(cov_file, res+'_'+chrom, int(start_pos), int(end_pos)))

    baf_file = "/trannel/proj/wgs/sentieon/bam/BAF.bed.gz"
    baf_records = list(tabix_query(baf_file, chrom, int(start_pos), int(end_pos)))

    #  Normalize and calculate the Log R Ratio
    records = [[record[0], record[1], record[2], str(math.log(float(record[3]) / median + 1, 2))]
               for record in records]

    if not records or not baf_records:
        return abort(404)

    return jsonify(data=records, baf=baf_records, status="ok", chrom=chrom,
                   start=start_pos, end=end_pos)

@APP.route('/_getoverviewcov', methods=['GET'])
def get_overview_cov():
    '''
    Reads and computes LogR and BAF values for overview graph
    '''
    region = request.args.get('region', '1:100000-200000')
    median = float(request.args.get('median', 1))
    xpos = float(request.args.get('xpos', 1))
    ypos = float(request.args.get('ypos', 1))
    box_height = float(request.args.get('boxHeight', 1))
    y_margin = float(request.args.get('y_margin', 1))
    x_ampl = float(request.args.get('x_ampl', 1))

    # Set graph-specific values
    baf_ampl = box_height - 2 * y_margin
    logr_ampl = (box_height - y_margin * 2) / 8
    baf_ypos = ypos + box_height - y_margin
    logr_ypos = ypos + 1.5 * box_height

    parsed_region = parse_region_str(region)
    if not parsed_region:
        print('No parsed region')
        return abort(416)

    res, chrom, start_pos, end_pos = parsed_region
    x_ampl = x_ampl / (end_pos - start_pos)


    cov_file = "/trannel/proj/wgs/sentieon/bam/merged.cov.gz"
    logr_list = list(tabix_query(cov_file, res + '_' + chrom, int(start_pos), int(end_pos)))

    #  Normalize and calculate the Log R Ratio
    logr_records = []
    for record in logr_list:
        logr_records.extend([xpos + x_ampl * (float(record[1]) - start_pos),
                             logr_ypos - logr_ampl *
                             math.log(float(record[3]) / median + 1, 2), 0])

    baf_file = "/trannel/proj/wgs/sentieon/bam/BAF.bed.gz"
    baf_list = list(tabix_query(baf_file, chrom, int(start_pos), int(end_pos)))
    baf_records = []
    for record in baf_list:
        baf_records.extend([xpos + x_ampl * (float(record[1]) - start_pos),
                            baf_ypos - baf_ampl * float(record[3]), 0])

    if not logr_records or not baf_records:
        print('No records')
        return abort(404)

    return jsonify(data=logr_records, baf=baf_records, status="ok",
                   chrom=chrom, x_pos=xpos, y_pos=ypos)

### Help functions ###

def parse_region_str(region):
    '''
    Parses a region string
    '''
    if ":" in region and "-" in region:
        try:
            chrom, pos_range = region.split(':')
            start_pos, end_pos = pos_range.split('-')
        except ValueError:
            return None
    else:
        try:
            chrom, start_pos, end_pos = region.split()
        except ValueError:
            return None

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

    return resolution, chrom, int(start_pos), int(end_pos)

def tabix_query(filename, chrom, start, end):
    """Call tabix and generate an array of strings for each line it returns."""
    query = '{}:{}-{}'.format(chrom, start, end)
    try:
        process = Popen(['tabix', '-f', filename, query], stdout=PIPE)
    except:
        print('Could not open ' + filename)
    else:
        for line in process.stdout:
            yield line.strip().decode('utf-8').split()

def test_coverage_view():
    '''
    Function for mocking if data is not present,
    only for test purposes
    '''
    region = request.form.get('region', '1:100000-200000')

    call_chrom = 1
    call_start = 1011000
    call_end = 1015000

    parsed_region = parse_region_str(region)
    if not parsed_region:
        return abort(416)

    res, chrom, start_pos, end_pos = parsed_region

    median = 1
    title = 'test'

    records = []
    baf_records = []
    intensity = 0.5

    for i in range(int(start_pos), int(end_pos), 100):
        records.append([res + '_' + chrom, i, i, intensity])
        baf_records.append([res + '_' + chrom, i, i, intensity])

    return render_template('cov.html', data=json.dumps(records),
                           baf=json.dumps(baf_records), chrom=chrom,
                           start=start_pos, end=end_pos,
                           call_chrom=call_chrom, call_start=call_start,
                           call_end=call_end, median=median, title=title)

def test_get_cov():
    '''
    Function for mocking if data is not present,
    only for test purposes
    '''
    region = request.args.get('region', '1:100000-200000')

    parsed_region = parse_region_str(region)
    if not parsed_region:
        return abort(416)

    res, chrom, start_pos, end_pos = parsed_region

    records = []
    baf_records = []
    intensity = 0.5

    for i in range(int(start_pos), int(end_pos), 2000):
        records.append([res + '_' + chrom, i, i, intensity])
        baf_records.append([res + '_' + chrom, i, i, intensity])

    return jsonify(data=records, baf=baf_records, status="ok", chrom=chrom,
                   start=start_pos, end=end_pos)
