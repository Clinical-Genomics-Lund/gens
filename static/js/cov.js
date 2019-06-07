function createCanvas (canvasWidth, canvasHeight) {
  var canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  return canvas;
}

// Function draws static y-axis coordinate lines
function drawYCoordinates (ctx, cvar, start, end, fraction, topPadding, drawYValues) {
  var position = 0;
  var step = cvar.box_height / ((start - end) / fraction);
  // Draw lines and values for Y-axis
  for (let i = start.toFixed(1); i >= end; i = (i - fraction).toFixed(1)) {
    let ypos = topPadding + position;

    ctx.beginPath();

    // Draw a transparent line across box
    if (i !== start && i !== end) {
      ctx.save();
      ctx.lineWidth = cvar.tick_width;
      ctx.strokeStyle = cvar.line_colour;
      ctx.moveTo(cvar.leftPadding, ypos);
      ctx.lineTo(cvar.leftPadding + cvar.box_width, ypos);
      ctx.stroke();
      ctx.restore();
    }

    if (drawYValues) {
      // Draw a tick mark for values
      ctx.fillRect(cvar.leftPadding - cvar.tick_len / 2, ypos - 1, cvar.tick_len, 2);

      // Draw Y-axis value
      ctx.font = '12px Arial';
      ctx.fillText(i, 25, ypos + 4);
    }
    position += step;
  }
}

function drawBoundingBox (ctx, cvar, fraction, topPadding, topOffset) {
  // Draw boundingbox and clear it from colour
  ctx.lineWidth = 2;
  ctx.clearRect(cvar.leftPadding, topPadding - topOffset,
    cvar.box_width, cvar.box_height + topOffset);
  ctx.rect(cvar.leftPadding, topPadding, cvar.box_width, cvar.box_height);
  ctx.stroke();
}

function drawRotatedText (ctx, text, posx, posy) {
  ctx.save();
  ctx.font = '18px Arial';
  ctx.translate(posx, posy); // Position for text
  ctx.rotate(-Math.PI / 2); // Rotate 90 degrees
  ctx.textAlign = 'center';
  ctx.fillText(text, 0, 9);
  ctx.restore();
}

class GeneCanvas { // eslint-disable-line no-unused-vars
  constructor (canvasWidth, canvasHeight, chromosome, start, end) {
    // Canvas variables
    this.cvar = {
      // Box values
      leftPadding: 50,
      topOffset: 25,
      box_width: canvasWidth,
      box_height: canvasHeight / 2,
      tick_len: 6,
      tick_width: 0.2,
      line_colour: '#000000',

      // BAF values
      baf_start: 1.0,
      baf_end: 0.0,
      baf_frac: 0.2,
      baf_padding: 40,

      // LogR values
      logr_start: 4.0,
      logr_end: -4.0,
      logr_frac: 1.0,
      logr_padding: 20,

      // Chromosome values
      chromosome: chromosome,
      start: start,
      end: end,

      // Draw values
      titleLength: 110,
      drawPadding: 0,

      // Options
      disallowDrag: false
    };
    this.cvar.box_width -= this.cvar.leftPadding;
    this.cvar.box_height = (canvasHeight - this.cvar.topOffset - this.cvar.baf_padding) / 2;
    this.cvar.logr_padding += this.cvar.baf_padding + this.cvar.box_height;

    // Create canvas for data
    this.dataCanvas = createCanvas(canvasWidth, canvasHeight);
    document.getElementById('interactive-container').appendChild(this.dataCanvas);
    this.dataCanvas.id = 'dataCanvas';

    this.drawCanvas = new OffscreenCanvas(canvasWidth, canvasHeight);
    this.drawCanvas.id = 'drawCanvas';

    // Create static canvas
    this.staticCanvas = createCanvas(canvasWidth, canvasHeight);
    document.getElementById('interactive-container').appendChild(this.staticCanvas);
    this.staticCanvas.id = 'staticCanvas';

    // Draw on static canvas
    let ctx = this.staticCanvas.getContext('2d');

    // Set colour of whole canvas
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);
    ctx.restore();

