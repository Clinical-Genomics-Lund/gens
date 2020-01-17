class TrackCanvas {
  constructor (x, width, near, far) {
    // Track variables
    this.collapsedWidth = width;
    this.collapsedHeight = 100;
    this.trackColor =  0x0000ff;
    this.arrowWidth = 4;

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

  clearTracks() {
    this.trackContext.clearRect(0, 0, this.collapsedWidth, this.collapsedHeight);
  }

  drawGeneName(geneName, xPos, yPos) {
    this.trackContext.save();
    this.trackContext.font = 'bold 10px Arial';
    this.trackContext.fillStyle = 'black';

    // Center text
    let textWidth = this.trackContext.measureText(geneName).width;
    xPos = xPos - textWidth / 2;

    // Cap text to outer edges
    xPos = xPos < 0 ? 0 : xPos;
    if (xPos >= this.collapsedWidth - textWidth) {
      xPos = this.collapsedWidth - textWidth;
    }

    this.trackContext.fillText(geneName, xPos, yPos);
    this.trackContext.restore();
  }

  drawTracks (region) {
    $.getJSON($SCRIPT_ROOT + '/_gettrackdata', {
      region: region,
      width: this.trackCanvas.width,
    }, function(result) {
      let featureHeight = 20;
      let featureMargin = 14;
      let yPos = featureHeight / 2;
      let scale = tc.trackCanvas.width / (result['end_pos'] - result['start_pos']);

      // Go through results and draw appropriate symbols
      for (let i = 0; i < result['tracks'].length; i++) {
        let track = result['tracks'][i];
        let geneName = track['gene_name']
        let height_order = track['height_order']
        let strand = track['strand']
        let start = track['start']
        let end = track['end']

        let adjustedYPos = yPos + (height_order - 1) * (featureHeight + featureMargin);

        tc.drawTrackLen(scale * (start - result['start_pos']),
          scale * (end - result['start_pos']), adjustedYPos);

        tc.drawGeneName(geneName, scale * ((start + end) / 2 - result['start_pos']),
          adjustedYPos + featureHeight);

        let latestFeaturePos = start;
        for (let j = 0; j < track['features'].length; j++) {
          let feature = track['features'][j];

          // Draw arrows
          let diff = feature['start'] - latestFeaturePos;
          if (scale * diff >= tc.arrowWidth) {
            let direction = strand == '+' ? 1 : -1;
            tc.drawArrow(scale * (latestFeaturePos - result['start_pos'] + diff / 2),
              adjustedYPos, direction, featureHeight / 2);
          }
          latestFeaturePos = feature['end'];

          switch(feature['feature']) {
            case 'exon':
              tc.drawBand(scale * (feature['start'] - result['start_pos']),
                adjustedYPos, scale * (feature['end'] - feature['start']), featureHeight);
              break;
            case 'three_prime_utr':
              tc.drawBand(scale * (feature['start'] - result['start_pos']),
                adjustedYPos, scale * (feature['end'] - feature['start']), featureHeight / 2);
              break;
          }
        }
      }

      tc.renderer.render(tc.scene, tc.camera);

      // Transfer image to visible canvas
      tc.trackContext.drawImage(tc.drawCanvas.transferToImageBitmap(), 0, 0);

      // Clear draw canvas
      ic.scene.remove.apply(tc.scene, tc.scene.children);
    })
  }

  drawTrackLen (xStart, xStop, yPos) {
    // Draw exon at input center position
    var line = new THREE.Geometry();
    line.vertices.push(
      new THREE.Vector3(xStart, yPos, 0),
      new THREE.Vector3(xStop, yPos, 0)
    );

    var material = new THREE.LineBasicMaterial({color: this.trackColor});
    line = new THREE.Line(line, material);
    this.scene.add(line);
  }

  drawBand (xpos, ypos, width, height) {
    // Draw exon at input center position
    var rectangle = new THREE.Geometry();
    rectangle.vertices.push(
      new THREE.Vector3(xpos, ypos - height / 2, 0),
      new THREE.Vector3(xpos + width, ypos - height / 2, 0),
      new THREE.Vector3(xpos + width, ypos + height / 2, 0),
      new THREE.Vector3(xpos, ypos + height / 2, 0)
    );

    rectangle.faces.push(
      new THREE.Face3(0, 3, 1),
      new THREE.Face3(1, 3, 2),
    );

    var material = new THREE.MeshBasicMaterial({color: this.trackColor});
    rectangle = new THREE.Mesh(rectangle, material);
    this.scene.add(rectangle);
  }

  // Draw an arrow in desired direction
  // Forward arrow: direction = 1
  // Reverse arrow: direction = -1
  drawArrow (xpos, ypos, direction, height) {
    let width = direction * this.arrowWidth;

    // Draw arrow symbol at around center position
    var line = new THREE.Geometry();
    line.vertices.push(
      new THREE.Vector3(xpos - width / 2, ypos - height / 2, 0),
      new THREE.Vector3(xpos + width / 2, ypos, 0),
      new THREE.Vector3(xpos - width / 2, ypos + height / 2, 0)
    );

    var material = new THREE.LineBasicMaterial({color: this.trackColor});
    line = new THREE.Line(line, material);
    this.scene.add(line);
  }
}
