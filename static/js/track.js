class TrackCanvas {
  constructor (x, width, near, far) {
    // Track variables
    this.collapsedWidth = width;
    this.collapsedHeight = 100;
    this.trackColor =  0x0000ff;

    // Canvases
    this.drawCanvas = new OffscreenCanvas(this.collapsedWidth, this.collapsedHeight);
    this.context = this.drawCanvas.getContext('webgl2');
    this.trackCanvas = document.getElementById('track-canvas');
    this.trackContext = this.trackCanvas.getContext('2d');

    // Setup initial track Canvas
    this.trackCanvas.width = this.collapsedWidth;
    this.trackCanvas.height = this.collapsedHeight;

    // Scene variables
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(this.collapsedWidth / -2,
      this.collapsedWidth / 2, this.collapsedHeight / -2,
      this.collapsedHeight / 2, near, far);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.drawCanvas,
      context: this.context,
      antialiasing: true
    });

    // Change to fourth quadrant of scene
    this.camera.position.set(this.collapsedWidth / 2 - lineMargin,
      this.collapsedHeight / 2 - lineMargin, 1);
  }

  drawTracks (region) {
    $.getJSON($SCRIPT_ROOT + '/_gettrackdata', {
      region: region,
      width: this.trackCanvas.width,
    }, function(result) {
      // Go through results and draw appropriate symbols
      console.log(result['tracks'])
      tc.renderer.render(tc.scene, tc.camera);

      // Transfer image to visible canvas
      tc.trackContext.drawImage(tc.drawCanvas.transferToImageBitmap(), 0, 0);
    })
  }

  drawGeneLen (xStart, xStop, yPos) {
    let lineWidth = 2;

    // Draw exon at input center position
    var line = new THREE.Geometry();
    line.vertices.push(
      new THREE.Vector3(xStart, yPos, 0),
      new THREE.Vector3(xStop, yPos, 0)
    );

    var material = new THREE.LineBasicMaterial({ color: this.trackColor, linewidth: lineWidth });
    line = new THREE.Line(line, material);
    this.scene.add(line);
  }

  drawExon (xpos, ypos) {
    let height = 10;
    let lineWidth = 2;

    // Draw exon at input center position
    var line = new THREE.Geometry();
    line.vertices.push(
      new THREE.Vector3(xpos, ypos + height / 2, 0),
      new THREE.Vector3(xpos, ypos - height / 2, 0)
    );

    var material = new THREE.LineBasicMaterial({ color: this.trackColor, linewidth: lineWidth });
    line = new THREE.Line(line, material);
    this.scene.add(line);
  }

  // Draw an arrow in desired direction
  // Forward arrow: direction = 1
  // Reverse arrow: direction = -1
  drawArrow (xpos, ypos, direction) {
    let width = direction * 4;
    let height = 10;
    let lineWidth = 2;

    // Draw arrow symbol at around center position
    var line = new THREE.Geometry();
    line.vertices.push(
      new THREE.Vector3(xpos - width, ypos - height / 2, 0),
      new THREE.Vector3(xpos, ypos, 0),
      new THREE.Vector3(xpos - width, ypos + height / 2, 0)
    );

    var material = new THREE.LineBasicMaterial({ color: this.trackColor, linewidth: lineWidth });
    line = new THREE.Line(line, material);
    this.scene.add(line);
  }
}