    // Draw BAF context
    drawBoundingBox(ctx, this.cvar, this.cvar.baf_frac,
      this.cvar.baf_padding, this.cvar.topOffset);
    drawYCoordinates(ctx, this.cvar, this.cvar.baf_start,
      this.cvar.baf_end, this.cvar.baf_frac, this.cvar.baf_padding, true);

    // Draw LogR context
    drawBoundingBox(ctx, this.cvar, this.cvar.logr_frac, this.cvar.logr_padding, 0);
    drawYCoordinates(ctx, this.cvar, this.cvar.logr_start,
      this.cvar.logr_end, this.cvar.logr_frac, this.cvar.logr_padding, true);

    // Draw rotated y-axis legends
    drawRotatedText(ctx, 'B Allele Freq', 10,
      this.cvar.baf_padding + this.cvar.box_height / 2);
    drawRotatedText(ctx, 'Log R Ratio', 10,
      this.cvar.logr_padding + this.cvar.box_height / 2);
  }

  // Draw coverage for gene canvas
  draw (data, baf) {
    drawCoverage(data, baf, this.drawCanvas, this.staticCanvas, this.dataCanvas, this.cvar, true);
  }
}

class OverviewCanvas { // eslint-disable-line no-unused-vars
  constructor (canvasWidth, canvasHeight, chromosome, drawYValues, divClass) {
    // Canvas variables
    this.cvar = {
      // Box values
      leftPadding: 5,
      topOffset: 5,
      box_width: canvasWidth,
      box_height: canvasHeight / 2,
      tick_len: 6,
      tick_width: 0.2,
      line_colour: '#000000',

      // BAF values
      baf_start: 1.0,
      baf_end: 0.0,
      baf_frac: 0.2,
      baf_padding: 20,

      // LogR values
      logr_start: 4.0,
      logr_end: -4.0,
      logr_frac: 1.0,
      logr_padding: 5,

      // Chromosome values
      chromosome: chromosome,
      start: 0,
      end: 245000000,

      // Draw values
      titleLength: 12,
      drawPadding: 5
    };

    if (drawYValues) {
      this.cvar.leftPadding = 50;
      canvasWidth += this.cvar.leftPadding;
    } else {
      this.cvar.box_width -= this.cvar.leftPadding;
    }

    this.cvar.drawPadding = this.cvar.leftPadding;

    this.cvar.box_height = (canvasHeight - this.cvar.topOffset - this.cvar.baf_padding) / 2;
    this.cvar.logr_padding += this.cvar.baf_padding + this.cvar.box_height;

    this.drawCanvas = new OffscreenCanvas(canvasWidth, canvasHeight);
    this.drawCanvas.id = 'drawCanvas';

    this.staticCanvas = createCanvas(canvasWidth, canvasHeight);
    document.getElementById(divClass).appendChild(this.staticCanvas);
    this.staticCanvas.id = 'staticCanvas';

    // Draw overview canvas
    let ctx = this.drawCanvas.getContext('2d');

    // Draw BAF context
    drawBoundingBox(ctx, this.cvar, this.cvar.baf_frac,
      this.cvar.baf_padding, this.cvar.topOffset);
    drawYCoordinates(ctx, this.cvar, this.cvar.baf_start,
      this.cvar.baf_end, this.cvar.baf_frac, this.cvar.baf_padding, drawYValues);

    // Draw LogR context
    drawBoundingBox(ctx, this.cvar, this.cvar.logr_frac,
      this.cvar.logr_padding, 0);
    drawYCoordinates(ctx, this.cvar, this.cvar.logr_start,
      this.cvar.logr_end, this.cvar.logr_frac, this.cvar.logr_padding, drawYValues);
  }

  // Draw coverage for overview canvas
  draw (data, baf) {
    drawCoverage(data, baf, this.drawCanvas, this.staticCanvas, this.staticCanvas, this.cvar, false);
  }
}

