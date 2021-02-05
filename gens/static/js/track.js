// Generic functions related to annotation tracks
class Track {
  constructor (width, near, far, visibleHeight, minHeight, colorSchema) {
    // Track variables
    this.featureHeight = 20; // Max height for feature
    this.featureMargin = 14; // Margin for fitting gene name under track
    this.yPos = this.featureHeight / 2; // First y-position
    this.arrowColor =  'white';
    this.arrowWidth = 4;
    this.arrowDistance = 200;
    this.arrowThickness = 1;
    this.expanded = false;
    this.colorSchema = colorSchema;

    // Dimensions of track canvas
    this.width = width; // Width of displayed canvas
    this.drawCanvasMultiplier = 3;
    this.maxHeight = 16000; // Max height of canvas
    this.visibleHeight = visibleHeight; // Visible height for expanded canvas, overflows for scroll
    this.minHeight = minHeight; // Minimized height

    // Canvases
    this.trackCanvas = null; // Set in parent class
    this.trackTitle = null; // Set in parent class
    this.trackContainer = null; // Set in parent class
    // Canvases for static content
    this.staticCanvas = null;
    this.trackData = null;
  }

  tracksYPos(height_order) {
    return this.yPos + (height_order - 1) * (this.featureHeight + this.featureMargin)
  };

  setupHTML(xPos) {
    this.staticCanvas.style.width = this.width + 'px';
    // Setup variant canvas
    this.trackContainer.style.marginLeft = xPos + 'px';
    this.trackContainer.style.width = this.width + 'px';

    // Setup initial track Canvas
    this.trackContext = this.trackCanvas.getContext('2d');
    this.trackCanvas.width = this.width * this.drawCanvasMultiplier;
    this.trackCanvas.height = this.minHeight;
    this.staticCanvas.width = this.width;
    this.staticCanvas.height = this.minHeight;

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

  panTracksLeft() {
  }

  panTracksRight() {
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
  async drawText(text, xPos, yPos, textHeight, latest_name_end) {
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
  drawLine (xStart, xStop, yPos, color, lineWidth=2) {
    console.log(`Plot line from: ${xStart}, to: ${xStop}; width: ${lineWidth}; color: ${color}`)
    if (![xStart, xStop, yPos].every(n => typeof(n) == 'number')) {
      throw `Invalid coordinates start: ${xStart}, stop: ${xStop}, yPos: ${yPos}; Cant draw line`
    }
    this.trackContext.save();
    this.trackContext.strokeStyle = color;
    this.trackContext.lineWidth = lineWidth;
    this.trackContext.beginPath();
    this.trackContext.moveTo(xStart, yPos);
    this.trackContext.lineTo(xStop, yPos);
    this.trackContext.stroke();
    this.trackContext.restore();
  }

  // Draw a wave line from xStart to xStop at yPos where yPos is top left of the line.
  // Pattern is drawn by incrementing pointer by a half wave length and plot either
  // upward (/) or downward (\) line.
  // if the end is trunctated a partial wave is plotted.
  drawWaveLine (xStart, xStop, yPos, height, color, lineWidth=2) {
    console.log(`Plot wave from: ${xStart}, to: ${xStop}, hegith: ${height}; width: ${lineWidth}; color: ${color}`)
    if (![xStart, xStop, yPos, height].every(n => typeof(n) == 'number')) {
      throw `Invalid coordinates start: ${xStart}, stop: ${xStop}, yPos: ${yPos}; Cant draw line`
    }
    this.trackContext.save();
    this.trackContext.strokeStyle = color;
    this.trackContext.lineWidth = lineWidth;
    this.trackContext.beginPath();
    console.log(`Move pointer to: ${xStart}, ${yPos}`)
    this.trackContext.moveTo(xStart, yPos);  // begin at bottom left
    const waveLength = 2 * (height / Math.tan(45));
    const lineLength = xStop - xStart + 1;
    console.log(`Start pos: ${xStart}, ${yPos}; Height: ${height}; WaveLength: ${waveLength}; Line len: ${lineLength}`)
    // plot whole wave pattern
    let midline = yPos - height / 2 // middle of line
    let lastXpos = xStart;
    console.log(`Plot ${Math.floor(lineLength / (waveLength / 2))} full wave pattens`)
    for (let i = 0; i < Math.floor(lineLength / (waveLength / 2)); i++){
      lastXpos += waveLength / 2;
      height *= -1  // reverse sign
      this.trackContext.lineTo(lastXpos, midline + height / 2); // move up
    }
    // plot partial wave patterns
    const partialWaveLength = lineLength % (waveLength / 2);
    if (partialWaveLength != 0) {
      height *= -1  // reverse sign
      let partialWaveHeight = partialWaveLength * Math.tan(45);
      this.trackContext.lineTo(xStop, yPos - Math.sign(height) * partialWaveHeight);
      console.log(`Plot partial wave: ${partialWaveHeight}; Height: ${height}`)
    }
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
    const width = stop - start;
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

  // Calculate offscreen position
  calculateOffscreenWindiowPos(start, end) {
    const width = end - start
    const padding = ((width * this.drawCanvasMultiplier) - width) / 2;
    const paddedStart = start - padding;
    const paddedEnd = end + padding;
    return {start: paddedStart, end: paddedEnd};
  }

  async drawTracks(region) {
    // TODO migrate from region sting to object
    const chromosome = region.split(':')[0];
    let [start, end] = region.split(':')[1].split('-');
    start = parseInt(start);
    end = parseInt(end);
    const width = end - start + 1;
    //  verify that either data is loaded or the right chromosome is loaded
    if ( !this.trackData || this.trackData !== chromosome ) {
      this.trackData = await get(
        this.apiEntrypoint,
        Object.assign({
          sample_id: oc.sampleName,
          region: region,
          hg_type: this.hgType,
          collapsed: this.expanded ? false : true
        }, this.additionalQueryParams)
      )
    }
    // redraw offscreen canvas if,
    // 1. not drawn before;
    // 2. if onscreen canvas close of offscreen canvas edge
    // 3. size of region has been changed, zoom in or out
    if ( !this.offscreenPosition.start ||
         start < this.offscreenPosition.start + width ||
         this.offscreenPosition.end - width < end ||
         this.offscreenPosition.scale !== this.staticCanvas.width / (end - start)
       ) {
      const offscreenPos = this.calculateOffscreenWindiowPos(start, end);
      // draw offscreen position for the first time
      await this.drawOffScreenTracks({
        chromosome: this.trackData.chromosome,
        start_pos: offscreenPos.start,
        end_pos: offscreenPos.end,
        rawStart: start,
        rawEnd: end,
        max_height_order: this.trackData.max_height_order,
        data: this.trackData,
      });
    }
    //  blit image from offscreen canvas to onscreen canvas
    this.blitCanvas(start, end);
  }

  blitCanvas(chromStart, chromEnd) {
    // blit drawCanvas to content canvas.
    // clear current canvas
    this.staticCanvas
      .getContext('2d')
      .clearRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);
    const width = chromEnd - chromStart + 1;
    // normalize the genomic coordinates to screen coordinates
    const ctx = this.staticCanvas.getContext('2d');
    ctx.drawImage(
      this.trackCanvas,  // source image
      (chromStart - this.offscreenPosition.start + 1) * this.offscreenPosition.scale,  // sx
      0,                 // sY
      width * this.offscreenPosition.scale,  // sWidth
      this.maxHeight,    // sHeight
      0,                 // dX
      0,                 // dY
      this.staticCanvas.width,  // dWidth
      this.maxHeight,    //dHeight
    );
  }
}
