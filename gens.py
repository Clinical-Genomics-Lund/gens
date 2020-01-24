#!/usr/bin/python3
'''
Whole genome visualization of BAF and log R ratio
'''

import math
from subprocess import Popen, PIPE, CalledProcessError
from collections import namedtuple
from os import path
from flask import Flask, request, render_template, jsonify, abort, Response
from pymongo import MongoClient

APP = Flask(__name__)
APP.config['JSONIFY_PRETTYPRINT_REGULAR'] = False

CLIENT = MongoClient('10.0.224.63', 27017)
GENS_DB = CLIENT['gens']

GRAPH = namedtuple('graph', ('baf_ampl', 'logr_ampl', 'baf_ypos', 'logr_ypos'))
REGION = namedtuple('region', ('res', 'chrom', 'start_pos', 'end_pos'))
REQUEST = namedtuple('request', ('region', 'x_pos', 'y_pos', 'box_height',
                                 'y_margin', 'baf_y_start', 'baf_y_end',
                                 'logr_y_start', 'logr_y_end'))

FILE_DIR = "/access/wgs/plotdata/"
BAF_END = '.baf.bed.gz'
COV_END = '.cov.bed.gz'

@APP.route('/', defaults={'sample_name': ''})
@APP.route('/<path:sample_name>', methods=['GET'])
def coverage_view(sample_name):
    '''
    Method for displaying a region
    '''
    if not sample_name:
        print('No sample requested')
        abort(404)
    # Check that BAF and LogR file exists
    if not path.exists(FILE_DIR + sample_name + BAF_END):
        print('BAF file not found')
        abort(404)
    if not path.exists(FILE_DIR + sample_name + COV_END):
        print('LogR file not found')
        abort(404)

    region = request.form.get('region', '1:100000-200000')

    call_chrom = 1
    call_start = 1011000
    call_end = 1015000

    parsed_region = parse_region_str(region)
    if not parsed_region:
        return abort(416)

    _, chrom, start_pos, end_pos = parsed_region

    return render_template('cov.html', chrom=chrom, start=start_pos, end=end_pos,
                           call_chrom=call_chrom, call_start=call_start,
                           call_end=call_end, sample_name=sample_name)

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

    # Add extra data to edges
    new_start_pos = int(start_pos - extra_box_width *
                        ((end_pos - start_pos) / x_ampl))
    new_end_pos = int(end_pos + extra_box_width *
                      ((end_pos - start_pos) / x_ampl))

    x_ampl += 2 * extra_box_width
    return REGION(res, chrom, start_pos, end_pos), \
           new_start_pos, new_end_pos, x_ampl, extra_box_width

def load_data(reg, new_start_pos, new_end_pos, x_ampl):
    '''
    Loads in data for LogR and BAF
    '''
    sample_name = request.args.get('sample_name', None)

    # Fetch data with the defined range
    logr_list = list(tabix_query(FILE_DIR + sample_name + COV_END,
                                 reg.res + '_' + reg.chrom,
                                 new_start_pos, new_end_pos))
    baf_list = list(tabix_query(FILE_DIR + sample_name + BAF_END,
                                reg.res + '_' + reg.chrom,
                                new_start_pos, new_end_pos))

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

def set_data(graph, req, logr_list, baf_list, x_pos, new_start_pos, x_ampl):
    '''
    Edits data for LogR and BAF
    '''
    #  Normalize and calculate the Log R Ratio
    logr_records = []
    for record in logr_list:
        # Cap values to end points
        ypos = float(record[3])
        ypos = req.logr_y_start + 0.2 if ypos > req.logr_y_start else ypos
        ypos = req.logr_y_end - 0.2 if ypos < req.logr_y_end else ypos

        logr_records.extend([x_pos + x_ampl * (float(record[1]) - new_start_pos),
                             graph.logr_ypos - graph.logr_ampl * ypos, 0])

    # Gather the BAF records
    baf_records = []
    for record in baf_list:
        # Cap values to end points
        ypos = float(record[3])
        ypos = req.baf_y_start + 0.2 if ypos > req.baf_y_start else ypos
        ypos = req.baf_y_end - 0.2 if ypos < req.baf_y_end else ypos
        baf_records.extend([x_pos + x_ampl * (float(record[1]) - new_start_pos),
                            graph.baf_ypos - graph.baf_ampl * ypos, 0])

    return logr_records, baf_records

