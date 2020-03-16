#!/usr/bin/python3
'''
Whole genome visualization of BAF and log2 ratio
'''

import re
from subprocess import Popen, PIPE, CalledProcessError
from collections import namedtuple
from os import path, walk
from datetime import date
from flask import Flask, request, render_template, jsonify, abort, Response
from pymongo import MongoClient

APP = Flask(__name__)
APP.config['JSONIFY_PRETTYPRINT_REGULAR'] = False

CLIENT = MongoClient('10.0.224.63', 27017)
GENS_DB = CLIENT['gens']

GRAPH = namedtuple('graph', ('baf_ampl', 'log2_ampl', 'baf_ypos', 'log2_ypos'))
REGION = namedtuple('region', ('res', 'chrom', 'start_pos', 'end_pos'))
REQUEST = namedtuple('request', ('region', 'x_pos', 'y_pos', 'plot_height',
                                 'top_bottom_padding', 'baf_y_start', 'baf_y_end',
                                 'log2_y_start', 'log2_y_end'))

CHROMOSOMES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
               '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21',
               '22', 'X', 'Y']

FILE_DIR_HG37 = "/access/wgs/plotdata/"
FILE_DIR_HG38 = "/access/wgs/plotdata/hg38/"
BAF_END = '.baf.bed.gz'
COV_END = '.cov.bed.gz'

@APP.route('/', defaults={'sample_name': ''})
@APP.route('/<path:sample_name>', methods=['GET'])
def coverage_view(sample_name):
    '''
    Renders the first coverage view
    '''
    if not sample_name:
        print('No sample requested')
        abort(404)

    # Set whether to get HG37 och HG38 files
    hg_filedir, hg_type = get_hg_type()

    # Check that BAF and Log2 file exists
    if not path.exists(hg_filedir + sample_name + BAF_END):
        print('BAF file not found')
        abort(404)
    if not path.exists(hg_filedir + sample_name + COV_END):
        print('Log2 file not found')
        abort(404)

    region = request.args.get('region', None)
    print_page = request.args.get('print_page', 'false')
    if not region:
        region = request.form.get('region', '1:100000-200000')

    parsed_region = parse_region_str(region)
    if not parsed_region:
        return abort(416)

    _, chrom, start_pos, end_pos = parsed_region

    # Handle X and Y chromosome input
    if chrom == '23':
        chrom = 'X'
    elif chrom == '24':
        chrom = 'Y'

    return render_template('cov.html', chrom=chrom, start=start_pos, end=end_pos,
                           sample_name=sample_name, hg_type=hg_type,
                           last_updated=dir_last_updated('static'),
                           print_page=print_page, todays_date=date.today())

@APP.route('/_getcoverage', methods=['GET'])
def get_coverage():
    '''
    Reads and formats Log2 ratio and BAF values for overview graph
    Returns the coverage for frontend rendering
    '''
    req = REQUEST(
        request.args.get('region', '1:100000-200000'),
        float(request.args.get('xpos', 1)),
        float(request.args.get('ypos', 1)),
        float(request.args.get('plot_height', 1)),
        float(request.args.get('top_bottom_padding', 1)),
        float(request.args.get('baf_y_start', 0)),
        float(request.args.get('baf_y_end', 0)),
        float(request.args.get('log2_y_start', 0)),
        float(request.args.get('log2_y_end', 0))
    )
    x_ampl = float(request.args.get('x_ampl', 1))

    graph = set_graph_values(req)

    parsed_region = parse_region_str(req.region)
    if not parsed_region:
        print('No parsed region')
        return abort(416)

    reg, new_start_pos, new_end_pos, x_ampl, extra_plot_width = \
        set_region_values(parsed_region, x_ampl)

    log2_list, baf_list, new_start_pos, x_ampl = load_data(reg, new_start_pos,
                                                           new_end_pos, x_ampl)
    log2_records, baf_records = set_data(graph, req, log2_list, baf_list,
                                         req.x_pos - extra_plot_width, new_start_pos,
                                         x_ampl)

    if not new_start_pos and not log2_records and not baf_records:
        print('No records')
        return abort(404)

    return jsonify(data=log2_records, baf=baf_records, status="ok",
                   chrom=reg.chrom, x_pos=req.x_pos, y_pos=req.y_pos,
                   start=reg.start_pos, end=reg.end_pos)

