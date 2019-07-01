// BAF [0.0, 0.2, 1.0] [beg, step, end]
// LogR [-4.0, 1.0, 4.0] [beg, step, end]

// Creates an overview graph for one chromosome
function create_overview_graph(scene, chrom, left, top, width, height, y_start, y_end, step) {
  var ampl = height / (y_end - y_start); // Amplitude for scaling y-axis to fill whole width

  // Draw surrounding coordinate box
  draw_box(scene, left, top, height, ampl, step);

  // Draw tick marks
  draw_ticks(scene, left, top, y_start, y_end, step, ampl);

  // Help box
  // TODO: Remove this, only for marking out origo
  var geometry = new THREE.PlaneGeometry( 20, 20, 20 );
  var material = new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} );
  var plane = new THREE.Mesh( geometry, material );
  scene.add( plane );
}


// Draws tick marks and guide lines for selected values between
// y_start and y_end with step length.
// The amplitude scales the values to drawing size
function draw_ticks(scene, x, y, y_start, y_end, step, ampl) {
  let x_draw = x;

  for ( let i = y_start; i <= y_end; i += step) {
    // Draw text for the leftmost box
    if (x < 28) {
      // TODO: fix correct centering
      draw_text(scene, x_draw - 4, y + i * ampl + 2.2, i.toFixed(1));
    }

    // Draw guide line
    draw_line(scene, x, y + i * ampl, x + 120, y + i * ampl, 2, 0xd3d3d3);

    // Draw tick line
    draw_centered_line(scene, x, y + i * ampl, 10, 2, 0x000000);
  }
}

// Draw right adjusted text at (x, y)
function draw_text(scene, x, y, text) {
  var canvas = document.getElementById('overview-text');
  var ctx = canvas.getContext('2d');
  ctx.font = "10px Arial";
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'black';
  ctx.fillText(text, x, y);
}

// Draws a line with centerpoint (x, y)
function draw_centered_line(scene, x, y, width, thickness, color) {
  var line = new THREE.Geometry();
  line.vertices.push(
    new THREE.Vector3(x - width / 2, y, 0),
    new THREE.Vector3(x + width / 2, y, 0),
  );

  var material = new THREE.LineBasicMaterial( { color: color, linewidth: thickness } );
  var line = new THREE.Line(line, material);
  scene.add( line );
}

// Draws a line between point (x, y) and (x2, y2)
function draw_line(scene, x, y, x2, y2, thickness, color) {
  var line = new THREE.Geometry();
  line.vertices.push(
    new THREE.Vector3(x, y, 0),
    new THREE.Vector3(x2, y2, 0),
  );

  var material = new THREE.LineBasicMaterial( { color: color, linewidth: thickness } );
  var line = new THREE.Line(line, material);
  scene.add( line );
}

// Draws a box from top left corner with a top and bottom margin
// TODO: remove this margin to make it more intuitive
function draw_box(scene, x, y, width, height) {
  var coord_axes = new THREE.Geometry();
  let margin = 5; // TODO: make parameter, also work in parameter into width and height instead...
  coord_axes.vertices.push(
    new THREE.Vector3(x, y - margin, 0),
    new THREE.Vector3(x, y + height + margin, 0),
    new THREE.Vector3(x + width, y + height + margin, 0),
    new THREE.Vector3(x + width, y - margin, 0),
    new THREE.Vector3(x, y - margin, 0),
  );

  var material = new THREE.LineBasicMaterial( { color: 0x000000, linewidth: 3 } );
  var line = new THREE.Line(coord_axes, material);
  scene.add( line );
}
