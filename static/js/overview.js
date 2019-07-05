// BAF [0.0, 0.2, 1.0] [beg, step, end]
// LogR [-4.0, 1.0, 4.0] [beg, step, end]

// Creates an overview graph for one chromosome
function createOverviewGraph (scene, chrom, left, top, width, height, yStart, yEnd, step) {
  var ampl = height / (yEnd - yStart); // Amplitude for scaling y-axis to fill whole width

  // Draw surrounding coordinate box
  drawBox(scene, left, top, height, ampl, step);

  // Draw tick marks
  drawTicks(scene, left, top, yStart, yEnd, step, ampl);

  // Help box
  // TODO: Remove this, only for marking out origo
  var geometry = new THREE.PlaneGeometry(20, 20, 20);
  var material = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });
  var plane = new THREE.Mesh(geometry, material);
  scene.add(plane);
}

// Draws tick marks and guide lines for selected values between
// yStart and yEnd with step length.
// The amplitude scales the values to drawing size
function drawTicks (scene, x, y, yStart, yEnd, step, ampl) {
  let xDraw = x;

  for (let i = yStart; i <= yEnd; i += step) {
    // Draw guide line
    drawLine(scene, x, y + i * ampl, x + 120, y + i * ampl, 2, 0xd3d3d3);

    // Draw text for the leftmost box
    if (x < 28) {
      // TODO: fix correct centering
      drawText(scene, xDraw - 4, y + i * ampl + 2.2, i.toFixed(1));

      // Draw tick line
      drawCenteredLine(scene, x, y + i * ampl, 10, 2, 0x000000);
    }
  }
}

// Draw right adjusted text at (x, y)
function drawText (scene, x, y, text) {
  var canvas = document.getElementById('overview-text');
  var ctx = canvas.getContext('2d');
  ctx.font = '10px Arial';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'black';
  ctx.fillText(text, x, y);
}

// Draws a line with centerpoint (x, y)
function drawCenteredLine (scene, x, y, width, thickness, color) {
  var line = new THREE.Geometry();
  line.vertices.push(
    new THREE.Vector3(x - width / 2, y, 0),
    new THREE.Vector3(x + width / 2, y, 0)
  );

  var material = new THREE.LineBasicMaterial({ color: color, linewidth: thickness });
  line = new THREE.Line(line, material);
  scene.add(line);
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
// TODO: remove this margin to make it more intuitive
function drawBox (scene, x, y, width, height) {
  var coordAxes = new THREE.Geometry();
  let margin = 5; // TODO: make parameter, also work in parameter into width and height instead...
  coordAxes.vertices.push(
    new THREE.Vector3(x, y - margin, 0),
    new THREE.Vector3(x, y + height + margin, 0),
    new THREE.Vector3(x + width, y + height + margin, 0),
    new THREE.Vector3(x + width, y - margin, 0),
    new THREE.Vector3(x, y - margin, 0)
  );

  var material = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 3 });
  coordAxes = new THREE.Line(coordAxes, material);
  scene.add(coordAxes);
}
