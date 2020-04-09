class Track {
  constructor (width, near, far, visibleHeight, minHeight) {
    // Track variables
    this.featureHeight = 20; // Max height for feature
    this.featureMargin = 14; // Margin for fitting gene name under track
    this.yPos = this.featureHeight / 2; // First y-position
    this.tracksYPos = function(height_order) { return this.yPos + (height_order - 1) * (this.featureHeight + this.featureMargin)};
    this.arrowColor =  'white';
    this.arrowWidth = 4;
    this.arrowDistance = 200;
    this.arrowThickness = 1;
    this.expanded = false;

    // Dimensions of track canvas
    this.width = width; // Width of canvas
    this.maxHeight = 16000; // Max height of canvas
    this.visibleHeight = visibleHeight; // Visible height for expanded canvas, overflows for scroll
    this.minHeight = minHeight; // Minimized height

    // Canvases
    this.trackCanvas = null; // Set in parent class
    this.trackTitle = null; // Set in parent class
    this.trackContainer = null; // Set in parent class
  }

  setupHTML(xPos) {
    // Setup container
    this.trackContainer.style.marginLeft = xPos + 'px';
    this.trackContainer.style.width = this.width + 'px';

    // Setup initial track Canvas
    this.trackContext = this.trackCanvas.getContext('2d');
    this.trackCanvas.width = this.width;
    this.trackCanvas.height = this.minHeight;

    // Setup track div
    this.trackTitle.style.width = this.width + 'px';
    this.trackTitle.style.height = this.minHeight + 'px';

    // Setup context menu
    this.trackContainer.addEventListener('contextmenu',
      (event) => {
        event.preventDefault();

        // Toggle between expanded/collapsed view
        this.expanded = !this.expanded;

        this.drawTracks(inputField.value);
      }, false);
  }

  // Clears previous tracks
  clearTracks() {
    // Clear canvas
    this.trackContext.clearRect(0, 0, this.trackCanvas.width, this.trackCanvas.height);

    // Clear tooltip titles
    $('#' + this.trackTitle.id).empty();
  }

  // Sets the container height depending on maximum height of tracks
  setContainerHeight(maxHeightOrder) {
    if (maxHeightOrder == 0) {
      // No results, do not show tracks
      this.trackCanvas.height = 0;
      this.trackTitle.style.height = 0 + 'px';
      this.trackContainer.style.height = 0 + 'px';
      this.trackContainer.setAttribute('data-state', 'nodata');
    } else if (this.expanded) {
      // Set variables for an expanded view
      const maxYPos = this.tracksYPos(maxHeightOrder + 1);
      this.trackCanvas.height = maxYPos;
      this.trackTitle.style.height = maxYPos + 'px';
      this.trackContainer.style.height = this.visibleHeight + 'px';
      this.trackContainer.setAttribute('data-state', 'expanded');
    } else {
      // Set variables for a collapsed view
      this.trackCanvas.height = this.minHeight;
      this.trackTitle.style.height = this.minHeight + 'px';
      this.trackContainer.style.height = this.minHeight + 'px';
      this.trackContainer.setAttribute('data-state', 'collapsed');
    }
  }

  // Draws text underneath a track box
  drawText(text, xPos, yPos, textHeight, latest_name_end) {
    this.trackContext.save();
    this.trackContext.font = 'bold ' + textHeight + 'px Arial';
    this.trackContext.fillStyle = 'black';

    // Center text
    let textWidth = this.trackContext.measureText(text).width;
    xPos = xPos - textWidth / 2;

    // Cap text to outer edges
    xPos = xPos < 0 ? 0 : xPos;
    if (xPos >= this.trackCanvas.width - textWidth) {
      xPos = this.trackCanvas.width - textWidth;
    }
    if (xPos < latest_name_end) {
      return latest_name_end;
    }

    this.trackContext.fillText(text, xPos, yPos);
    this.trackContext.restore();
    return xPos + textWidth;
  }

  // Inserts a hover text for a track
  hoverText(text, left, top, width, height, zIndex, latest_pos) {
    // Make div wider for more mouse over space
    let minWidth = 1;
    if (parseInt(width) < minWidth && (parseInt(left) - minWidth / 2) > latest_pos) {
      left = parseInt(left) - minWidth / 2 + 'px';
      width = minWidth + 'px';
    }

    let title = document.createElement('div');
    title.title = text;
    title.style.left = left;
    title.style.top = top;
    title.style.width = width;
    title.style.height = height;
    title.style.position = 'absolute';
    title.style.zIndex = zIndex;
    this.trackTitle.appendChild(title);
    return parseInt(left + width);
  }

  // Draw a line from xStart to xStop at yPos
  drawLine (xStart, xStop, yPos, color) {
    this.trackContext.save();
    this.trackContext.strokeStyle = color;
    this.trackContext.lineWidth = 2;
    this.trackContext.beginPath();
    this.trackContext.moveTo(xStart, yPos);
    this.trackContext.lineTo(xStop, yPos);
    this.trackContext.stroke();
    this.trackContext.restore();
  }

  // Draws a box
  drawBox (xpos, ypos, width, height, color) {
    this.trackContext.save();
    this.trackContext.fillStyle = color;
    this.trackContext.beginPath();
    this.trackContext.rect(xpos, ypos - height / 2, width, height);
    this.trackContext.fill();
    this.trackContext.restore();
  }

  // Draw arrows for a segment
  drawArrows(start, stop, yPos, direction, color) {
    // Calculate width of a segment to draw the arrow in
    const width = stop - start
    if (width < this.arrowWidth) {
      // Arrow does not fit, do nothing
      return;
    } else if (width <= this.arrowDistance) {
      // Draw one arrow in the middle
      this.drawArrow(start + (stop - start) / 2, yPos, direction,
        this.featureHeight / 2, color);
    } else {
      // Draw many arrows
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
    this.trackContext.save();
    this.trackContext.strokeStyle = color;
    this.trackContext.lineWidth = this.arrowThickness;
    this.trackContext.beginPath();
    this.trackContext.moveTo(xpos - width / 2, ypos - height / 2);
    this.trackContext.lineTo(xpos + width / 2, ypos);
    this.trackContext.moveTo(xpos + width / 2, ypos);
    this.trackContext.lineTo(xpos - width / 2, ypos + height / 2);
    this.trackContext.stroke();
    this.trackContext.restore();
  }
}
