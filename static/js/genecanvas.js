// Draw data points
function drawData (scene, data, color) {
  var geometry = new THREE.BufferGeometry();

  geometry.addAttribute('position', new THREE.Float32BufferAttribute(data, 3));
  geometry.computeBoundingSphere();

  var material = new THREE.PointsMaterial({ size: 2, color: color, transparent: false });
  var points = new THREE.Points(geometry, material);

  scene.add(points);
}

// Draws vertical tick marks for selected values between
// xStart and xEnd with step length.
// The amplitude scales the values to drawing size
function drawVerticalTicks (scene, canvas, renderX, canvasX, y, xStart, xEnd,
  width, yMargin, titleColor) {
  const lineThickness = 2;
  const lineWidth = 5;
  const regionSize = xEnd - xStart;
  const scale = width / regionSize;
  const maxNumTicks = 30;

  // Create a step size which is an even power of ten (10, 100, 1000 etc)
  let stepLength = 10**Math.floor(Math.log10(regionSize)-1);

  // Change to "half-steps" (50, 500, 5000) if too many ticks
  if( regionSize / stepLength > maxNumTicks ) {
    stepLength *= 5;
  }

  // Get  starting position for the first tick
  let xFirstTick = Math.ceil(xStart/stepLength) * stepLength;

  // Draw the ticks
  for (let step = xFirstTick; step <= xEnd; step += stepLength) {
    let xStep = scale * (step - xStart);
    let value = numberWithCommas(step.toFixed(0));

    // Draw text and ticks only for the leftmost box
    drawRotatedText(canvas, value, 10, canvasX + xStep + 4,
      y - value.length - 3 * yMargin, -Math.PI / 4, titleColor);

    // Draw tick line
    drawLine(scene, renderX + xStep, y - lineWidth, renderX + xStep, y,
      lineThickness, 0x000000);
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
  yEnd, step, addTicks, color) {
  // Draw tick marks
  if (addTicks) {
    drawTicks(scene, canvas, x, y + yMargin, yStart, yEnd, step, yMargin, width,
      height, color);
  }

  // Draw surrounding coordinate box
  drawBox(scene, x, y, width, height, 2, color);
}

// Handle left button click
function left (ic) {
  let size = ic.end - ic.start;
  let moveDist = Math.floor(0.1 * size);

  // Don't allow negative values
  if (ic.start - moveDist < 0) {
    moveDist += (ic.start - moveDist);
  }
  ic.start -= moveDist;
  ic.end -= moveDist;
  ic.redraw(null);
}

// Handle right button click
function right (ic) {
  let size = ic.end - ic.start;
  ic.start += Math.floor(0.1 * size);
  ic.end += Math.floor(0.1 * size);
  ic.redraw (null);
}

// Handle zoom in button click
function zoomIn (ic) {
  let size = ic.end - ic.start;
  ic.start += Math.floor(size * 0.2);
  ic.end -= Math.floor(size * 0.2);
  ic.redraw (null);
}

// Handle zoom out button click
function zoomOut (ic) {
  let size = ic.end - ic.start;
  ic.start -= Math.floor(size / 3);
  ic.end += Math.floor(size / 3);
  if (ic.start < 1) {
    ic.start = 1;
  }
  ic.redraw (null);
}


//                //
// HELP FUNCTIONS //
//                //

// Draws tick marks for selected values between
// yStart and yEnd with step length.
// The amplitude scales the values to drawing size
function drawTicks (scene, canvas, x, y, yStart, yEnd, stepLength, yMargin, width, height, color) {
  let ampl = (height - 2 * yMargin) / (yStart - yEnd); // Amplitude for scaling y-axis to fill whole height
  let lineThickness = 2;
  let lineWidth = 4;

  for (let step = yStart; step >= yEnd; step -= stepLength) {
    drawText(canvas, x - lineWidth, y + (yStart - step) * ampl + 2.2,
      step.toFixed(1), 10, 'right');

    // Draw tick line
    drawLine(scene, x - lineWidth, y + (yStart - step) * ampl, x, y + (yStart - step) * ampl, lineThickness, color);
  }
}

// Draw 90 degree rotated text
function drawRotatedText (canvas, text, textSize, posx, posy, rot, color) {
  let ctx = canvas.getContext('2d');
  ctx.save();
  ctx.fillStyle = color;
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
function drawBox (scene, x, y, width, height, lineWidth, color) {
  var coordAxes = new THREE.Geometry();
  coordAxes.vertices.push(
    new THREE.Vector3(x, y, 0),
    new THREE.Vector3(x, y + height, 0),
    new THREE.Vector3(x + width, y + height, 0),
    new THREE.Vector3(x + width, y, 0),
    new THREE.Vector3(x, y, 0)
  );

  var material = new THREE.LineBasicMaterial({ color: color, linewidth: lineWidth });
  coordAxes = new THREE.Line(coordAxes, material);
  scene.add(coordAxes);
}

// Makes large numbers more readable with commas
function numberWithCommas (x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Reloads page to printable size
function loadPrintPage(region) {
  let location = window.location.href.replace(/region=.*&/, 'region=' + region + '&');
  window.location.replace(location + "&print_page=true");
}

// Show print prompt and reloads page after print
function printPage () {
  $('.no-print').hide();
  window.addEventListener('afterprint', function() {
    window.location.replace(window.location.href.replace('&print_page=true', ''))
  }, {once : true});
  print();
}

function copyPermalink(hg_type,region) {

  url = window.location.href
  url_parts = url.split('?');
  permalink = url_parts[0]+"?hg_type="+hg_type+"&region="+region;
  var $temp = $("<input>");
  $("body").append($temp);
  $temp.val(permalink).select();
  document.execCommand("copy");
  $temp.remove();
}