@APP.route('/_overviewchromdim', methods=['GET'])
def call_overview_chrom_dim():
    '''
    Returns current chromosome and its dimensions
    relative to the overview graph
    '''
    x_pos = float(request.args.get('x_pos', 0))
    y_pos = float(request.args.get('y_pos', 0))
    plot_height = float(request.args.get('plot_height', 0))
    full_plot_width = float(request.args.get('full_plot_width', 0))
    margin = float(request.args.get('margin', 0))
    current_x = request.args.get('current_x', None)
    current_y = request.args.get('current_y', None)
    current_chrom = None

    chrom_dims = overview_chrom_dim(x_pos, y_pos, full_plot_width)

    if current_x and current_y:
        current_chrom = find_chrom_at_pos(chrom_dims, 2 * plot_height,
                                          float(current_x), float(current_y),
                                          margin)

    return jsonify(status='ok', chrom_dims=chrom_dims, \
                   current_chrom=current_chrom)

@APP.route('/_gettrackdata', methods=['GET'])
def get_track_data():
    '''
    Gets track data in region and converts data coordinates to screen coordinates
    '''
    region = request.args.get('region', None)
    collapsed = request.args.get('collapsed', None)

    res, chrom, start_pos, end_pos = parse_region_str(region)

    if region is None:
        print('Could not find track data in DB')
        return abort(404)

    # Do not show annotations at 'a'-resolution
    if not res or res == 'a':
        return jsonify(status='ok', tracks=[], start_pos=start_pos,
                       end_pos=end_pos, max_height_order=0)

    _, hg_type = get_hg_type()
    collection = GENS_DB['tracks' + hg_type]

    # Get tracks within span [start_pos, end_pos] or tracks that go over the span
    if collapsed == 'true':
        tracks = collection.find({'chrom': chrom,
                                  'height_order': 1,
                                  '$or': [{'start': {'$gte': start_pos,
                                                     '$lte': end_pos}},
                                          {'end': {'$gte': start_pos, '$lte': end_pos}},
                                          {'$and': [{'start': {'$lte': start_pos}},
                                                    {'end': {'$gte': end_pos}}]}]},
                                 {'_id': False}, sort=[('start', 1)])
    else:
        tracks = collection.find({'chrom': chrom,
                                  '$or': [{'start': {'$gte': start_pos,
                                                     '$lte': end_pos}},
                                          {'end': {'$gte': start_pos, '$lte': end_pos}},
                                          {'$and': [{'start': {'$lte': start_pos}},
                                                    {'end': {'$gte': end_pos}}]}]},
                                 {'_id': False}, sort=[('height_order', 1), ('start', 1)])
    tracks = list(tracks)
    if tracks:
        height_orders = [t['height_order'] for t in tracks]
        max_height_order = max(height_orders)
    else:
        max_height_order = 1

    return jsonify(status='ok', tracks=list(tracks), start_pos=start_pos,
                   end_pos=end_pos, max_height_order=max_height_order, res=res)

@APP.route('/_getannotationdata', methods=['GET'])
def get_annotation_data():
    '''
    Gets track data in region and converts data coordinates to screen coordinates
    '''
    region = request.args.get('region', None)
    source = request.args.get('source', None)
    hg_type = request.args.get('hg_type', None)
    collapsed = request.args.get('collapsed', None)

    if region is None or source is None:
        print('Could not find annotation data in DB')
        return abort(404)

    res, chrom, start_pos, end_pos = parse_region_str(region)

    # Do not show annotations at 'a'-resolution
    if not res or res == 'a':
        return jsonify(status='ok', tracks=[], start_pos=start_pos,
                       end_pos=end_pos, max_height_order=0)

    collection = GENS_DB['annotations']

    # Get tracks within span [start_pos, end_pos] or tracks that go over the span
    if collapsed == 'true':
        tracks = collection.find({'chrom': chrom,
                                  'source': source,
                                  'hg_type': hg_type,
                                  'height_order': 1,
                                  '$or': [{'start': {'$gte': start_pos,
                                                     '$lte': end_pos}},
                                          {'end': {'$gte': start_pos, '$lte': end_pos}},
                                          {'$and': [{'start': {'$lte': start_pos}},
                                                    {'end': {'$gte': end_pos}}]}]},
                                 {'_id': False}, sort=[('start', 1)])
    else:
        tracks = collection.find({'chrom': chrom,
                                  'source': source,
                                  'hg_type': hg_type,
                                  '$or': [{'start': {'$gte': start_pos,
                                                     '$lte': end_pos}},
                                          {'end': {'$gte': start_pos, '$lte': end_pos}},
                                          {'$and': [{'start': {'$lte': start_pos}},
                                                    {'end': {'$gte': end_pos}}]}]},
                                 {'_id': False}, sort=[('height_order', 1), ('start', 1)])
    tracks = list(tracks)
    if tracks:
        height_orders = [t['height_order'] for t in tracks]
        max_height_order = max(height_orders)
    else:
        max_height_order = 1

    return jsonify(status='ok', tracks=tracks, start_pos=start_pos,
                   end_pos=end_pos, max_height_order=max_height_order, res=res)

