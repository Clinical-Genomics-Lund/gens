// Creates a graph for one chromosome data type
function createGraph (scene, canvas, x, y, width, height, y_margin,
    yStart, yEnd, step, drawValues) {
  let ampl = (height - 2 * y_margin) / (yStart - yEnd); // Amplitude for scaling y-axis to fill whole height

  // Draw tick marks
  drawTicks(scene, canvas, x, y + y_margin, yStart, yEnd, width, step, ampl, drawValues);

  // Draw surrounding coordinate box
  drawBox(scene, x, y, width, height, 2);
}

// Draw data points
function drawData(scene, data, color) {
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
function drawTicks (scene, canvas, x, y, yStart, yEnd, width, drawStep, ampl, drawValues) {
  let lineThickness = 2;
  let lineWidth = 4;

  for (let step = yStart; step >= yEnd; step -= drawStep) {
    // Draw guide line
    drawLine(scene, x, y + (yStart - step) * ampl, x + width,
      y + (yStart - step) * ampl, lineThickness, 0xd3d3d3);

    // Draw text and ticks only for the leftmost box
    if (drawValues) {
      // TODO: fix correct centering
      drawText(canvas, x - lineWidth, y + (yStart - step) * ampl + 2.2,
               step.toFixed(1), 'right');

      // Draw tick line
      drawLine(scene, x - lineWidth, y + (yStart - step) * ampl, x, y + (yStart - step) * ampl, lineThickness, 0x000000);
    }
  }
}

// Draw aligned text at (x, y)
function drawText (canvas, x, y, text, align) {
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

// Draw values for interactive canvas
function drawInteractiveCanvas() {
  $.getJSON($SCRIPT_ROOT + '/_getoverviewcov', {
    region: document.getElementById('region_field').placeholder,
    median: logRMedian,
    xpos: ic_x + x_margin,
    ypos: ic_y,
    boxHeight: ic_box_height,
    y_margin: y_margin,
    x_ampl: ic_x_ampl
  }, function (result) {
    // Draw chromosome title
    drawText(interactiveStatic,
      result['x_pos'] - x_margin + ic_box_width / 2,
      result['y_pos'] - title_margin,
      'Chromosome ' + result['chrom'], 'center');

    // Draw BAF
    createGraph(interactiveScene, interactiveStatic,
      result['x_pos'] - x_margin,
      result['y_pos'], ic_box_width,
      ic_box_height, y_margin,
      baf_y_start, baf_y_end, baf_step, true);

    // Draw LogR
    createGraph(interactiveScene, interactiveStatic,
      result['x_pos'] - x_margin,
      result['y_pos'] + ic_box_height, ic_box_width, ic_box_height,
      y_margin, logr_y_start, logr_y_end, logr_step, true);

    // Plot scatter data
    drawData(interactiveScene, result["baf"], '#FF0000');
    drawData(interactiveScene, result["data"], '#000000');
    interactiveRenderer.render(interactiveScene, interactiveCamera);
  }).done(function () {
    input_field.blur();
  }).fail(function (result) {
    console.log("Bad input");
    input_field.placeholder = 'Bad input: ' + input_field.value;
    input_field.value = '';
  });
}