@APP.route('/_getoverviewcov', methods=['GET'])
def get_overview_cov():
    '''
    Reads and computes LogR and BAF values for overview graph
    '''
    req = REQUEST(
        request.args.get('region', '1:100000-200000'),
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
                                         x_ampl)

    if not new_start_pos and not logr_records and not baf_records:
        print('No records')
        return abort(404)

    return jsonify(data=logr_records, baf=baf_records, status="ok",
                   chrom=reg.chrom, x_pos=req.x_pos, y_pos=req.y_pos,
                   start=reg.start_pos, end=reg.end_pos)

@APP.route('/_saveoverviewannotation', methods=['GET'])
def save_overview_annotation():
    '''
    Inserts annotation into database
    '''
    text = request.args.get('text', None)
    x_pos = float(request.args.get('xPos', 1))
    y_pos = float(request.args.get('yPos', 1))
    sample_name = request.args.get('sample_name', None)
    top = float(request.args.get('top', 1))
    left = float(request.args.get('left', 1))
    width = float(request.args.get('width', 1))
    height = float(request.args.get('height', 1))
    y_margin = float(request.args.get('y_margin', 1))

    # Overview variables
    num_chrom = int(request.args.get('num_chrom', -1))
    right_margin = float(request.args.get('right_margin', 1))
    row_height = float(request.args.get('row_height', 1))

    if sample_name is None:
        return abort(404)

    chrom_dims = overview_chrom_dim(num_chrom, left, top, width,
                                    right_margin, row_height)
    chrom = find_chrom_at_pos(chrom_dims, num_chrom, 2 * height, x_pos,
                              y_pos, 0)
    chrom_dim = chrom_dims[int(chrom) - 1]
    x_pos, y_pos, baf = to_data_coord(x_pos, y_pos, chrom_dim['x_pos'],
                                      chrom_dim['y_pos'], 0,
                                      chrom_dim['size'],
                                      chrom_dim['width'], height,
                                      y_margin)

    # Set collection
    collection = GENS_DB[sample_name]

    # Check that record does not already exist
    update = collection.update_one({'x': int(x_pos), 'y': y_pos,
                                    'chrom': str(chrom)}, {'$set': {'text': text}})
    if update.matched_count == 0:
        # Insert new record
        collection.insert_one({
            'text': text,
            'x': int(x_pos),
            'y': y_pos,
            'chrom': str(chrom),
            'baf': baf
        })

    return jsonify(status='ok')

@APP.route('/_saveinteractiveannotation', methods=['GET'])
def save_interactive_annotation():
    '''
    Inserts annotation into database
    '''
    region = request.args.get('region', None)
    text = request.args.get('text', None)
    x_pos = float(request.args.get('xPos', 1))
    y_pos = float(request.args.get('yPos', 1))
    annot_width = float(request.args.get('annot_width', 4))
    annot_height = float(request.args.get('annot_height', 4))
    logr_height = float(request.args.get('logr_height', 1))
    baf_height = float(request.args.get('baf_height', 1))
    sample_name = request.args.get('sample_name', None)
    top = float(request.args.get('top', 1))
    left = float(request.args.get('left', 1))
    width = float(request.args.get('width', 1))
    height = float(request.args.get('height', 1))
    y_margin = float(request.args.get('y_margin', 1))

    if sample_name is None or region is None:
        return abort(404)

    _, chrom, start, end = parse_region_str(region)
    x_pos, y_pos, baf = to_data_coord(x_pos, y_pos, left, top, start,
                                      end, width, height, y_margin)
    annot_width = annot_width / (width / (end - start))

    if baf:
        annot_height = annot_height / (height / baf_height)
    else:
        annot_height = annot_height / (height / logr_height)

    # Set collection
    collection = GENS_DB[sample_name]

    # Check that record does not already exist
    update = collection.update_one({'x': int(x_pos), 'y': y_pos,
                                    'width': annot_width, 'height': annot_height,
                                    'chrom': chrom}, {'$set': {'text': text}})
    if update.matched_count == 0:
        # Insert new record
        collection.insert_one({
            'text': text,
            'x': int(x_pos),
            'y': y_pos,
            'width': annot_width,
            'height': annot_height,
            'chrom': str(chrom),
            'baf': baf
        })

    return jsonify(status='ok')

