// Generic functions related to drawing annotation tracks

import { get } from '../fetch.js'
import { hideTooltip } from './tooltip.js'

// Calculate offscreen position
export function calculateOffscreenWindowPos ({ start, end, multiplier }) {
  const width = end - start
  const padding = ((width * multiplier) - width) / 2
  // const paddedStart = (start - padding) > 0 ? (start - padding) : 1;
  return {
    start: Math.round(start - padding), end: Math.round(end + padding)
  }
}

// function for shading and blending colors on the fly
export function lightenColor (color, percent) {
  const num = parseInt(color.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const red = (num >> 16) + amt
  const blue = (num >> 8 & 0x00FF) + amt
  const green = (num & 0x0000FF) + amt
  return '#' + (0x1000000 + (red < 255 ? red < 1 ? 0 : red : 255) * 0x10000 + (blue < 255 ? blue < 1 ? 0 : blue : 255) * 0x100 + (green < 255 ? green < 1 ? 0 : green : 255)).toString(16).slice(1)
};

export class BaseScatterTrack {
  constructor ({ caseId, sampleName, genomeBuild, hgFileDir }) {
    // setup IO
    this.caseId = caseId // Case id to use for querying data
    this.sampleName = sampleName // File name to load data from
    this.genomeBuild = genomeBuild // Whether to load HG37 or HG38, default is HG38
    this.hgFileDir = hgFileDir // File directory
    // Border
    this.borderColor = '#666' // Color of border
    this.titleColor = 'black' // Color of titles/legends
    // Setup canvas
    this.drawCanvas = document.createElement('canvas')
    this.context = this.drawCanvas.getContext('2d')
  }
}

export class BaseAnnotationTrack {
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
    this.geneticElements = [] // for tooltips
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
      this.drawTrack({...event.detail.region})
    })
    // Setup context menu
    this.trackContainer.addEventListener('contextmenu',
      async (event) => {
        event.preventDefault()
        // hide all tooltips
        for (const element of this.geneticElements) {
          if (element.tooltip) hideTooltip(element.tooltip)
        }
        // Toggle between expanded/collapsed view
        this.expanded = !this.expanded
        // set datastate for css
        if (this.expanded) {
          this.trackContainer.setAttribute('data-state', 'expanded')
        } else {
          this.trackContainer.setAttribute('data-state', 'collapsed')
        }
        await this.drawOffScreenTrack({
          startPos: this.offscreenPosition.start,
          endPos: this.offscreenPosition.end,
          maxHeightOrder: this.expanded ? this.trackData.max_height_order : 1,
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
          genome_build: this.genomeBuild,
          collapsed: false // allways get all height orders
        }, this.additionalQueryParams) // parameters specific to track type
      )
      // disable track if data loading encountered an error
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
      const offscreenPos = calculateOffscreenWindowPos({
        start: start, end: end, multiplier: this.drawCanvasMultiplier
      })
      // draw offscreen position for the first time
      await this.drawOffScreenTrack({
        startPos: offscreenPos.start,
        endPos: offscreenPos.end,
        maxHeightOrder: this.trackData.max_height_order,
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
