#!/usr/bin/python3
'''
Whole genome visualization of BAF and log R ratio
'''

import json
import math
from subprocess import Popen, PIPE, CalledProcessError
from collections import namedtuple
from flask import Flask, request, render_template, jsonify, abort, Response
from pymongo import MongoClient

APP = Flask(__name__)
APP.config['JSONIFY_PRETTYPRINT_REGULAR'] = False

CLIENT = MongoClient()
COVIZ_DB = CLIENT['coviz']

GRAPH = namedtuple('graph', ('baf_ampl', 'logr_ampl', 'baf_ypos', 'logr_ypos'))
REGION = namedtuple('region', ('res', 'chrom', 'start_pos', 'end_pos'))
REQUEST = namedtuple('request', ('region', 'median', 'x_pos', 'y_pos',
                                 'box_height', 'y_margin', 'baf_y_start',
                                 'baf_y_end', 'logr_y_start', 'logr_y_end'))

SAMPLE_FILE = '/trannel/proj/wgs/sentieon/bam/sample_data.json'
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
    with open(SAMPLE_FILE) as data_file:
        sample_data = json.load(data_file)
    median = float(sample_data['median_depth'])
    sample_name = sample_data['sample_name']

    return render_template('cov.html', chrom=chrom, start=start_pos, end=end_pos,
                           call_chrom=call_chrom, call_start=call_start,
                           call_end=call_end, median=median, sample_name=sample_name)

# Set graph-specific values
def set_graph_values(box_height, ypos, y_margin):
    '''
    Returns graph-specific values as named tuple
    '''
    return GRAPH(
        box_height - 2 * y_margin,
        (box_height - y_margin * 2) / 8,
        ypos + box_height - y_margin,
        ypos + 1.5 * box_height
    )

def set_region_values(parsed_region, x_ampl):
    '''
    Sets region values
    '''
    extra_box_width = float(request.args.get('extra_box_width', 0))
    res, chrom, start_pos, end_pos = parsed_region

    # Move negative start and end position to positive values
    if start_pos != 'None' and int(start_pos) < 0:
        end_pos += start_pos
        start_pos = 0

    # Handle X and Y chromosome input
    if chrom == '23':
        chrom = 'X'
    elif chrom == '24':
        chrom = 'Y'


    # If no range is defined, set to fetch all available data
    if end_pos == 'None':
        new_start_pos = new_end_pos = None
        extra_box_width = 0
    else:
        # Add extra data to edges
        new_start_pos = int(start_pos - extra_box_width * ((end_pos - start_pos) / x_ampl))
        new_end_pos = int(end_pos + extra_box_width * ((end_pos - start_pos) / x_ampl))

    x_ampl += 2 * extra_box_width
    return REGION(res, chrom, start_pos, end_pos), \
           new_start_pos, new_end_pos, x_ampl, extra_box_width

def load_data(reg, new_start_pos, new_end_pos, x_ampl):
    '''
    Loads in data for LogR and BAF
    '''
    # Fetch data with the defined range
    logr_list = list(tabix_query(COV_FILE, reg.res + '_' + reg.chrom,
                                 new_start_pos, new_end_pos))
    baf_list = list(tabix_query(BAF_FILE, reg.chrom, new_start_pos, new_end_pos))

    if not new_start_pos and not logr_list and not baf_list:
        print('Data for chromosome {} not available'.format(reg.chrom))
        return abort(Response('Data for chromosome {} not available'.format(reg.chrom)))

    # Set end position now that data is loaded
    if not new_end_pos:
        new_start_pos = 0
        if logr_list:
            new_end_pos = int(logr_list[len(logr_list) - 1][1])
        if baf_list:
            new_end_pos = max(new_end_pos, int(baf_list[len(baf_list) - 1][1]))

    # X ampl contains the total width to plot x data on
    x_ampl = x_ampl / (new_end_pos - new_start_pos)
    return logr_list, baf_list, new_start_pos, x_ampl

def set_data(graph, req, logr_list, baf_list, x_pos, new_start_pos, x_ampl, median):
    '''
    Edits data for LogR and BAF
    '''
    #  Normalize and calculate the Log R Ratio
    logr_records = []
    for record in logr_list:
        # Cap values to end points
        ypos = math.log((float(record[3]) + 1) / median, 2)
        ypos = req.logr_y_start + 0.2 if ypos > req.logr_y_start else ypos
        ypos = req.logr_y_end - 0.2 if ypos < req.logr_y_end else ypos

        logr_records.extend([x_pos + x_ampl * (float(record[1]) - new_start_pos),
                             graph.logr_ypos - graph.logr_ampl * ypos, 0])

    # Gather the BAF records
    baf_records = []
    for record in baf_list:
        ypos = req.baf_y_start + 0.2 if ypos > req.baf_y_start else ypos
        ypos = req.baf_y_end - 0.2 if ypos < req.baf_y_end else ypos
        baf_records.extend([x_pos + x_ampl * (float(record[1]) - new_start_pos),
                            graph.baf_ypos - graph.baf_ampl * float(record[3]), 0])

    return logr_records, baf_records

