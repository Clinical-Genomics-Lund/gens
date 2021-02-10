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
    this.width = Math.round(width); // Width of displayed canvas
    this.drawCanvasMultiplier = 10;
    this.maxHeight = 16000; // Max height of canvas
    this.visibleHeight = visibleHeight; // Visible height for expanded canvas, overflows for scroll
    this.minHeight = minHeight; // Minimized height

    // Canvases
    // the drawCanvas is used to draw objects offscreen
    // the region to be displayed is blitted to the onscreen contentCanvas
    this.trackTitle = null;     // Set in parent class
    this.trackContainer = null; // Set in parent class
    this.drawCanvas = null;    // Set in parent class
    // Canvases for static content
    this.contentCanvas = null;
    this.trackData = null;

    // Store coordinates of offscreen canvas
    this.offscreenPosition = {start: null, end: null, scale: null};
    this.onscreenPosition = {start: null, end: null};
  }

  // parse chromosomal region designation string
  // return chromosome, start and end position
  // eg 1:12-220 --> 1, 12 220
  parseRegionDesignation(regionString)  {
    const chromosomes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
      '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21',
      '22', 'X', 'Y']
    const chromosome = regionString.split(':')[0];
    if ( !chromosomes.includes(chromosome) ) {
      throw `${chromosome} is not a valid chromosome`;
    }
    let [start, end] = regionString.split(':')[1].split('-');
    start = parseInt(start);
    end = parseInt(end);
    return [chromosome, start, end];
  }

  tracksYPos(height_order) {
    return this.yPos + (height_order - 1) * (this.featureHeight + this.featureMargin)
  };

  setupHTML(xPos) {
    this.contentCanvas.style.width = this.width + 'px';
    // Setup variant canvas
    this.trackContainer.style.marginLeft = xPos + 'px';
    this.trackContainer.style.width = this.width + 'px';

    // Setup initial track Canvas
    this.drawCtx = this.drawCanvas.getContext('2d');
    this.drawCanvas.width = this.width * this.drawCanvasMultiplier;
    this.drawCanvas.height = this.minHeight;
    this.contentCanvas.width = this.width;
    this.contentCanvas.height = this.minHeight;

    // Setup track div
    this.trackTitle.style.width = this.width + 'px';
    this.trackTitle.style.height = this.minHeight + 'px';

    // Setup context menu
    this.trackContainer.addEventListener('contextmenu',
      (event) => {
        event.preventDefault();

        // Toggle between expanded/collapsed view
        this.expanded = !this.expanded;
        this.drawTrack(inputField.value);
      }, false);
  }

  // Clears previous tracks
  clearTracks() {
    // Clear canvas
    this.drawCtx.clearRect(0, 0, this.drawCanvas.width, this.drawCanvas.height);

    // Clear tooltip titles
    this.trackTitle.innerHTML = '';
  }

  // Sets the container height depending on maximum height of tracks
  setContainerHeight(maxHeightOrder) {
    if (maxHeightOrder == 0) {
      // No results, do not show tracks
      this.drawCanvas.height = 0;
      this.trackTitle.style.height = 0 + 'px';
      this.trackContainer.style.height = 0 + 'px';
      this.trackContainer.setAttribute('data-state', 'nodata');
    } else if (this.expanded) {
      // Set variables for an expanded view
      const maxYPos = this.tracksYPos(maxHeightOrder + 1);
      this.drawCanvas.height = maxYPos;
      this.trackTitle.style.height = maxYPos + 'px';
      this.trackContainer.style.height = this.visibleHeight + 'px';
      this.trackContainer.setAttribute('data-state', 'expanded');
    } else {
      // Set variables for a collapsed view
      this.drawCanvas.height = this.minHeight;
      this.trackTitle.style.height = this.minHeight + 'px';
      this.trackContainer.style.height = this.minHeight + 'px';
      this.trackContainer.setAttribute('data-state', 'collapsed');
    }
  }

  // Draws text underneath a track box
  async drawText(text, xPos, yPos, textHeight, latest_name_end) {
    this.drawCtx.save();
    this.drawCtx.font = 'bold ' + textHeight + 'px Arial';
    this.drawCtx.fillStyle = 'black';

    // Center text
    let textWidth = this.drawCtx.measureText(text).width;
    xPos = xPos - textWidth / 2;

    // Cap text to outer edges
    xPos = xPos < 0 ? 0 : xPos;
    if (xPos >= this.drawCanvas.width - textWidth) {
      xPos = this.drawCanvas.width - textWidth;
    }
    if (xPos < latest_name_end) {
      return latest_name_end;
    }

    this.drawCtx.fillText(text, xPos, yPos);
    this.drawCtx.restore();
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
    this.drawCtx.save();
    this.drawCtx.strokeStyle = color;
    this.drawCtx.lineWidth = lineWidth;
    this.drawCtx.beginPath();
    this.drawCtx.moveTo(xStart, yPos);
    this.drawCtx.lineTo(xStop, yPos);
    this.drawCtx.stroke();
    this.drawCtx.restore();
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
    this.drawCtx.save();
    this.drawCtx.strokeStyle = color;
    this.drawCtx.lineWidth = lineWidth;
    this.drawCtx.beginPath();
    console.log(`Move pointer to: ${xStart}, ${yPos}`)
    this.drawCtx.moveTo(xStart, yPos);  // begin at bottom left
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
      this.drawCtx.lineTo(lastXpos, midline + height / 2); // move up
    }
    // plot partial wave patterns
    const partialWaveLength = lineLength % (waveLength / 2);
    if (partialWaveLength != 0) {
      height *= -1  // reverse sign
      let partialWaveHeight = partialWaveLength * Math.tan(45);
      this.drawCtx.lineTo(xStop, yPos - Math.sign(height) * partialWaveHeight);
      console.log(`Plot partial wave: ${partialWaveHeight}; Height: ${height}`)
    }
    this.drawCtx.stroke();
    this.drawCtx.restore();
  }

  // Draws a box
  drawBox (xpos, ypos, width, height, color) {
    this.drawCtx.save();
    this.drawCtx.fillStyle = color;
    this.drawCtx.beginPath();
    this.drawCtx.rect(xpos, ypos - height / 2, width, height);
    this.drawCtx.fill();
    this.drawCtx.restore();
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
    this.drawCtx.save();
    this.drawCtx.strokeStyle = color;
    this.drawCtx.lineWidth = this.arrowThickness;
    this.drawCtx.beginPath();
    this.drawCtx.moveTo(xpos - width / 2, ypos - height / 2);
    this.drawCtx.lineTo(xpos + width / 2, ypos);
    this.drawCtx.moveTo(xpos + width / 2, ypos);
    this.drawCtx.lineTo(xpos - width / 2, ypos + height / 2);
    this.drawCtx.stroke();
    this.drawCtx.restore();
  }

  // Calculate offscreen position
  calculateOffscreenWindiowPos(start, end) {
    const width = end - start
    const padding = ((width * this.drawCanvasMultiplier) - width) / 2;
    const paddedStart = start - padding;
    const paddedEnd = end + padding;
    return {start: paddedStart, end: paddedEnd};
  }

  // Draw annotation track
  // the first time annotation data is cached for given chromosome
  // and a larger region is rendered on an offscreen canvas
  // if new chromosome selected --> cache all annotations for chrom
  // if new region in offscreen canvas --> blit image
  // if new region outside offscreen canvas --> redraw offscreen using cache
  async drawTrack(regionString) {
    let [chromosome, start, end] = this.parseRegionDesignation(regionString);
    const width = end - start + 1;
    let updatedData = false;
    //  verify that
    //  1. data is loaded
    //  2. right chromosome is loaded
    //  3. right expansion
    if ( !this.trackData ||
         this.trackData.chromosome !== chromosome ||
         this.trackData.expanded != this.expanded ) {
      this.trackData = await get(
        this.apiEntrypoint,
        Object.assign({  // build query parameters
          sample_id: oc.sampleName,
          region: regionString,
          hg_type: this.hgType,
          collapsed: this.expanded ? false : true
        }, this.additionalQueryParams)  // parameters specific to track type
      )
      this.trackData.expanded = this.expanded;
      start = this.trackData.start_pos
      end = this.trackData.end_pos
      updatedData = true;
    }
    // redraw offscreen canvas if,
    // 1. not drawn before;
    // 2. if onscreen canvas close of offscreen canvas edge
    // 3. size of region has been changed, zoom in or out
    if ( !this.offscreenPosition.start ||
         start < this.offscreenPosition.start + width ||
         this.offscreenPosition.end - width < end ||
         this.offscreenPosition.scale !== this.contentCanvas.width / (end - start) ||
         updatedData
       ) {
      const offscreenPos = this.calculateOffscreenWindiowPos(start, end);
      // draw offscreen position for the first time
      await this.drawOffScreenTrack({
        chromosome: this.trackData.chromosome,
        start_pos: offscreenPos.start,
        end_pos: offscreenPos.end,
        queryStart: start,
        queryEnd: end ? end : offscreenPos.end,  // default to chromosome end
        max_height_order: this.trackData.max_height_order,
        data: this.trackData,
      });
    }
    //  blit image from offscreen canvas to onscreen canvas
    this.blitCanvas(start, end);
  }

  // blit drawCanvas to content canvas.
  blitCanvas(chromStart, chromEnd) {
    // blit drawCanvas to content canvas.
    // clear current canvas
    const ctx = this.contentCanvas.getContext('2d');
    ctx.clearRect(0, 0, this.contentCanvas.width,
                  this.contentCanvas.height);
    const width = chromEnd - chromStart;
    this.onscreenPosition = {start: chromStart, end: chromEnd};  // store onscreen coords

    // Debugging
    const offscreenOffset = Math.round((chromStart - this.offscreenPosition.start) * this.offscreenPosition.scale)
    const elementWidth = Math.round(width * this.offscreenPosition.scale)

    // normalize the genomic coordinates to screen coordinates
    ctx.drawImage(
      this.drawCanvas,  // source image
      offscreenOffset,  // sX
      0,                 // sY
      elementWidth,  // sWidth
      this.maxHeight,    // sHeight
      0,                 // dX
      0,                 // dY
      this.contentCanvas.width,  // dWidth
      this.maxHeight,    //dHeight
    );
  }

  // NAVIGATION
  //

  // Pan tracks x number of nt
  panTracksRight(ntDistance) {
    const start = this.onscreenPosition.start - ntDistance;
    const end = this.onscreenPosition.end - ntDistance;
    this.drawTrack(`${this.trackData.chromosome}:${start}-${end}`)
  }

  panTracksLeft(ntDistance) {
    const start = this.onscreenPosition.start + ntDistance;
    const end = this.onscreenPosition.end + ntDistance;
    this.drawTrack(`${this.trackData.chromosome}:${start}-${end}`)
  }
}
