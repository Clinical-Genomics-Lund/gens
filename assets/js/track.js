// Generic functions related to drawing annotation tracks

import { get } from './fetch.js'

// Check if two geometries are overlapping
// each input is an object with start/ end coordinates
// f          >----------------<
// s   >---------<
export function isElementOverlapping (first, second) {
  if ((first.start > second.start && first.start < second.end) || //
       (first.end > second.start && first.end < second.end) ||
       (second.start > first.start && second.start < first.end) ||
       (second.end > first.start && second.end < first.end)) {
    return true
  }
  return false
}

// Calculate offscreen position
export function calculateOffscreenWindiowPos ({ start, end, multiplier }) {
  const width = end - start
  const padding = ((width * multiplier) - width) / 2
  // const paddedStart = (start - padding) > 0 ? (start - padding) : 1;
  return {
    start: Math.round(start - padding), end: Math.round(end + padding)
  }
}

export class Track {
  constructor (width, near, far, visibleHeight, minHeight, colorSchema) {
    // Track variables
    this.featureHeight = 20 // Max height for feature
    this.featureMargin = 14 // Margin for fitting gene name under track
    this.yPos = this.featureHeight / 2 // First y-position
    this.arrowColor = 'white'
    this.arrowWidth = 4
    this.arrowDistance = 200
    this.arrowThickness = 1
    this.expanded = false
    this.colorSchema = colorSchema
    // errors preventing fetching of data
    this.preventDrawingTrack = false

    // Dimensions of track canvas
    this.width = Math.round(width) // Width of displayed canvas
    this.drawCanvasMultiplier = 4
    this.maxHeight = 16000 // Max height of canvas
    this.visibleHeight = visibleHeight // Visible height for expanded canvas, overflows for scroll
    this.minHeight = minHeight // Minimized height

    // Canvases
    // the drawCanvas is used to draw objects offscreen
    // the region to be displayed is blitted to the onscreen contentCanvas
    this.trackContainer = null // Set in parent class
    this.drawCanvas = null // Set in parent class
    // Canvases for static content
    this.contentCanvas = null
    this.trackTitle = null // Set in parent class
    // data cache
    this.trackData = null

    // Store coordinates of offscreen canvas
    this.offscreenPosition = { start: null, end: null, scale: null }
    this.onscreenPosition = { start: null, end: null }

    // Max resolution
    this.maxResolution = 4
  }

  tracksYPos (heightOrder) {
    return this.yPos + (heightOrder - 1) * (this.featureHeight + this.featureMargin)
  };

  setupHTML (xPos) {
    this.contentCanvas.style.width = this.width + 'px'
    // Setup variant canvas
    this.trackContainer.style.marginLeft = xPos + 'px'
    this.trackContainer.style.width = this.width + 'px'
    // set xlabel
    this.trackContainer
      .parentElement
      .querySelector('.track-xlabel')
      .style
      .left = `${xPos - 60}px`

    // Setup initial track Canvas
    this.drawCtx = this.drawCanvas.getContext('2d')
    this.drawCanvas.width = this.width * this.drawCanvasMultiplier
    this.drawCanvas.height = this.maxHeight
    this.contentCanvas.width = this.width
    this.contentCanvas.height = this.minHeight

    // Setup track div
    this.trackTitle.style.width = this.width + 'px'
    this.trackTitle.style.height = this.minHeight + 'px'

    this.trackContainer.parentElement.addEventListener('draw', (event) => {
      console.log('track recived draw', event.detail.region)
      this.drawTrack({ ...event.detail.region })
    })
    // Setup context menu
    this.trackContainer.addEventListener('contextmenu',
      async (event) => {
        event.preventDefault()
        // Toggle between expanded/collapsed view
        this.expanded = !this.expanded
        // set datastate for css
        if (this.expanded) {
          this.trackContainer.setAttribute('data-state', 'expanded')
        } else {
          this.trackContainer.setAttribute('data-state', 'collapsed')
        }
        //  this.drawTrack(inputField.value);
        await this.drawOffScreenTrack({
          chromosome: this.trackData.chromosome,
          start_pos: this.offscreenPosition.start,
          end_pos: this.offscreenPosition.end,
          queryStart: this.onscreenPosition.start,
          queryEnd: this.onscreenPosition.end, // default to chromosome end
          max_height_order: this.expanded ? this.trackData.max_height_order : 1,
          data: this.trackData
        })
        this.blitCanvas(this.onscreenPosition.start, this.onscreenPosition.end)
      }, false)
  }

  // Clears previous tracks
  clearTracks () {
    // Clear canvas
    this.drawCtx.clearRect(0, 0, this.drawCanvas.width, this.drawCanvas.height)

    // Clear tooltip titles
    this.trackTitle.innerHTML = ''
  }

