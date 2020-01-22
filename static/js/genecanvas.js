// Draw data points
function drawData (scene, data, color) {
  var geometry = new THREE.BufferGeometry();

  geometry.addAttribute('position', new THREE.Float32BufferAttribute(data, 3));
  geometry.computeBoundingSphere();

  var material = new THREE.PointsMaterial({ size: 2, color: color, transparent: true, opacity: 1 });
  var points = new THREE.Points(geometry, material);

  scene.add(points);
}

// Draws vertical tick marks for selected values between
// xStart and xEnd with step length.
// The amplitude scales the values to drawing size
function drawVerticalTicks (scene, canvas, x, y, xStart, xEnd, width, yMargin) {
  const lineThickness = 2;
  const lineWidth = 5;
  const scale = width / (xEnd - xStart);
  const precison = 10;
  const steps = 20;

  let stepLength = (xEnd - xStart) / steps;
  // Adjust start, stop and step to even numbers
  if (stepLength > precison * precison) {
    xStart = Math.ceil(xStart / precison) * precison;
    xEnd = Math.floor(xEnd / precison) * precison;
    x += scale * (xStart - xStart);
    stepLength = Math.floor(stepLength / precison) * precison;
  }

  for (let step = xStart; step <= xEnd; step += stepLength) {
    let xStep = scale * (step - xStart);
    let value = numberWithCommas(step.toFixed(0));

    // Draw text and ticks only for the leftmost box
    drawRotatedText(canvas, value, 10, x + xStep,
      y - value.length - 3 * yMargin, -Math.PI / 4);

    // Draw tick line
    drawLine(scene, x + xStep, y - lineWidth, x + xStep, y, lineThickness, 0x000000);
  }
}

// Draws horizontal lines for selected values between
// yStart and yEnd with step length.
// The amplitude scales the values to drawing size
function drawGraphLines (scene, x, y, yStart, yEnd, stepLength, yMargin, width, height) {
  let ampl = (height - 2 * yMargin) / (yStart - yEnd); // Amplitude for scaling y-axis to fill whole height
  let lineThickness = 2;

  for (let step = yStart; step >= yEnd; step -= stepLength) {
    // Draw horizontal line
    drawLine(scene, x,
      y + yMargin + (yStart - step) * ampl,
      x + width - 2 * lineThickness,
      y + yMargin + (yStart - step) * ampl, lineThickness, 0xd3d3d3);
  }
}

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

function left (ic, baf, logr, logRMedian, sampleName) {
  let size = ic.end - ic.start;
  ic.start -= Math.floor(0.1 * size);
  ic.end -= Math.floor(0.1 * size);
  ic.redraw (ic, ac, baf, logr, logRMedian, adjustedMargin);
}

function right (ic, baf, logr, logRMedian, sampleName) {
  let size = ic.end - ic.start;
  ic.start += Math.floor(0.1 * size);
  ic.end += Math.floor(0.1 * size);
  ic.redraw (ic, ac, baf, logr, logRMedian, adjustedMargin);
}

function zoomIn (ic, baf, logr, logRMedian, sampleName) {
  let size = ic.end - ic.start;
  ic.start += Math.floor(size * 0.25);
  ic.end -= Math.floor(size * 0.25);
  ic.redraw (ic, ac, baf, logr, logRMedian, adjustedMargin);
}

function zoomOut (ic, baf, logr, logRMedian, sampleName) {
  let size = ic.end - ic.start;
  ic.start -= Math.floor(size * 0.5);
  ic.end += Math.floor(size * 0.5);
  if (ic.start < 1) {
    ic.start = 1;
  }
  ic.redraw (ic, ac, baf, logr, logRMedian, adjustedMargin);
}


//                //
// HELP FUNCTIONS //
//                //

// Draws tick marks for selected values between
// yStart and yEnd with step length.
// The amplitude scales the values to drawing size
function drawTicks (scene, canvas, x, y, yStart, yEnd, stepLength, yMargin, width, height) {
  let ampl = (height - 2 * yMargin) / (yStart - yEnd); // Amplitude for scaling y-axis to fill whole height
  let lineThickness = 2;
  let lineWidth = 4;

  for (let step = yStart; step >= yEnd; step -= stepLength) {
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

// Makes large numbers more readable with commas
function numberWithCommas (x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
