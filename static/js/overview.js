// Creates a graph for one chromosome data type
function createGraph (scene, canvas, x, y, width, height, yMargin, yStart,
  yEnd, step, addTicks) {
  // Draw tick marks
  if (addTicks) {
    drawTicks(scene, canvas, x, y + yMargin, yStart, yEnd, step, yMargin, width, height);
  }

  // Draw surrounding coordinate box
  drawBox(scene, x, y, width, height, 2);
}

// Draw data points
function drawData (scene, data, color) {
  var geometry = new THREE.BufferGeometry();

  geometry.addAttribute('position', new THREE.Float32BufferAttribute(data, 3));
  geometry.computeBoundingSphere();

  var material = new THREE.PointsMaterial({ size: 2, color: color, transparent: true, opacity: 0.3 });
  var points = new THREE.Points(geometry, material);

  scene.add(points);
}

// Draws vertical tick marks for selected values between
// yStart and yEnd with step length.
// The amplitude scales the values to drawing size
function drawVerticalTicks (scene, canvas, x, y, yStart, yEnd, width, drawStep, ampl) {
  let lineThickness = 2;
  let lineWidth = 5;

  for (let step = yStart; step <= yEnd; step += drawStep) {
    let xStep = (yStart - step) * ampl;
    let value = numberWithCommas(step.toFixed(0));
    // Draw text and ticks only for the leftmost box
    drawRotatedText(canvas, value, 10, x + xStep,
      y - value.length - 3 * ic.yMargin, -Math.PI / 4);

    // Draw tick line
    drawLine(scene, x + xStep, y - lineWidth, x + xStep, y, lineThickness, 0x000000);
  }
}

// Draws horizontal lines for selected values between
// yStart and yEnd with step length.
// The amplitude scales the values to drawing size
function drawGraphLines (scene, x, y, yStart, yEnd, drawStep, yMargin, width, height) {
  let ampl = (height - 2 * yMargin) / (yStart - yEnd); // Amplitude for scaling y-axis to fill whole height
  let lineThickness = 2;
  let lineWidth = 4;

  for (let step = yStart; step >= yEnd; step -= drawStep) {
    // Draw horizontal line
    drawLine(scene, x,
      y + yMargin + (yStart - step) * ampl,
      x + width - 2 * lineThickness,
      y + yMargin + (yStart - step) * ampl, lineThickness, 0xd3d3d3);
  }
}

// Draws tick marks for selected values between
// yStart and yEnd with step length.
// The amplitude scales the values to drawing size
function drawTicks (scene, canvas, x, y, yStart, yEnd, drawStep, yMargin, width, height) {
  let ampl = (height - 2 * yMargin) / (yStart - yEnd); // Amplitude for scaling y-axis to fill whole height
  let lineThickness = 2;
  let lineWidth = 4;

  for (let step = yStart; step >= yEnd; step -= drawStep) {
    // TODO: fix correct centering
    drawText(canvas, x - lineWidth, y + (yStart - step) * ampl + 2.2,
      step.toFixed(1), 10, 'right');

    // Draw tick line
    drawLine(scene, x - lineWidth, y + (yStart - step) * ampl, x, y + (yStart - step) * ampl, lineThickness, 0x000000);
  }
}

// Draw 90 degree rotated text
function drawRotatedText (canvas, text, textSize, posx, posy, rot) {
  let ctx = canvas.getContext('2d');
  ctx.save();
  ctx.font = ''.concat(textSize, 'px Arial');
  ctx.translate(posx, posy); // Position for text
  ctx.rotate(rot); // Rotate rot degrees
  ctx.textAlign = 'center';
  ctx.fillText(text, 0, 9);
  ctx.restore();
}

// Draw aligned text at (x, y)
function drawText (canvas, x, y, text, textSize, align) {
  let ctx = canvas.getContext('2d');
  ctx.save();
  ctx.font = ''.concat(textSize, 'px Arial');
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'black';
  ctx.fillText(text, x, y);
  ctx.restore();
}

// Draws a line between point (x, y) and (x2, y2)
function drawLine (scene, x, y, x2, y2, thickness, color) {
  var line = new THREE.Geometry();
  line.vertices.push(
    new THREE.Vector3(x, y, 0),
    new THREE.Vector3(x2, y2, 0)
  );

  var material = new THREE.LineBasicMaterial({ color: color, linewidth: thickness });
  line = new THREE.Line(line, material);
  scene.add(line);
}

// Draws a box from top left corner with a top and bottom margin
function drawBox (scene, x, y, width, height, lineWidth) {
  var coordAxes = new THREE.Geometry();
  coordAxes.vertices.push(
    new THREE.Vector3(x, y, 0),
    new THREE.Vector3(x, y + height, 0),
    new THREE.Vector3(x + width, y + height, 0),
    new THREE.Vector3(x + width, y, 0),
    new THREE.Vector3(x, y, 0)
  );

  var material = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: lineWidth });
  coordAxes = new THREE.Line(coordAxes, material);
  scene.add(coordAxes);
}

