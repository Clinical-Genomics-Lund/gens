function createCanvas (canvasWidth, canvasHeight, canvasID) {
  var canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  document.getElementById(canvasID).appendChild(canvas);
  return canvas;
}

// Function draws static y-axis coordinate lines
function drawYCoordinates (ctx, cvar, start, end, fraction, topPadding) {
  var position = 0;
  var step = cvar.box_height / ((start - end) / fraction);
  // Draw lines and values for Y-axis
  for (let i = start.toFixed(1); i >= end; i = (i - fraction).toFixed(1)) {
    let ypos = topPadding + position;

    ctx.beginPath();

    // Draw a tick mark for values
    ctx.moveTo(cvar.leftPadding - cvar.tick_len / 2, ypos);
    ctx.lineTo(cvar.leftPadding + cvar.tick_len / 2, ypos);
    ctx.stroke();

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

    // Draw Y-axis value
    ctx.font = '12px Arial';
    ctx.fillText(i, 25, ypos + 4);
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

class GeneCanvas {
  constructor (canvasWidth, canvasHeight) {
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
      logr_padding: 0
    };
    this.cvar.box_width -= this.cvar.leftPadding;
    this.cvar.box_height = (canvasHeight - this.cvar.topOffset - this.cvar.baf_padding) / 2;
    this.cvar.logr_padding = this.cvar.baf_padding + this.cvar.box_height + 20;

    // Create canvas for data
    this.dataCanvas = createCanvas(canvasWidth, canvasHeight, 'interactive-container');
    this.dataCanvas.id = 'dataCanvas';

    this.drawCanvas = createCanvas(canvasWidth, canvasHeight, 'interactive-container');
    this.drawCanvas.id = 'drawCanvas';

    // Create static canvas
    this.staticCanvas = createCanvas(canvasWidth, canvasHeight, 'interactive-container');
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
      this.cvar.baf_end, this.cvar.baf_frac, this.cvar.baf_padding);

    // Draw LogR context
    drawBoundingBox(ctx, this.cvar, this.cvar.logr_frac, this.cvar.logr_padding, 0);
    drawYCoordinates(ctx, this.cvar, this.cvar.logr_start,
      this.cvar.logr_end, this.cvar.logr_frac, this.cvar.logr_padding);

    // Draw rotated y-axis legends
    drawRotatedText(ctx, 'B Allele Freq', 10,
      this.cvar.baf_padding + this.cvar.box_height / 2);
    drawRotatedText(ctx, 'Log R Ratio', 10,
      this.cvar.logr_padding + this.cvar.box_height / 2);
  }
}

class OverviewCanvas {
  constructor (canvasWidth, canvasHeight) {
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
      logr_padding: 0
    };
    this.cvar.box_width -= this.cvar.leftPadding;
    this.cvar.box_height = (canvasHeight - this.cvar.topOffset - this.cvar.baf_padding) / 2;
    this.cvar.logr_padding = this.cvar.baf_padding + this.cvar.box_height;

    this.staticCanvas = createCanvas(canvasWidth, canvasHeight, 'overview-container');
    this.staticCanvas.id = 'staticCanvas';

    // Draw overview canvas
    let ctx = this.staticCanvas.getContext('2d');

    // Draw BAF context
    drawBoundingBox(ctx, this.cvar, this.cvar.baf_frac,
      this.cvar.baf_padding, this.cvar.topOffset);
    // Draw LogR context
    drawBoundingBox(ctx, this.cvar, this.cvar.logr_frac,
      this.cvar.logr_padding, 0);
  }
}

function drawTitle (ctx, cvar, title, titleLength) {
  ctx.clearRect(0, 0, cvar.box_width, cvar.baf_padding - cvar.topOffset);
  ctx.font = 'bold 14px Arial';
  ctx.fillText(title,
    cvar.leftPadding + cvar.box_width / 2 - titleLength / 2,
    cvar.baf_padding - cvar.topOffset);
}

function drawXAxis (ctx, cvar, canvasWidth) {
  let scale = canvasWidth / (end - start);
  let xAxisTickFrq = Math.pow(10, (end - start).toString().length - 2);
  let xAxisTick = Math.ceil(start / xAxisTickFrq) * xAxisTickFrq;
  let xAxisOffset = 10; // Offset from top padding
  let everyOther = false;
  ctx.font = '9px Arial';

  if (((end - start) / xAxisTickFrq) > 15) {
    everyOther = true;
  }

  // Draw x-axis tick value
  let counter = 0;
  let prevXPos = 0;
  while (xAxisTick < end) {
    ctx.fillRect(scale * (xAxisTick - start),
      cvar.baf_padding - 2,
      2, 5);
    counter++;
    // Only draw value on every other tick
    let txt = numberWithCommas(xAxisTick);
    let txtWidth = ctx.measureText(txt).width;
    let tickXPos = scale * (xAxisTick - start) - txtWidth / 2;
    if ((!everyOther || counter % 2 === 0) && (tickXPos - prevXPos) > (txtWidth + 5)) {
      ctx.fillText(txt, tickXPos, cvar.baf_padding - xAxisOffset);
      prevXPos = tickXPos;
    }
    xAxisTick += xAxisTickFrq;
  }
}

