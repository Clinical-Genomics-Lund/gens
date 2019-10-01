'''
Whole genome visualization of BAF and log R ratio
'''

import json
import math
from subprocess import Popen, PIPE, CalledProcessError
from collections import namedtuple
from flask import Flask, request, render_template, jsonify, abort, Response

APP = Flask(__name__)
APP.config['JSONIFY_PRETTYPRINT_REGULAR'] = False

REGION = namedtuple('region', ('res', 'chrom', 'start_pos', 'end_pos'))
REQUEST = namedtuple('request', ('region', 'median', 'ypos', 'box_height',
                                 'extra_box_width', 'y_margin'))
GRAPH = namedtuple('graph', ('baf_ampl', 'logr_ampl', 'baf_ypos', 'logr_ypos'))

COV_FILE = "/trannel/proj/wgs/sentieon/bam/merged.cov.gz"
BAF_FILE = "/trannel/proj/wgs/sentieon/bam/BAF.bed.gz"

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

    _, chrom, start_pos, end_pos = parsed_region

    # Get sample information
    sample_file = '/trannel/proj/wgs/sentieon/bam/sample_data.json'
    with open(sample_file) as data_file:
        sample_data = json.load(data_file)
    median = float(sample_data['median_depth'])
    title = sample_data['sample_name']

    return render_template('cov.html', chrom=chrom, start=start_pos, end=end_pos,
                           call_chrom=call_chrom, call_start=call_start,
                           call_end=call_end, median=median, title=title)

def get_request_var():
    '''
    Fetches request variables and crunches graph and region variables
    '''
    req = REQUEST(
        request.args.get('region', '1:100000-200000'),
        float(request.args.get('median', 1)),
        float(request.args.get('ypos', 1)),
        float(request.args.get('boxHeight', 1)),
        float(request.args.get('extra_box_width', 0)),
        float(request.args.get('y_margin', 1))
    )
    xpos = float(request.args.get('xpos', 1))
    x_ampl = float(request.args.get('x_ampl', 1))

    # Set graph-specific values
    graph = GRAPH(
        req.box_height - 2 * req.y_margin,
        (req.box_height - req.y_margin * 2) / 8,
        req.ypos + req.box_height - req.y_margin,
        req.ypos + 1.5 * req.box_height
    )

    parsed_region = parse_region_str(req.region)
    if not parsed_region:
        print('No parsed region')
        return abort(416)

    res, chrom, start_pos, end_pos = parsed_region

    # Move start position and end_pos to positive values
    if start_pos != 'None' and int(start_pos) < 0:
        end_pos += start_pos
        start_pos = 0

    # Handle X and Y chromosome input
    if chrom == '23':
        chrom = 'X'
    elif chrom == '24':
        chrom = 'Y'

    # If no range is defined, fetch all available data
    if end_pos == 'None':
        new_start_pos = None
        new_end_pos = None
        left_extra_width = 0
        extra_box_width = 0
    else:
        # Add extra data to edges
        new_start_pos = int(start_pos - extra_box_width * ((end_pos - start_pos) / x_ampl)) \
            if start_pos > 0 else 0
        new_end_pos = int(end_pos + extra_box_width * ((end_pos - start_pos) / x_ampl))
        left_extra_width = extra_box_width

        # No extra data
        if new_start_pos == 0:
            left_extra_width = 0
        # Move negative position to zero
        elif new_start_pos < 0:
            new_start_pos = 0
            left_extra_width = start_pos / ((end_pos - start_pos) / x_ampl)
            if left_extra_width < 0:
                left_extra_width = 0

    # X ampl contains the total width to plot x data on
    x_ampl += left_extra_width + extra_box_width
    x_ampl = x_ampl / (new_end_pos - new_start_pos)
    xpos -= left_extra_width

    return REGION(res, chrom, start_pos, end_pos), req, graph, xpos, x_ampl, \
            start_pos, new_start_pos, new_end_pos, left_extra_width

