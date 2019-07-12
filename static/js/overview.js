// Creates an overview graph for one chromosome
function createOverviewGraph (scene, x, y, width, height, y_margin,
    yStart, yEnd, step) {
  let ampl = (height - 2 * y_margin) / (yStart - yEnd); // Amplitude for scaling y-axis to fill whole height

  // Draw tick marks
  drawTicks(scene, x, y + y_margin, yStart, yEnd, width, step, ampl);

  // Draw surrounding coordinate box
  drawBox(scene, x, y, width, height, 2);
}

// Draw data points
function drawData(scene, data, color) {
  var container = document.getElementById( 'container' );
  var geometry = new THREE.BufferGeometry();

  geometry.addAttribute('position', new THREE.Float32BufferAttribute(data, 3));
  geometry.computeBoundingSphere();

  var material = new THREE.PointsMaterial({ size: 2, color: color, transparent: true, opacity: 0.3});
  var points = new THREE.Points(geometry, material);

  scene.add(points);
}

// Draws tick marks and guide lines for selected values between
// yStart and yEnd with step length.
// The amplitude scales the values to drawing size
function drawTicks (scene, x, y, yStart, yEnd, width, drawStep, ampl) {
  let xDraw = x;
  let lineThickness = 2;
  let lineWidth = 4;
  let leftmost_point = 28;

  for (let step = yStart; step >= yEnd; step -= drawStep) {
    // Draw guide line
    drawLine(scene, x, y + (yStart - step) * ampl, x + width,
      y + (yStart - step) * ampl, lineThickness, 0xd3d3d3);

    // Draw text and ticks only for the leftmost box
    if (x < leftmost_point) {
      // TODO: fix correct centering
      drawText(xDraw - 4, y + (yStart - step) * ampl + 2.2, step.toFixed(1),
        'right');

      // Draw tick line
      drawLine(scene, x - lineWidth, y + (yStart - step) * ampl, x, y + (yStart - step) * ampl, lineThickness, 0x000000);
    }
  }
}

// Draw aligned text at (x, y)
function drawText (x, y, text, align) {
  var canvas = document.getElementById('overview-text');
  var ctx = canvas.getContext('2d');
  ctx.font = '10px Arial';
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'black';
  ctx.fillText(text, x, y);
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
