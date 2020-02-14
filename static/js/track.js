class Track {
  constructor (width, near, far, maxRows, visibleHeight, minHeight) {
    // Track variables
    this.featureHeight = 20; // Max height for feature
    this.featureMargin = 14; // Margin for fitting gene name under track
    this.yPos = this.featureHeight / 2; // First y-position
    this.tracksYPos = function(height_order) { return this.yPos + (height_order - 1) * (this.featureHeight + this.featureMargin)};
    this.arrowColor =  0x0000ff;
    this.arrowWidth = 4;
    this.arrowDistance = 200;
    this.expanded = false;

    // Dimensions of track canvas
    this.width = width; // Width of canvas
    this.maxHeight = this.tracksYPos(maxRows); // Max height of canvas, height_order <= 66
    this.visibleHeight = visibleHeight; // Visible height for expanded canvas, overflows for scroll
    this.minHeight = minHeight; // Minimized height

    // Canvases
    this.drawCanvas = new OffscreenCanvas(this.width, this.maxHeight);
    this.context = this.drawCanvas.getContext('webgl2');
    this.trackCanvas = null; // Set in parent class
    this.trackTitle = null; // Set in parent class
    this.trackContainer = null; // Set in parent class
  }

  setupHTML(xPos) {
    // Setup container
    this.trackContainer.style.marginLeft = xPos + 'px';

    // Setup initial track Canvas
    this.trackContext = this.trackCanvas.getContext('2d');
    this.trackCanvas.width = this.width;
    this.trackCanvas.height = this.minHeight;

    // Setup track div
    this.trackTitle.style.width = this.width + 'px';
    this.trackTitle.style.height = this.minHeight + 'px';

    // Scene variables
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(this.width / -2,
      this.width / 2, this.maxHeight / -2,
      this.maxHeight / 2, near, far);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.drawCanvas,
      context: this.context,
      antialiasing: true
    });

    // Change to fourth quadrant of scene
    this.camera.position.set(this.width / 2 - lineMargin,
      this.maxHeight / 2 - lineMargin, 1);

    // Setup context menu
    this.trackContainer.addEventListener('contextmenu',
      (event) => {
        event.preventDefault();

        // Toggle between expanded/collapsed view
        this.expanded = !this.expanded;
        this.clearTracks();
        this.drawTracks(inputField.value);
      }, false);
  }

  clearTracks() {
    // Clear canvas
    this.trackContext.clearRect(0, 0, this.trackCanvas.width, this.trackCanvas.height);

    // Clear tooltip titles
    $('#' + this.trackTitle.id).empty();
  }

  setContainerHeight(maxHeightOrder) {
    if (maxHeightOrder == 0) {
      // No results, do not show tracks
      this.trackCanvas.height = 0;
      this.trackTitle.style.height = 0 + 'px';
      this.trackContainer.style.height = 0 + 'px';
    } else if (this.expanded) {
      const maxYPos = this.tracksYPos(maxHeightOrder + 1);
      this.trackCanvas.height = maxYPos;
      this.trackTitle.style.height = maxYPos + 'px';
      this.trackContainer.style.height = this.visibleHeight + 'px';
    } else {
      this.trackCanvas.height = this.minHeight;
      this.trackTitle.style.height = this.minHeight + 'px';
      this.trackContainer.style.height = this.minHeight + 'px';
    }
  }

  drawGeneName(geneName, xPos, yPos, textHeight, latest_name_end) {
    this.trackContext.save();
    this.trackContext.font = 'bold ' + textHeight + 'px Arial';
    this.trackContext.fillStyle = 'black';

    // Center text
    let textWidth = this.trackContext.measureText(geneName).width;
    xPos = xPos - textWidth / 2;

    // Cap text to outer edges
    xPos = xPos < 0 ? 0 : xPos;
    if (xPos >= this.trackCanvas.width - textWidth) {
      xPos = this.trackCanvas.width - textWidth;
    }
    console.log(xPos, latest_name_end);
    if (xPos < latest_name_end) {
      return latest_name_end;
    }

    this.trackContext.fillText(geneName, xPos, yPos);
    this.trackContext.restore();
    return xPos + textWidth;
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

  drawTrackLen (xStart, xStop, yPos, color) {
    // Draw exon at input center position
    var line = new THREE.Geometry();
    line.vertices.push(
      new THREE.Vector3(xStart, yPos, 0),
      new THREE.Vector3(xStop, yPos, 0)
    );

    var material = new THREE.LineBasicMaterial({color: color});
    line = new THREE.Line(line, material);
    this.scene.add(line);
  }

  drawBand (xpos, ypos, width, height, color) {
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

    var material = new THREE.MeshBasicMaterial({color: color});
    rectangle = new THREE.Mesh(rectangle, material);
    this.scene.add(rectangle);
  }

  drawArrows(start, stop, yPos, direction, color) {
    const width = stop - start
    if (width < this.arrowWidth) {
      // Arrow does not fit, do nothing
      return;
    } else if (width <= this.arrowDistance) {
      // Draw one arrow in the middle
      this.drawArrow(start + (stop - start) / 2, yPos, direction,
        this.featureHeight / 2, color);
    } else {
      for (let pos = start + this.arrowWidth;
        pos < stop - this.arrowWidth; pos += this.arrowDistance) {
        // Draw several arrows
        this.drawArrow(pos, yPos, direction, this.featureHeight / 2, color);
      }
    }
  }

  // Draw an arrow in desired direction
  // Forward arrow: direction = 1
  // Reverse arrow: direction = -1
  drawArrow (xpos, ypos, direction, height, color) {
    let width = direction * this.arrowWidth;

    // Draw arrow symbol at around center position
    var line = new THREE.Geometry();
    line.vertices.push(
      new THREE.Vector3(xpos - width / 2, ypos - height / 2, 0),
      new THREE.Vector3(xpos + width / 2, ypos, 0),
      new THREE.Vector3(xpos - width / 2, ypos + height / 2, 0)
    );

    var material = new THREE.LineBasicMaterial({color: color});
    line = new THREE.Line(line, material);
    this.scene.add(line);
  }
}
