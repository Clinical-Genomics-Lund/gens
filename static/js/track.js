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

    // Setup track div
    this.trackTitle = document.getElementById('track-titles');
    this.trackTitle.style.width = this.collapsedWidth + 'px';
    this.trackTitle.style.height = this.collapsedHeight + 'px';

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
    const textHeight = 10;
    this.trackContext.save();
    this.trackContext.font = 'bold ' + textHeight + 'px Arial';
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
    return textHeight;
  }

  insertTitle(text, left, top, width, height, zIndex) {
		let title = document.createElement('div');
		title.title = text;
		title.style.left = left;
		title.style.top = top;
		title.style.width = width;
		title.style.height = height;
		title.style.position = 'absolute';
		title.style.zIndex = zIndex;
		this.trackTitle.appendChild(title);
  }

  drawTracks (region) {
    $.getJSON($SCRIPT_ROOT + '/_gettrackdata', {
      region: region,
      width: this.trackCanvas.width,
    }, function(result) {
      const featureHeight = 20;
      const featureMargin = 14;
      const yPos = featureHeight / 2;
      const scale = tc.trackCanvas.width / (result['end_pos'] - result['start_pos']);
      const titleMargin = 2;

      // Go through results and draw appropriate symbols
      for (let i = 0; i < result['tracks'].length; i++) {
        const track = result['tracks'][i];
        const geneName = track['gene_name']
        const transcriptID = track['transcript_id']
        const seqname = track['seqname']
        const height_order = track['height_order']
        const strand = track['strand']
        const start = track['start']
        const end = track['end']

        const adjustedYPos = yPos + (height_order - 1) * (featureHeight + featureMargin);

        tc.drawTrackLen(scale * (start - result['start_pos']),
          scale * (end - result['start_pos']), adjustedYPos);

        const textHeight = tc.drawGeneName(geneName, scale * ((start + end) / 2 - result['start_pos']),
          adjustedYPos + featureHeight);

        // Add title text for whole gene
        const geneText = geneName + '\n' + 'chr' + seqname + ':' + start + '-' + end + '\n' + 'id = ' + transcriptID;
        tc.insertTitle(geneText,
          titleMargin + scale * (start - result['start_pos']) + 'px',
          titleMargin + adjustedYPos - featureHeight / 2 + 'px',
          scale * (end - start) + 'px',
          featureHeight + textHeight + 'px',
          0);

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
              let exonText = geneText + '\n' + '-'.repeat(30) + '\nExon number: ' + feature['exon_number'] +
                '\nchr' + seqname + ':' + feature['start'] + '-' + feature['end'];
              // Add title text for whole gene
              tc.insertTitle(exonText,
                titleMargin + scale * (feature['start'] - result['start_pos']) + 'px',
                titleMargin + adjustedYPos - featureHeight / 2 + 'px',
                scale * (feature['end'] - feature['start']) + 'px',
                featureHeight + 'px',
                1);

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