@APP.route('/_removeannotation', methods=['GET'])
def remove_annotation():
    '''
    Inserts annotation into database
    '''
    region = request.args.get('region', None)
    x_pos = int(float(request.args.get('xPos', 1)))
    y_pos = float(request.args.get('yPos', 1))
    chrom = request.args.get('chrom', None)
    text = request.args.get('text', None)
    sample_name = request.args.get('sample_name', None)
    overview = request.args.get('overview', 'false')
    top = float(request.args.get('top', 1))
    left = float(request.args.get('left', 1))
    width = float(request.args.get('width', 1))
    height = float(request.args.get('height', 1))
    y_margin = float(request.args.get('y_margin', 1))
    start = float(request.args.get('start', 1))
    end = float(request.args.get('end', 1))

    # Overview variables
    num_chrom = int(request.args.get('num_chrom', -1))
    right_margin = float(request.args.get('right_margin', 1))
    row_height = float(request.args.get('row_height', 1))

    if sample_name is None or text is None:
        return abort(404)

    if overview == 'true':
        chrom_dims = overview_chrom_dim(num_chrom, left, top, width, right_margin,
                                        row_height)
        chrom = find_chrom_at_pos(chrom_dims, num_chrom, 2 * height, x_pos, y_pos, 0)

        if not chrom:
            return abort(404)

        chrom_dim = chrom_dims[int(chrom) - 1]
        x_diff, y_diff, _ = to_data_coord(x_pos + 1, y_pos + 1, chrom_dim['x_pos'],
                                          chrom_dim['y_pos'], 0,
                                          chrom_dim['size'],
                                          chrom_dim['width'], height,
                                          y_margin)
        x_pos, y_pos, _ = to_data_coord(x_pos, y_pos, chrom_dim['x_pos'],
                                        chrom_dim['y_pos'], 0,
                                        chrom_dim['size'],
                                        chrom_dim['width'], height,
                                        y_margin)
    else:
        _, chrom, start, end = parse_region_str(region)
        x_diff, y_diff, _ = to_data_coord(x_pos + 1, y_pos + 1, left, top, start,
                                          end, width, height, y_margin)
        x_pos, y_pos, _ = to_data_coord(x_pos, y_pos, left, top, start,
                                        end, width, height, y_margin)

    # Set collection
    collection = GENS_DB[sample_name]

    # Check that record does not already exist
    x_distance = abs(x_diff - x_pos)
    y_distance = abs(y_diff - y_pos)
    collection.remove({'x': {'$gte': x_pos - x_distance,
                             '$lte': x_pos + x_distance},
                       'y': {'$gte': y_pos - y_distance,
                             '$lte': y_pos + y_distance},
                       'text': text, 'chrom': str(chrom)})
    return jsonify(status='ok')

@APP.route('/_loadallannotations', methods=['GET'])
def load_all_annotations():
    '''
    Loads all available annotations for the sample
    '''
    sample_name = request.args.get('sample_name', None)
    num_chrom = int(request.args.get('num_chrom', -1))
    left = float(request.args.get('left', 1))
    top = float(request.args.get('top', 1))
    width = float(request.args.get('width', 1))
    height = float(request.args.get('height', 1))
    row_height = float(request.args.get('row_height', 1))
    right_margin = float(request.args.get('right_margin', 1))
    y_margin = float(request.args.get('y_margin', 1))
    chrom_dims = overview_chrom_dim(num_chrom, left, top, width, right_margin,
                                    row_height)
    collection = GENS_DB[sample_name]

    all_annotations = []
    for chrom in range(1, num_chrom + 1):
        chrom_dim = chrom_dims[chrom - 1]
        annotations = list(collection.find({'x': {'$gte': 0,
                                                  '$lte': int(chrom_dim['size'])},
                                            'chrom': str(chrom)},
                                           {'_id': False}))
        for annotation in annotations:
            annotation['x'], annotation['y'] = \
                to_screen_coord(annotation['x'],
                                annotation['y'],
                                annotation['baf'], chrom_dim['x_pos'],
                                chrom_dim['y_pos'], 0,
                                chrom_dim['size'], chrom_dim['width'],
                                height, y_margin)
        if annotations:
            all_annotations = all_annotations + annotations

    return jsonify(status='ok', annotations=all_annotations)