@APP.route('/_getannotationsources', methods=['GET'])
def get_annotation_sources():
    '''
    Returns available annotation source files
    '''
    collection = GENS_DB['annotations']
    sources = collection.distinct('source')
    return jsonify(status='ok', sources=sources)


### Help functions ###

def get_chrom_width(chrom, full_plot_width):
    '''
    Calculates overview width of chromosome
    '''
    _, hg_type = get_hg_type()
    collection = GENS_DB['chromsizes' + hg_type]
    chrom_data = collection.find_one({'chrom': chrom})

    if chrom_data:
        return full_plot_width * float(chrom_data['scale'])

    print('Chromosome width not available')
    return None

def parse_region_str(region):
    '''
    Parses a region string
    '''
    name_search = None
    try:
        if ':' in region:
            chrom, pos_range = region.split(':')
            start, end = pos_range.split('-')
            chrom.replace('chr', '')
            chrom = chrom.upper()
        else:
            name_search = region
    except ValueError:
        print('Wrong region formatting')
        return None

    _, hg_type = get_hg_type()

    if name_search is not None:
        if name_search.upper() in CHROMOSOMES:
            start = 0
            end = 'None'
            chrom = name_search.upper()
        else:
            # Lookup range
            collection = GENS_DB['tracks' + hg_type]
            start = collection.find_one({'gene_name': re.compile(
                '^' + re.escape(name_search) + '$', re.IGNORECASE)},
                                        sort=[('start', 1)])
            end = collection.find_one({'gene_name': re.compile(
                '^' + re.escape(name_search) + '$', re.IGNORECASE)},
                                      sort=[('end', -1)])
            if start is not None and end is not None:
                chrom = start['chrom']
                start = start['start']
                end = end['end']
            else:
                print('Did not find range for gene name')
                return None

    # Get end position
    collection = GENS_DB['chromsizes' + hg_type]
    chrom_data = collection.find_one({'chrom': chrom})

    if chrom_data is None:
        print('Could not find chromosome data in DB')
        return None

    if end == 'None':
        end = chrom_data['size']

    start = int(start)
    end = int(end)
    size = end - start

    if size <= 0:
        print('Invalid input span')
        return None

    # Do not go beyond end position
    if end > chrom_data['size']:
        start = max(0, start - (end - chrom_data['size']))
        end = chrom_data['size']

    resolution = 'd'
    if size > 20000000:
        resolution = 'a'
    elif size > 1800000:
        resolution = 'b'
    elif size > 500000:
        resolution = 'c'

    return resolution, chrom, start, end

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

def dir_last_updated(folder):
    '''
    Returns last updated date of a folder
    '''
    return str(max(path.getmtime(path.join(root_path, f))
                   for root_path, dirs, files in walk(folder)
                   for f in files))

def get_hg_type():
    '''
    Returns whether to fetch files of type HG37 or HG38
    HG38 is default
    '''
    hg_type = request.args.get('hg_type', None)
    if hg_type == '38' or hg_type is None:
        return FILE_DIR_HG38, '38'
    return FILE_DIR_HG37, hg_type

# Set graph-specific values
def set_graph_values(req):
    '''
    Returns graph-specific values as named tuple
    '''
    log2_height = abs(req.log2_y_end - req.log2_y_start)
    baf_height = abs(req.baf_y_end - req.baf_y_start)
    return GRAPH(
        (req.plot_height - 2 * req.top_bottom_padding) / baf_height,
        (req.plot_height - req.top_bottom_padding * 2) / log2_height,
        req.y_pos + req.plot_height - req.top_bottom_padding,
        req.y_pos + 1.5 * req.plot_height
    )

