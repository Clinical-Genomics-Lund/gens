// Creates a graph for one chromosome data type
function createGraph (scene, canvas, x, y, width, height, yMargin, yStart,
  yEnd, step, drawValues) {
  let ampl = (height - 2 * yMargin) / (yStart - yEnd); // Amplitude for scaling y-axis to fill whole height

  // Draw tick marks
  drawTicks(scene, canvas, x, y + yMargin, yStart, yEnd, width, step, ampl, drawValues);

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
        step.toFixed(1), 10, 'right');

      // Draw tick line
      drawLine(scene, x - lineWidth, y + (yStart - step) * ampl, x, y + (yStart - step) * ampl, lineThickness, 0x000000);
    }
  }
}

// Draw 90 degree rotated text
function drawRotatedText (canvas, text, textSize, posx, posy) {
  let ctx = canvas.getContext('2d');
  ctx.save();
  ctx.font = ''.concat(textSize, 'px Arial');
  ctx.translate(posx, posy); // Position for text
  ctx.rotate(-Math.PI / 2); // Rotate 90 degrees
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

// Draw values for interactive canvas
function drawInteractiveCanvas () {
  $.getJSON($SCRIPT_ROOT + '/_getoverviewcov', {
    region: document.getElementById('region_field').placeholder,
    median: logRMedian,
    xpos: ic.x + ic.xMargin,
    ypos: ic.y,
    boxHeight: ic.boxHeight,
    y_margin: ic.yMargin,
    x_ampl: ic.xAmpl
  }, function (result) {
    // Draw chromosome title
    drawText(ic.staticCanvas,
      result['x_pos'] - ic.xMargin + ic.boxWidth / 2,
      result['y_pos'] - ic.titleMargin,
      'Chromosome ' + result['chrom'], 15, 'center');

    // Draw rotated y-axis legends
    console.log(ic.x, ic.y);
    drawRotatedText(ic.staticCanvas, 'B Allele Freq', 18, ic.x - ic.legendMargin,
        ic.y + ic.boxHeight / 2);
    drawRotatedText(ic.staticCanvas, 'Log R Ratio', 18, ic.x - ic.legendMargin,
        ic.y + 1.5 * ic.boxHeight);

    // Draw BAF
    createGraph(ic.scene, ic.staticCanvas,
      result['x_pos'] - ic.xMargin,
      result['y_pos'], ic.boxWidth,
      ic.boxHeight, ic.yMargin,
      baf.yStart, baf.yEnd, baf.step, true);

    // Draw LogR
    createGraph(ic.scene, ic.staticCanvas,
      result['x_pos'] - ic.xMargin,
      result['y_pos'] + ic.boxHeight, ic.boxWidth, ic.boxHeight,
      ic.yMargin, logr.yStart, logr.yEnd, logr.step, true);

    // Plot scatter data
    drawData(ic.scene, result['baf'], '#FF0000');
    drawData(ic.scene, result['data'], '#000000');
    ic.renderer.render(ic.scene, ic.camera);

    // Set values
    ic.chromosome = result['chrom'];
    ic.start = result['start'];
    ic.end = result['end'];

  }).done(function () {
    inputField.blur();
  }).fail(function (result) {
    console.log('Bad input');
    inputField.placeholder = 'Bad input: ' + inputField.value;
    inputField.value = '';
  });
}