@APP.route('/_loadannotationrange', methods=['GET'])
def load_annotation_range():
    '''
    Loads annotations within requested range
    '''
    # Load from mongo database
    sample_name = request.args.get('sample_name', None)
    region = request.args.get('region', None)
    top = float(request.args.get('top', 1))
    left = float(request.args.get('left', 1))
    width = float(request.args.get('width', 1))
    height = float(request.args.get('height', 1))
    logr_height = float(request.args.get('logr_height', 1))
    baf_height = float(request.args.get('baf_height', 1))
    y_margin = float(request.args.get('y_margin', 1))

    if sample_name is None or region is None:
        return abort(404)

    collection = GENS_DB[sample_name]
    _, chrom, start_pos, end_pos = parse_region_str(region)

    annotations = list(collection.find({'x': {'$gte': start_pos,
                                              '$lte': end_pos},
                                        'chrom': str(chrom)},
                                       {'_id': False}))
    for annotation in annotations:
        annotation['x'], annotation['y'] = \
                to_screen_coord(annotation['x'], annotation['y'],
                                annotation['baf'], left, top, start_pos,
                                end_pos, width, height, y_margin)
        annotation['width'] = annotation['width'] * (width / (end_pos - start_pos))
        if annotation['baf'] == 'true':
            annotation['height'] = float(annotation['height']) * (height / baf_height)
        else:
            annotation['height'] = float(annotation['height']) * (height / logr_height)

    return jsonify(status='ok', annotations=annotations)

def to_data_coord(screen_x_pos, screen_y_pos, left, top, start, end, width,
                  height, y_margin):
    '''
    Convert screen coordinates to data coordinates
    '''
    # Calculate x position
    x_pos = start + (end - start) * ((screen_x_pos - left) / width)
    if screen_y_pos <= (top + height):
        # Calculate y position for BAF
        y_pos = (top + height - y_margin - screen_y_pos) / (height - 2 * y_margin)
        return [x_pos, y_pos, 'true']
    else:
        # Calculate y position for LogR
        y_pos = (top + 1.5 * height - screen_y_pos) / (height - 2 * y_margin)
        return [x_pos, y_pos, 'false']

def to_screen_coord(data_x_pos, data_y_pos, baf, left, top, start, end,
                    width, height, y_margin):
    '''
    Convert data coordinates to screen coordinates
    '''
    x_pos = width * (data_x_pos - start) / (end - start) + left
    if baf == 'true':
        # Calculate y position for BAF
        y_pos = top + height - y_margin - data_y_pos * (height - 2 * y_margin)
        return [x_pos, y_pos]
    else:
        # Calculate y position for LogR
        y_pos = top + 1.5 * height - data_y_pos * (height - 2 * y_margin)
        return [x_pos, y_pos]

@APP.route('/_overviewchromdim', methods=['GET'])
def call_overview_chrom_dim():
    num_chrom = int(request.args.get('num_chrom', 0))
    x_pos = float(request.args.get('x_pos', 0))
    y_pos = float(request.args.get('y_pos', 0))
    box_width = float(request.args.get('box_width', 0))
    box_height = float(request.args.get('box_height', 0))
    right_margin = float(request.args.get('right_margin', 0))
    row_height = float(request.args.get('row_height', 0))
    margin = float(request.args.get('margin', 0))
    current_x = request.args.get('current_x', None)
    current_y = request.args.get('current_y', None)
    current_chrom = None

    chrom_dims = overview_chrom_dim(num_chrom, x_pos, y_pos, box_width, right_margin,
                                    row_height)

    if current_x and current_y:
        current_chrom = find_chrom_at_pos(chrom_dims, num_chrom,
                                          2 * box_height, float(current_x),
                                          float(current_y), margin)

    return jsonify(status='ok', chrom_dims=chrom_dims, \
                   current_chrom=current_chrom)