def set_region_values(parsed_region, x_ampl):
    '''
    Sets region values
    '''
    extra_plot_width = float(request.args.get('extra_plot_width', 0))
    res, chrom, start_pos, end_pos = parsed_region

    if request.args.get('overview', False):
        res = 'o'

    # Move negative start and end position to positive values
    if start_pos != 'None' and int(start_pos) < 0:
        end_pos += start_pos
        start_pos = 0

    # Handle X and Y chromosome input
    if chrom == '23':
        chrom = 'X'
    elif chrom == '24':
        chrom = 'Y'

    # Add extra data to edges
    new_start_pos = int(start_pos - extra_plot_width *
                        ((end_pos - start_pos) / x_ampl))
    new_end_pos = int(end_pos + extra_plot_width *
                      ((end_pos - start_pos) / x_ampl))

    x_ampl += 2 * extra_plot_width
    return REGION(res, chrom, start_pos, end_pos), \
           new_start_pos, new_end_pos, x_ampl, extra_plot_width

def load_data(reg, new_start_pos, new_end_pos, x_ampl):
    '''
    Loads in data for Log2 and BAF
    '''
    sample_name = request.args.get('sample_name', None)

    # Set whether to get HG37 och HG38 files
    hg_filedir, _ = get_hg_type()

    # Fetch data with the defined range
    log2_list = list(tabix_query(hg_filedir + sample_name + COV_END,
                                 reg.res + '_' + reg.chrom,
                                 new_start_pos, new_end_pos))
    baf_list = list(tabix_query(hg_filedir + sample_name + BAF_END,
                                reg.res + '_' + reg.chrom,
                                new_start_pos, new_end_pos))

    if not new_start_pos and not log2_list and not baf_list:
        print('Data for chromosome {} not available'.format(reg.chrom))
        return abort(Response('Data for chromosome {} not available'.format(reg.chrom)))

    # Set end position now that data is loaded
    if not new_end_pos:
        new_start_pos = 0
        if log2_list:
            new_end_pos = int(log2_list[len(log2_list) - 1][1])
        if baf_list:
            new_end_pos = max(new_end_pos, int(baf_list[len(baf_list) - 1][1]))

    # X ampl contains the total width to plot x data on
    x_ampl = x_ampl / (new_end_pos - new_start_pos)
    return log2_list, baf_list, new_start_pos, x_ampl

def set_data(graph, req, log2_list, baf_list, x_pos, new_start_pos, x_ampl):
    '''
    Edits data for Log2 ratio and BAF
    '''
    #  Normalize and calculate the Lo2 ratio
    log2_records = []
    for record in log2_list:
        # Cap values to end points
        ypos = float(record[3])
        ypos = req.log2_y_start + 0.2 if ypos > req.log2_y_start else ypos
        ypos = req.log2_y_end - 0.2 if ypos < req.log2_y_end else ypos

        log2_records.extend([x_pos + x_ampl * (float(record[1]) - new_start_pos),
                             graph.log2_ypos - graph.log2_ampl * ypos, 0])

    # Gather the BAF records
    baf_records = []
    for record in baf_list:
        # Cap values to end points
        ypos = float(record[3])
        ypos = req.baf_y_start + 0.2 if ypos > req.baf_y_start else ypos
        ypos = req.baf_y_end - 0.2 if ypos < req.baf_y_end else ypos
        baf_records.extend([x_pos + x_ampl * (float(record[1]) - new_start_pos),
                            graph.baf_ypos - graph.baf_ampl * ypos, 0])

    return log2_records, baf_records

def find_chrom_at_pos(chrom_dims, height, current_x, current_y, margin):
    '''
    Returns which chromosome the current position belongs to in the overview graph
    '''
    current_chrom = None

    for chrom in CHROMOSOMES:
        x_pos = chrom_dims[chrom]['x_pos']
        y_pos = chrom_dims[chrom]['y_pos']
        width = chrom_dims[chrom]['width']
        if x_pos + margin <= current_x <= (x_pos + width) and \
           y_pos + margin <= current_y <= (y_pos + height):
            current_chrom = chrom
            break

    return current_chrom

def overview_chrom_dim(x_pos, y_pos, full_plot_width):
    '''
    Calculates the position for each chromosome in the overview canvas
    '''

    _, hg_type = get_hg_type()
    collection = GENS_DB['chromsizes' + hg_type]

    chrom_dims = {}
    for chrom in CHROMOSOMES:
        chrom_width = get_chrom_width(chrom, full_plot_width)
        if chrom_width is None:
            print('Could not find chromosome data in DB')
            return None

        chrom_data = collection.find_one({'chrom': chrom})
        if chrom_data is None:
            print('Could not find chromosome data in DB')
            return None

        chrom_dims[chrom] = ({'x_pos': x_pos, 'y_pos': y_pos,
                              'width': chrom_width, 'size': chrom_data['size']})

        x_pos += chrom_width

    return chrom_dims