// Draw static content for interactive canvas
function drawStaticContent() {
  let linePadding = 2;
  // Fill background colour
  ic.staticCanvas.getContext('2d').fillStyle = "white";
  ic.staticCanvas.getContext('2d').fillRect(0, 0, ic.width, ic.height);

  // Make content area visible
  ic.staticCanvas.getContext('2d').clearRect(ic.x + linePadding, ic.y + linePadding,
                                             ic.boxWidth, ic.width);
  ic.staticCanvas.getContext('2d').clearRect(0, 0, ic.width, ic.y + linePadding);

  ic.staticCanvas.getContext('2d').fillStyle = "black";
  // Draw rotated y-axis legends
  drawRotatedText(ic.staticCanvas, 'B Allele Freq', 18, ic.x - ic.legendMargin,
    ic.y + ic.boxHeight / 2, -Math.PI / 2);
  drawRotatedText(ic.staticCanvas, 'Log R Ratio', 18, ic.x - ic.legendMargin,
    ic.y + 1.5 * ic.boxHeight, -Math.PI / 2);

  // Draw BAF
  createGraph(ic.scene, ic.staticCanvas, ic.x, ic.y, ic.boxWidth, ic.boxHeight,
    ic.yMargin, baf.yStart, baf.yEnd, baf.step, true);

  // Draw LogR
  createGraph(ic.scene, ic.staticCanvas, ic.x, ic.y + ic.boxHeight, ic.boxWidth,
    ic.boxHeight, ic.yMargin, logr.yStart, logr.yEnd, logr.step, true);

  ic.renderer.render(ic.scene, ic.camera);

  // Transfer image to visible canvas
  ic.staticCanvas.getContext('2d').drawImage(
    ic.drawCanvas.transferToImageBitmap(), 0, 0);

  // Clear scene for next render
  ic.scene.remove.apply(ic.scene, ic.scene.children);
}

// Draw values for interactive canvas
function drawInteractiveContent () {
  $.getJSON($SCRIPT_ROOT + '/_getoverviewcov', {
    region: document.getElementById('region_field').placeholder,
    median: logRMedian,
    xpos: ic.x + ic.xMargin,
    ypos: ic.y,
    boxHeight: ic.boxHeight,
    extra_box_width: ic.extraWidth,
    y_margin: ic.yMargin,
    x_ampl: ic.xAmpl
  }, function (result) {
    // Clear canvas
    ic.contentCanvas.getContext('2d').clearRect(0, 0,
      ic.contentCanvas.width, ic.contentCanvas.height);

    // Draw ticks for x-axis
    let ampl = (ic.boxWidth) / (result['start'] - result['end'])
    drawVerticalTicks(ic.scene, ic.contentCanvas, ic.x, ic.y, result['start'],
      result['end'], ic.boxWidth, Math.floor((result['end'] - result['start']) / 20),
      ampl);

    // Draw horizontal lines for BAF and LogR
    drawGraphLines(ic.scene, 0, result['y_pos'],
      baf.yStart, baf.yEnd, baf.step, ic.yMargin, ic.width, ic.boxHeight);
    drawGraphLines(ic.scene, 0, result['y_pos'] + ic.boxHeight,
      logr.yStart, logr.yEnd, logr.step, ic.yMargin, ic.width, ic.boxHeight);

    // Plot scatter data
    drawData(ic.scene, result['baf'], '#FF0000');
    drawData(ic.scene, result['data'], '#000000');
    ic.renderer.render(ic.scene, ic.camera);

    // Draw chromosome title
    drawText(ic.contentCanvas,
      result['x_pos'] - ic.xMargin + ic.boxWidth / 2,
      result['y_pos'] - ic.titleMargin,
      'Chromosome ' + result['chrom'], 15, 'center');

    // Transfer image to visible canvas
    ic.contentCanvas.getContext('2d').drawImage(
      ic.drawCanvas.transferToImageBitmap(), 0, 0);

    // Clear scene before drawing
    ic.scene.remove.apply(ic.scene, ic.scene.children);

    // Set values
    ic.chromosome = result['chrom'];
    ic.start = result['start'];
    ic.end = result['end'];
    inputField.placeholder = ic.chromosome + ':' + ic.start + '-' + ic.end;
  }).done(function () {
    inputField.blur();
  }).fail(function (result) {
    console.log('Bad input');
    inputField.placeholder = 'Bad input: ' + inputField.placeholder;
    inputField.value = '';
  });
}

function left () {
  let size = ic.end - ic.start;
  ic.start -= Math.floor(0.1 * size);
  ic.end -= Math.floor(0.1 * size);
  redraw();
}
function right () {
  let size = ic.end - ic.start;
  ic.start += Math.floor(0.1 * size);
  ic.end += Math.floor(0.1 * size);
  redraw();
}
function zoomIn () {
  let size = ic.end - ic.start;
  ic.start += Math.floor(size * 0.25);
  ic.end -= Math.floor(size * 0.25);
  redraw();
}
function zoomOut () {
  let size = ic.end - ic.start;
  ic.start -= Math.floor(size * 0.5);
  ic.end += Math.floor(size * 0.5);
  if (ic.start < 1) {
    ic.start = 1;
  }
  redraw();
}

function redraw () {
  ic.disallowDrag = false;
  inputField.placeholder = ic.chromosome + ':' + ic.start + '-' + ic.end;
  drawInteractiveContent();
}

// Makes large numbers more readable with commas
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

    if (key === 'Enter' &&
            currentTime - state.lastKeyTime < keystrokeDelay) {
      // Enter was pressed, process previous key presses.
      if (state.buffer < 24 && state.buffer > 0) {
        // Display new chromosome
        ic.chromosome = state.buffer;
        redraw();
      }
    } else if (!isFinite(key)) {
      // Arrow keys for moving graph
      switch (key) {
        case 'ArrowLeft':
          left();
          break;
        case 'ArrowRight':
          right();
          break;
        case '+':
          zoomIn();
          break;
        case '-':
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