def find_chrom_at_pos(chrom_dims, num_chrom, height, current_x, current_y, margin):
    '''
    Returns the related chromosome to the position
    '''
    current_chrom = None

    for chrom in range(1, int(num_chrom) + 1):
        x_pos = chrom_dims[chrom - 1]['x_pos']
        y_pos = chrom_dims[chrom - 1]['y_pos']
        width = chrom_dims[chrom - 1]['width']
        if x_pos + margin <= current_x <= (x_pos + width) and \
           y_pos + margin <= current_y <= (y_pos + height):
            current_chrom = chrom
            break

    return current_chrom

def overview_chrom_dim(num_chrom, x_pos, y_pos, box_width, right_margin,
                       row_height):
    '''
    Calculates the position for each chromosome in the overview canvas
    '''

    collection = GENS_DB['chromsizes']

    first_x_pos = x_pos
    chrom_dims = []
    for chrom in range(1, num_chrom + 1):
        chrom_width = get_chrom_width(chrom, box_width)
        chrom_data = collection.find_one({'chrom': str(chrom)})
        chrom_dims.append({'x_pos': x_pos, 'y_pos': y_pos,
                           'width': chrom_width, 'size': chrom_data['size']})

        x_pos += chrom_width
        if x_pos > right_margin:
            y_pos += row_height
            x_pos = first_x_pos

    return chrom_dims

@APP.route('/_gettrackdata', methods=['GET'])
def get_track_data():
    '''
    Gets track data in region and converts data coordinates to screen coordinates
    '''
    region = request.args.get('region', None)

    res, chrom, start_pos, end_pos = parse_region_str(region)

    if res in ('a', 'b'):
        return jsonify(status='ok', tracks=[], start_pos=start_pos,
                       end_pos=end_pos, max_height_order=0)

    collection = GENS_DB['tracks']

    # Get tracks within span [start_pos, end_pos]
    tracks = collection.find({'seqname': str(chrom),
                              '$or': [{'start': {'$gte': start_pos, '$lte': end_pos}},
                                      {'end': {'$gte': start_pos, '$lte': end_pos}}]},
                             {'_id': False})

    # Get tracks that go over the whole span
    tracks_over = collection.find({'seqname': str(chrom),
                                   'start': {'$lte': start_pos},
                                   'end': {'$gte': end_pos}},
                                  {'_id': False})

    tracks = list(tracks) + list(tracks_over)

    max_height_order = 1
    for track in tracks:
        if track['height_order'] > max_height_order:
            max_height_order = track['height_order']

    return jsonify(status='ok', tracks=tracks, start_pos=start_pos,
                   end_pos=end_pos, max_height_order=max_height_order, res=res)


### Help functions ###

def get_chrom_width(chrom, full_width):
    '''
    Calculates overview width of chromosome
    '''
    collection = GENS_DB['chromsizes']
    chrom_data = collection.find_one({'chrom': str(chrom)})

    if chrom_data:
        chrom_width = full_width * float(chrom_data['scale'])

        return chrom_width

    print('Chromosome width not available')
    return full_width, full_width

def parse_region_str(region):
    '''
    Parses a region string
    '''
    try:
        if ":" in region and "-" in region:
            chrom, pos_range = region.split(':')
            start, end = pos_range.split('-')
        else:
            chrom, start, end = region.split()
    except ValueError:
        return None
    chrom.replace('chr', '')

    # Get end position
    collection = GENS_DB['chromsizes']
    chrom_data = collection.find_one({'chrom': str(chrom)})

    if end == 'None':
        end = chrom_data['size']

    start = int(start)
    end = int(end)
    size = end - start

    # Do not go beyond end position
    if end > chrom_data['size']:
        start = max(0, start - size)
        end = chrom_data['size']

    resolution = 'd'
    if size > 20000000:
        resolution = 'a'
    elif size > 1800000:
        resolution = 'b'
    elif size > 200000:
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