@APP.route('/_getoverviewcov', methods=['GET'])
def get_overview_cov():
    '''
    Reads and computes LogR and BAF values for overview graph
    '''

    region, req, graph, xpos, x_ampl, start_pos, new_start_pos, new_end_pos, \
            left_extra_width = get_request_var()

    # Fetch data with the defined range
    logr_list = list(tabix_query(COV_FILE, region.res + '_' + region.chrom,
                                 new_start_pos, new_end_pos))
    baf_list = list(tabix_query(BAF_FILE, region.chrom, new_start_pos, new_end_pos))

    if not logr_list or not baf_list:
        print('Data for chromosome {} not available'.format(region.chrom))
        return abort(Response('Data for chromosome {} not available'.format(region.chrom)))

    # Set end position now that data is loaded
    if not new_end_pos:
        start_pos = new_start_pos = 0
        end_pos = new_end_pos = max(int(logr_list[len(logr_list) - 1][1]),
                                    int(baf_list[len(baf_list) - 1][1]))
    print(end_pos)

    #  Normalize and calculate the Log R Ratio
    logr_records = []
    for record in logr_list:
        logr_records.extend([xpos + x_ampl * (float(record[1]) - new_start_pos),
                             graph.logr_ypos - graph.logr_ampl *
                             math.log(float(record[3]) / req.median + 1, 2), 0])

    # Gather the BAF records
    baf_records = []
    for record in baf_list:
        baf_records.extend([xpos + x_ampl * (float(record[1]) - new_start_pos),
                            graph.baf_ypos - graph.baf_ampl * float(record[3]), 0])

    if not logr_records or not baf_records:
        print('No records')
        return abort(404)

    return jsonify(data=logr_records, baf=baf_records, status="ok",
                   chrom=region.chrom, x_pos=xpos + left_extra_width, y_pos=req.ypos,
                   start=start_pos, end=end_pos, left_extra_width=left_extra_width)

### Help functions ###

def parse_region_str(region):
    '''
    Parses a region string
    '''
    try:
        if ":" in region and "-" in region:
            chrom, pos_range = region.split(':')
            pos = pos_range.split('-')

            # Wrong format
            if len(pos) > 3:
                raise ValueError
            # Negative start position
            if pos[0] == '':
                start_pos = 0
                end_pos = int(pos[2]) + int(pos[1])
            # Positive values and correct format
            else:
                start_pos, end_pos = pos
        else:
            chrom, start_pos, end_pos = region.split()
    except ValueError:
        return None
    chrom.replace('chr', '')

    if end_pos == 'None':
        resolution = 'a'
    else:
        start_pos = int(start_pos)
        end_pos = int(end_pos)
        if start_pos < 0:
            start_pos = 0
        size = end_pos - start_pos

        resolution = 'd'
        if size > 25000000:
            resolution = 'a'
        elif size > 3000000:
            resolution = 'b'
        elif size > 200000:
            resolution = 'c'

    return resolution, chrom, start_pos, end_pos

def tabix_query(filename, chrom, start=None, end=None):
    """Call tabix and generate an array of strings for each line it returns."""
    if not start and not end:
        query = chrom
    else:
        query = '{}:{}-{}'.format(chrom, start, end)
    try:
        process = Popen(['tabix', '-f', filename, query], stdout=PIPE)
    except CalledProcessError:
        print('Could not open ' + filename)
    else:
        for line in process.stdout:
            yield line.strip().decode('utf-8').split()

def test_get_cov(xpos, ypos, region, x_ampl, baf_ampl, logr_ampl, baf_ypos,
                 logr_ypos, extra_box_width):
    '''
    Function for mocking if data is not present,
    only for test purposes
    '''
    parsed_region = parse_region_str(region)
    left_extra_width = 0
    if not parsed_region:
        return abort(416)

    _, chrom, start_pos, end_pos = parsed_region
    if not end_pos or end_pos == 'None':
        end_pos = 200000
    start_pos = int(start_pos)

    logr_records = []
    baf_records = []
    intensity = 0.0

    # Handle X and Y chromosome input
    if chrom == '23':
        chrom = 'X'
    elif chrom == '24':
        chrom = 'Y'

    # If no range is defined, fetch all available data
    if end_pos == 'None':
        new_start_pos = start_pos
        new_end_pos = 200000
        left_extra_width = 0
        extra_box_width = 0
    else:
        # Add extra data to edges
        new_start_pos = int(start_pos - extra_box_width * ((end_pos - start_pos) / x_ampl)) if start_pos > 0 else 0
        new_end_pos = int(end_pos + extra_box_width * ((end_pos - start_pos) / x_ampl))
        left_extra_width = extra_box_width

        # No extra data
        if new_start_pos == 0:
            left_extra_width = 0
        # Move negative position to zero
        elif new_start_pos < 0:
            new_start_pos = 0
            left_extra_width = start_pos / ((end_pos - start_pos) / x_ampl)
            if left_extra_width < 0:
                left_extra_width = 0

    x_ampl += left_extra_width + extra_box_width
    x_ampl = x_ampl / (new_end_pos - new_start_pos)
    xpos -= left_extra_width

    for i in range(int(start_pos), int(end_pos), 100):
        if (i == 140000):
            intensity = 1
        logr_records.extend([xpos + x_ampl * (i - new_start_pos),
                             logr_ypos - logr_ampl * intensity, 0])
        baf_records.extend([xpos + x_ampl * (i - new_start_pos),
                            baf_ypos - baf_ampl * intensity, 0])


    return jsonify(data=logr_records, baf=baf_records, status="ok",
                   chrom=chrom, x_pos=xpos + left_extra_width, y_pos=ypos,
                   start=start_pos, end=end_pos, left_extra_width=left_extra_width)