@APP.route('/_getoverviewcov', methods=['GET'])
def get_overview_cov():
    '''
    Reads and computes LogR and BAF values for overview graph
    '''
    req = REQUEST(
        request.args.get('region', '1:100000-200000'),
        float(request.args.get('median', 1)),
        float(request.args.get('xpos', 1)),
        float(request.args.get('ypos', 1)),
        float(request.args.get('boxHeight', 1)),
        float(request.args.get('y_margin', 1)),
        float(request.args.get('baf_y_start', 0)),
        float(request.args.get('baf_y_end', 0)),
        float(request.args.get('logr_y_start', 0)),
        float(request.args.get('logr_y_end', 0))
    )
    x_ampl = float(request.args.get('x_ampl', 1))

    graph = set_graph_values(req.box_height, req.y_pos, req.y_margin)

    parsed_region = parse_region_str(req.region)
    if not parsed_region:
        print('No parsed region')
        return abort(416)

    reg, new_start_pos, new_end_pos, x_ampl, extra_box_width = \
        set_region_values(parsed_region, x_ampl)

    logr_list, baf_list, new_start_pos, x_ampl = load_data(reg, new_start_pos,
                                                           new_end_pos, x_ampl)
    logr_records, baf_records = set_data(graph, req, logr_list, baf_list,
                                         req.x_pos - extra_box_width, new_start_pos,
                                         x_ampl, req.median)

    if not new_start_pos and not logr_records and not baf_records:
        print('No records')
        return abort(404)

    return jsonify(data=logr_records, baf=baf_records, status="ok",
                   chrom=reg.chrom, x_pos=req.x_pos, y_pos=req.y_pos,
                   start=reg.start_pos, end=reg.end_pos)

@APP.route('/_saveannotation', methods=['GET'])
def save_annotation():
    '''
    Inserts annotation into database
    '''
    text = request.args.get('text', None)
    x_pos = float(request.args.get('xPos', 1))
    y_pos = float(request.args.get('yPos', 1))
    chrom = request.args.get('chrom', None)
    baf = request.args.get('baf', None)
    sample_name = request.args.get('sample_name', None)

    if sample_name is None or chrom is None:
        return abort(404)

    # Set collection
    collection = COVIZ_DB[sample_name]

    # Check that record does not already exist
    update = collection.update_one({'x': int(x_pos), 'y': y_pos,
                                    'chrom': chrom}, {'$set': {'text': text}})
    if update.matched_count == 0:
        # Insert new record
        collection.insert_one({
            'text': text,
            'x': int(x_pos),
            'y': y_pos,
            'chrom': chrom,
            'baf': baf
        })

    return jsonify(status='ok')

@APP.route('/_removeannotation', methods=['GET'])
def remove_annotation():
    '''
    Inserts annotation into database
    '''
    x_pos = int(float(request.args.get('xPos', 1)))
    y_pos = float(request.args.get('yPos', 1))
    chrom = request.args.get('chrom', None)
    x_distance = float(request.args.get('x_distance', 0))
    y_distance = float(request.args.get('y_distance', 0))
    text = request.args.get('text', None)
    sample_name = request.args.get('sample_name', None)

    if sample_name is None or chrom is None or text is None:
        return abort(404)

    # Set collection
    collection = COVIZ_DB[sample_name]

    # Check that record does not already exist
    collection.remove({'x': {'$gte': x_pos - x_distance, '$lte': x_pos + x_distance},
                       'y': {'$gte': y_pos - y_distance, '$lte': y_pos + y_distance},
                       'text': text, 'chrom': chrom})
    return jsonify(status='ok')

@APP.route('/_loadannotation', methods=['GET'])
def load_annotation():
    '''
    Loads annotations within requested range
    '''
    # Load from mongo database
    sample_name = request.args.get('sample_name', None)
    region = request.args.get('region', None)

    if sample_name is None or region is None:
        return abort(404)

    collection = COVIZ_DB[sample_name]
    _, chrom, start_pos, end_pos = parse_region_str(region)

    annotations = list(collection.find({'x': {'$gte': start_pos, '$lte': end_pos},
                                        'chrom': chrom}, {'_id': False}))

    return jsonify(status='ok', annotations=annotations)

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
    """
    Call tabix and generate an array of strings for each line it returns.
    """
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
            yield line.strip().split()