  // Sets the container height depending on maximum height of tracks
  setContainerHeight (maxHeightOrder) {
    if (maxHeightOrder === 0) {
      // No results, do not show tracks
      this.contentCanvas.height = 0
      this.trackTitle.style.height = '0px'
      this.trackContainer.style.height = '0px'
      // hide parent element
      this.trackContainer.parentElement.setAttribute('data-state', 'nodata')
    } else {
      this.trackContainer.parentElement.setAttribute('data-state', 'data')
      // controll track content
      if (this.expanded) {
        // Set variables for an expanded view
        const maxYPos = this.tracksYPos(maxHeightOrder + 1)
        this.contentCanvas.height = maxYPos
        this.drawCanvas.height = maxYPos
        this.trackTitle.style.height = `${maxYPos}px`
        this.trackContainer.style.height = `${this.visibleHeight}px`
        this.trackContainer.setAttribute('data-state', 'expanded')
      } else {
        // Set variables for a collapsed view
        this.contentCanvas.height = this.minHeight
        this.drawCanvas.height = this.minHeight
        this.trackTitle.style.height = `${this.minHeight}px`
        this.trackContainer.style.height = `${this.minHeight}px`
        this.trackContainer.setAttribute('data-state', 'collapsed')
      }
    }
  }

  // Draws text underneath a track box
  async drawText (text, xPos, yPos, textHeight, latestNameEnd) {
    this.drawCtx.save()
    this.drawCtx.font = 'bold ' + textHeight + 'px Arial'
    this.drawCtx.fillStyle = 'black'

    // Center text
    const textWidth = this.drawCtx.measureText(text).width
    xPos = xPos - textWidth / 2

    // Cap text to outer edges
    xPos = xPos < 0 ? 0 : xPos
    if (xPos >= this.drawCanvas.width - textWidth) {
      xPos = this.drawCanvas.width - textWidth
    }
    if (xPos < latestNameEnd) {
      return latestNameEnd
    }

    this.drawCtx.fillText(text, xPos, yPos)
    this.drawCtx.restore()
    return xPos + textWidth
  }

  // Inserts a hover text for a track
  hoverText (text, left, top, width, height, zIndex, latestPos) {
    // Make div wider for more mouse over space
    const minWidth = 1
    if (parseInt(width) < minWidth && (parseInt(left) - minWidth / 2) > latestPos) {
      left = parseInt(left) - minWidth / 2 + 'px'
      width = minWidth + 'px'
    }

    const title = document.createElement('div')
    title.title = text
    title.style.left = left
    title.style.top = top
    title.style.width = width
    title.style.height = height
    title.style.position = 'absolute'
    title.style.zIndex = zIndex
    this.trackTitle.appendChild(title)
    return parseInt(left + width)
  }

  // Draw a wave line from xStart to xStop at yPos where yPos is top left of the line.
  // Pattern is drawn by incrementing pointer by a half wave length and plot either
  // upward (/) or downward (\) line.
  // if the end is trunctated a partial wave is plotted.
  drawWaveLine (xStart, xStop, yPos, height, color, lineWidth = 2) {
    console.log(`Plot wave from: ${xStart}, to: ${xStop}, hegith: ${height}; width: ${lineWidth}; color: ${color}`)
    if (![xStart, xStop, yPos, height].every(n => typeof (n) === 'number')) {
      throw new Error(`Invalid coordinates start: ${xStart}, stop: ${xStop}, yPos: ${yPos}; Cant draw line`)
    }
    this.drawCtx.save()
    this.drawCtx.strokeStyle = color
    this.drawCtx.lineWidth = lineWidth
    this.drawCtx.beginPath()
    this.drawCtx.moveTo(xStart, yPos) // begin at bottom left
    const waveLength = 2 * (height / Math.tan(45))
    const lineLength = xStop - xStart + 1
    // plot whole wave pattern
    const midline = yPos - height / 2 // middle of line
    let lastXpos = xStart
    for (let i = 0; i < Math.floor(lineLength / (waveLength / 2)); i++) {
      lastXpos += waveLength / 2
      height *= -1 // reverse sign
      this.drawCtx.lineTo(lastXpos, midline + height / 2) // move up
    }
    // plot partial wave patterns
    const partialWaveLength = lineLength % (waveLength / 2)
    if (partialWaveLength !== 0) {
      height *= -1 // reverse sign
      const partialWaveHeight = partialWaveLength * Math.tan(45)
      this.drawCtx.lineTo(xStop, yPos - Math.sign(height) * partialWaveHeight)
    }
    this.drawCtx.stroke()
    this.drawCtx.restore()
  }

  // Draw arrows for a segment
  async drawArrows (start, stop, yPos, direction, color) {
    // Calculate width of a segment to draw the arrow in
    const width = stop - start
    if (width < this.arrowWidth) {
      // Arrow does not fit, do nothing

    } else if (width <= this.arrowDistance) {
      // Draw one arrow in the middle
      this.drawArrow(start + (stop - start) / 2, yPos, direction,
        this.featureHeight / 2, color)
    } else {
      // Draw many arrows
      for (let pos = start + this.arrowWidth;
        pos < stop - this.arrowWidth; pos += this.arrowDistance) {
        // Draw several arrows
        this.drawArrow(pos, yPos, direction, this.featureHeight / 2, color)
      }
    }
  }