function drawCoverage (data, baf, canvas, chromosome) {
  let ch = data[0][0];
  let interactive = !!canvas.drawCanvas;
  let covStart = interactive ? start : chromStart;
  let covEnd = interactive ? end : chromEnd;
  let titleLength = interactive ? 110 : 12;
  let leftPadding = interactive ? 0 : canvas.cvar.leftPadding;

  // Draw on empty temporary canvas
  let ctx = interactive ? canvas.drawCanvas.getContext('2d')
    : canvas.staticCanvas.getContext('2d');
  let canvasWidth = interactive ? canvas.drawCanvas.width
    : canvas.staticCanvas.width;
  let canvasHeight = interactive ? canvas.drawCanvas.height
    : canvas.staticCanvas.height;

  // Only draw title and x-axis values for interactive canvas
  if (interactive) {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    drawTitle(canvas.staticCanvas.getContext('2d'), canvas.cvar,
      'Chromosome ' + chromosome, titleLength);
    drawXAxis(ctx, canvas.cvar, canvasWidth);
  } else {
    drawTitle(ctx, canvas.cvar, chromosome, titleLength);
  }
  console.log(ch, covStart, covEnd, (covEnd - covStart), data.length);

  // Draw BAF values
  let ampl = canvas.cvar.box_height;
  let padding = canvas.cvar.baf_padding + canvas.cvar.box_height;
  let scale = canvasWidth / (covEnd - covStart);
  ctx.fillStyle = '#FF0000';
  for (let i = 0; i < baf.length - 1; i++) {
    ctx.fillRect(leftPadding + scale * (baf[i][1] - covStart),
      padding - ampl * baf[i][3], 2, 2);
  }

  ctx.fillStyle = '#000000';
  if (chrom === callChrom && (covStart < callEnd && covEnd > callStart)) {
    ctx.fillRect(leftPadding + scale * (callStart - covStart),
      120, scale * (callEnd - callStart), canvas.cvar.topOffset);
    console.log('DRAW_CALL');
  }

  // Draw Log R ratio values
  ampl = canvas.cvar.box_height / (2 * canvas.cvar.logr_start);
  padding = canvas.cvar.logr_padding + canvas.cvar.box_height / 2;
  if (data.length > 1000) {
    for (let i = 0; i < data.length - 1; i++) {
      ctx.fillRect(leftPadding + scale * (data[i][1] - covStart),
        padding - ampl * data[i][3], 2, 2);
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(canvas.cvar.leftPadding, padding - ampl * data[0][3]);
    for (let i = 1; i < data.length - 1; i++) {
      ctx.lineTo(leftPadding + scale * (data[i][1] - covStart),
        padding - ampl * data[i][3], 2, 2);
    }
    ctx.stroke();
  }

  if (interactive) {
    canvas.dataCanvas.getContext('2d').clearRect(0, 0,
      canvas.dataCanvas.width,
      canvas.dataCanvas.height);
    canvas.dataCanvas.getContext('2d').drawImage(canvas.drawCanvas, 0, 0);
  }
}

function left () {
  let size = end - start;
  start -= Math.floor(0.1 * size);
  end -= Math.floor(0.1 * size);
  redraw();
}
function right () {
  let size = end - start;
  start += Math.floor(0.1 * size);
  end += Math.floor(0.1 * size);
  redraw();
}
function zoomIn () {
  let size = end - start;
  start += Math.floor(size * 0.25);
  end -= Math.floor(size * 0.25);
  redraw();
}
function zoomOut () {
  let size = end - start;
  start -= Math.floor(size * 0.5);
  end += Math.floor(size * 0.5);
  if (start < 1) {
    start = 1;
  }
  redraw();
}

function redraw () {
  $.getJSON($SCRIPT_ROOT + '/_getcov', {
    region: chrom + ':' + start + '-' + end
  }, function (result) {
    drawCoverage(result['data'], result['baf'], gc, chrom);
  }).done(function () { disallowDrag = false; });
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
        chrom = state.buffer;
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