// Draw coverage for canvas
function drawCoverage (data, baf, drawCanvas, staticCanvas, dataCanvas, cvar, dynamic) {
  let ch = data[0][0];

  // Draw on empty temporary canvas
  let ctx = drawCanvas.getContext('2d');
  let canvasWidth = drawCanvas.width;
  let canvasHeight = drawCanvas.height;

  if (dynamic) {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    drawXAxis(ctx, cvar, canvasWidth);
    drawTitle(staticCanvas.getContext('2d'), cvar, 'Chromosome' + cvar.chromosome, cvar.titleLength);
  } else {
    drawTitle(drawCanvas.getContext('2d'), cvar, cvar.chromosome, cvar.titleLength);
  }
  console.log(ch, cvar.start, cvar.end, (cvar.end - cvar.start), data.length);

  // Draw BAF values
  let pointSize = 2;
  let ampl = cvar.box_height;
  let padding = cvar.baf_padding + cvar.box_height;
  let scale;

  if (dynamic) {
    scale = canvasWidth / (cvar.end - cvar.start);
  } else {
    scale = (cvar.box_width - pointSize) / (cvar.end - cvar.start);
  }

  ctx.save();
  ctx.fillStyle = '#FF0000';
  for (let i = 0; i < baf.length - 1; i++) {
    ctx.fillRect(cvar.drawPadding + scale * (baf[i][1] - cvar.start),
      padding - ampl * baf[i][3], 2, 2);
  }
  ctx.restore();

  if (dynamic) {
    ctx.save();
    ctx.fillStyle = '#000000';
    if (cvar.chromosome === callChrom && (cvar.start < callEnd && cvar.end > callStart)) {
      ctx.fillRect(cvar.drawPadding + scale * (callStart - cvar.start),
        120, scale * (callEnd - callStart), cvar.topOffset);
      console.log('DRAW_CALL');
    }
    ctx.restore();
  }

  // Draw Log R ratio values
  ampl = cvar.box_height / (2 * cvar.logr_start);
  padding = cvar.logr_padding + cvar.box_height / 2;
  if (data.length > 1000) {
    for (let i = 0; i < data.length - 1; i++) {
      ctx.fillRect(cvar.drawPadding + scale * (data[i][1] - cvar.start),
        padding - ampl * data[i][3], pointSize, pointSize);
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(cvar.cvar.drawPadding, padding - ampl * data[0][3]);
    for (let i = 1; i < data.length - 1; i++) {
      ctx.lineTo(cvar.drawPadding + scale * (data[i][1] - cvar.start),
        padding - ampl * data[i][3], pointSize, pointSize);
    }
    ctx.stroke();
  }

  if (dynamic) {
    dataCanvas.getContext('2d').clearRect(0, 0, dataCanvas.width,
      dataCanvas.height);
  }
  dataCanvas.getContext('2d').putImageData(drawCanvas.getContext('2d').getImageData(
    0, 0, dataCanvas.width, dataCanvas.height), 0, 0);
}

function drawTitle (ctx, cvar, title, titleLength) {
  ctx.clearRect(0, 0, cvar.box_width, cvar.baf_padding - cvar.topOffset);
  ctx.font = 'bold 14px Arial';
  ctx.fillText(title,
    cvar.leftPadding + cvar.box_width / 2 - titleLength / 2,
    cvar.baf_padding - cvar.topOffset);
}

function drawXAxis (ctx, cvar, canvasWidth) {
  let scale = canvasWidth / (cvar.end - cvar.start);
  let xAxisTickFrq = Math.pow(10, (cvar.end - cvar.start).toString().length - 2);
  let xAxisTick = Math.ceil(cvar.start / xAxisTickFrq) * xAxisTickFrq;
  let xAxisOffset = 10; // Offset from top padding
  let everyOther = false;
  ctx.font = '9px Arial';

  if (((cvar.end - cvar.start) / xAxisTickFrq) > 15) {
    everyOther = true;
  }

  // Draw x-axis tick value
  let counter = 0;
  let prevXPos = 0;
  while (xAxisTick < cvar.end) {
    let tickLength = 1;
    counter++;
    // Only draw value on every other tick
    let txt = numberWithCommas(xAxisTick);
    let txtWidth = ctx.measureText(txt).width;
    let tickXPos = scale * (xAxisTick - cvar.start) - txtWidth / 2;
    if ((!everyOther || counter % 2 === 0) && (tickXPos - prevXPos) > (txtWidth + 5)) {
      ctx.fillText(txt, tickXPos, cvar.baf_padding - xAxisOffset);
      prevXPos = tickXPos;
      tickLength++;
    }
    ctx.fillRect(scale * (xAxisTick - cvar.start),
      cvar.baf_padding - 2,
      tickLength, 5);
    xAxisTick += xAxisTickFrq;
  }
}

function left () {
  let size = gc.cvar.end - gc.cvar.start;
  gc.cvar.start -= Math.floor(0.1 * size);
  gc.cvar.end -= Math.floor(0.1 * size);
  redraw();
}
function right () {
  let size = gc.cvar.end - gc.cvar.start;
  gc.cvar.start += Math.floor(0.1 * size);
  gc.cvar.end += Math.floor(0.1 * size);
  redraw();
}
function zoomIn () {
  let size = gc.cvar.end - gc.cvar.start;
  gc.cvar.start += Math.floor(size * 0.25);
  gc.cvar.end -= Math.floor(size * 0.25);
  redraw();
}
function zoomOut () {
  let size = gc.cvar.end - gc.cvar.start;
  gc.cvar.start -= Math.floor(size * 0.5);
  gc.cvar.end += Math.floor(size * 0.5);
  if (gc.cvar.start < 1) {
    gc.cvar.start = 1;
  }
  redraw();
}

function redraw () {
  $.getJSON($SCRIPT_ROOT + '/_getcov', {
    region: gc.cvar.chromosome + ':' + gc.cvar.start + '-' + gc.cvar.end,
    median: logRMedian
  }, function (result) {
    gc.draw(result['data'], result['baf']);
  }).done(function () { gc.cvar.disallowDrag = false; });
}

function numberWithCommas (x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function keyMapper (options) {
  const keystrokeDelay = options.keystrokeDelay || 1000;

  let state = {
    buffer: '',
    lastKeyTime: Date.now()
  };

  document.addEventListener('keydown', event => {
    const key = event.key;
    const currentTime = Date.now();
    const eventType = window.event;
    const target = eventType.target || eventType.scrElement;
    const targetTagName = (target.nodeType === 1) ? target.nodeName.toUpperCase() : '';
    let buffer = '';

    // Do not listen to keydown events for active fields
    if (/INPUT|SELECT|TEXTAREA/.test(targetTagName)) {
      return;
    }

    if (event.keyCode === 13 &&
            currentTime - state.lastKeyTime < keystrokeDelay) {
      // Enter was pressed, process previous key presses.
      if (state.buffer < 24 && state.buffer > 0) {
        // Display new chromosome
        gc.cvar.chromosome = state.buffer;
        redraw();
      }
    } else if (!isFinite(key)) {
      // Arrow keys for moving graph
      switch (event.keyCode) {
        case 37: // Left arrow
          left();
          break;
        case 39: // Right arrow
          right();
          break;
        case 38: // Up arrow
          zoomIn();
          break;
        case 40: // Down arrow
          zoomOut();
          break;
        default:
          return;
      }
    } else if (currentTime - state.lastKeyTime > keystrokeDelay) {
      // Reset buffer
      buffer = key;
    } else {
      if (state.buffer.length > 1) {
        // Buffer contains more than two digits, keep the last digit
        buffer = state.buffer[state.buffer.length - 1] + key;
      } else {
        // Add new digit to buffer
        buffer = state.buffer + key;
      }
    }

    // Save current state
    state = { buffer: buffer, lastKeyTime: currentTime };
  });
}