  // Draw an arrow in desired direction
  // Forward arrow: direction = 1
  // Reverse arrow: direction = -1
  async drawArrow (xpos, ypos, direction, height, lineWidth = 2, color) {
    const width = direction * this.arrowWidth
    this.drawCtx.save()
    this.drawCtx.strokeStyle = color
    this.drawCtx.lineWidth = lineWidth
    this.drawCtx.beginPath()
    this.drawCtx.moveTo(xpos - width / 2, ypos - height / 2)
    this.drawCtx.lineTo(xpos + width / 2, ypos)
    this.drawCtx.moveTo(xpos + width / 2, ypos)
    this.drawCtx.lineTo(xpos - width / 2, ypos + height / 2)
    this.drawCtx.stroke()
    this.drawCtx.restore()
  }

  // Draw annotation track
  // the first time annotation data is cached for given chromosome
  // and a larger region is rendered on an offscreen canvas
  // if new chromosome selected --> cache all annotations for chrom
  // if new region in offscreen canvas --> blit image
  // if new region outside offscreen canvas --> redraw offscreen using cache
  async drawTrack ({ chrom, start, end, forceRedraw = false, hideWhileLoading = false }) {
    if (this.preventDrawingTrack) return // disable drawing track
    // store genomic position of the region to draw
    this.onscreenPosition.start = start
    this.onscreenPosition.end = end
    const width = end - start + 1
    let updatedData = false
    //  verify that
    //  1. data is loaded
    //  2. right chromosome is loaded
    //  3. right expansion
    if (!this.trackData ||
         this.trackData.chromosome !== chrom ||
         forceRedraw) {
      // hide track while loading
      if (hideWhileLoading) this.trackContainer.parentElement.setAttribute('data-state', 'nodata')
      // request new data
      this.trackData = await get(
        this.apiEntrypoint,
        Object.assign({ // build query parameters
          sample_id: oc.sampleName,
          region: `${chrom}:1-None`,
          hg_type: this.hgType,
          collapsed: false // allways get all height orders
        }, this.additionalQueryParams) // parameters specific to track type
      )
      if (this.trackData.status === 'error') {
        this.trackContainer.parentElement.setAttribute('data-state', 'nodata')
        this.preventDrawingTrack = true
        return
      }
      // the track data is used to determine the new start/ end positions
      end = end > this.trackData.end_pos ? this.trackData.end_pos : end
      updatedData = true
    }

    // redraw offscreen canvas if,
    // 1. not drawn before;
    // 2. if onscreen canvas close of offscreen canvas edge
    // 3. size of region has been changed, zoom in or out
    if (!this.offscreenPosition.start ||
         start < this.offscreenPosition.start + width ||
         this.offscreenPosition.end - width < end ||
         this.offscreenPosition.scale !== this.contentCanvas.width / (end - start) ||
         updatedData
    ) {
      const offscreenPos = calculateOffscreenWindiowPos({
        start: start, end: end, multiplier: this.drawCanvasMultiplier
      })
      // draw offscreen position for the first time
      await this.drawOffScreenTrack({
        chromosome: this.trackData.chromosome,
        start_pos: offscreenPos.start,
        end_pos: offscreenPos.end,
        queryStart: start,
        queryEnd: end || offscreenPos.end, // default to chromosome end
        max_height_order: this.trackData.max_height_order,
        data: this.trackData
      })
    }
    //  blit image from offscreen canvas to onscreen canvas
    this.blitCanvas(start, end)
  }

  // blit drawCanvas to content canvas.
  blitCanvas (chromStart, chromEnd) {
    // blit drawCanvas to content canvas.
    // clear current canvas
    const ctx = this.contentCanvas.getContext('2d')
    ctx.clearRect(0, 0, this.contentCanvas.width,
      this.contentCanvas.height)
    const width = chromEnd - chromStart
    this.onscreenPosition = { start: chromStart, end: chromEnd } // store onscreen coords

    // Debugging
    const offscreenOffset = Math.round((chromStart - this.offscreenPosition.start) * this.offscreenPosition.scale)
    const elementWidth = Math.round(width * this.offscreenPosition.scale)

    //  normalize the genomic coordinates to screen coordinates
    ctx.drawImage(
      this.drawCanvas, // source image
      offscreenOffset, // sX
      0, // sY
      elementWidth, // sWidth
      this.drawCanvas.height, // sHeight
      0, // dX
      0, // dY
      this.contentCanvas.width, // dWidth
      this.drawCanvas.height // dHeight
    )
  }

  //  Classify the resolution wich can be used chose when to display variants
  get getResolution () {
    const width = this.onscreenPosition.end - this.onscreenPosition.start + 1
    let resolution
    if (width > 5 * Math.pow(10, 7)) {
      resolution = 6
    } else if (width > 1.5 * Math.pow(10, 7)) {
      resolution = 5
    } else if (width > 4 * Math.pow(10, 6)) {
      resolution = 4
    } else if (width > 1 * Math.pow(10, 6)) {
      resolution = 3
    } else if (width > 2 * Math.pow(10, 5)) {
      resolution = 2
    } else {
      resolution = 1
    }
    return resolution
  }
}
