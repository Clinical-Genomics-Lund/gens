// Transcript definition

import { BaseAnnotationTrack, lightenColor } from './base.js'
import { initTrackTooltips, createTooltipElement, createHtmlList, makeVirtualDOMElement, updateVisableElementCoordinates } from './tooltip.js'
import { createPopper } from '@popperjs/core'
import { drawRect, drawLine, drawArrow, drawText } from '../draw.js'
import { getVisibleXCoordinates, isElementOverlapping } from './utils.js'

// add feature information to tooltipElement
function addFeatures (elem, tooltipElement) {
  const body = tooltipElement.querySelector('ul')
  for (const feature of elem.features) {
    // divide and conquer
    const featureContainer = document.createElement('div')
    featureContainer.id = `feature-${feature.exon_number}`
    featureContainer.classList.add('feature')
    featureContainer.appendChild(document.createElement('hr'))
    const information = [
      { title: 'exon', value: feature.exon_number },
      { title: 'position', value: `${feature.start}-${feature.end}` }
    ]
    featureContainer.appendChild(createHtmlList(information))
    body.appendChild(featureContainer)
  }
}

export class TranscriptTrack extends BaseAnnotationTrack {
  constructor (x, width, near, far, genomeBuild, colorSchema) {
    // Dimensions of track canvas
    const visibleHeight = 100 // Visible height for expanded canvas, overflows for scroll
    const minHeight = 35 // Minimized height

    super(width, near, far, visibleHeight, minHeight, colorSchema)

    // Set inherited variables
    this.drawCanvas = document.getElementById('transcript-draw')
    this.contentCanvas = document.getElementById('transcript-content')
    this.trackTitle = document.getElementById('transcript-titles')
    this.trackContainer = document.getElementById('transcript-track-container')

    // Setup html objects now that we have gotten the canvas and div elements
    this.setupHTML(x + 1)

    // GENS api parameters
    this.apiEntrypoint = 'get-transcript-data'

    this.genomeBuild = genomeBuild
    this.maxResolution = 4
    // Define with of the elements
    this.geneLineWidth = 2
    initTrackTooltips(this)
  }

  // draw feature
  _drawFeature (feature, heightOrder, canvasYPos,
    color, plotFormat) {
    // Go trough feature list and draw geometries
    const scale = this.offscreenPosition.scale
    // store feature rendering information
    const x = scale * (feature.start - this.offscreenPosition.start)
    const y = canvasYPos - this.featureHeight / 2
    const width = Math.round(scale * (feature.end - feature.start))
    const height = Math.round(this.featureHeight)
    // Draw the geometry that represents the feature
    if (feature.feature === 'exon') {
      // generate feature object
      const visibleCoords = getVisibleXCoordinates({
        canvas: this.onscreenPosition, feature: feature, scale: scale
      })
      const featureObj = {
        id: feature.exon_number,
        start: feature.start,
        end: feature.end,
        x1: Math.round(x),
        x2: Math.round(x + width),
        y1: Math.round(y),
        y2: Math.round(y + height),
        isDisplayed: false,
        visibleX1: visibleCoords.x1,
        visibleX2: visibleCoords.x2
      }
      drawRect({
        ctx: this.drawCtx,
        x: featureObj.x1,
        y: featureObj.y1,
        width: width,
        height: height,
        lineWidth: 1,
        fillColor: color,
        open: false
      })
      return featureObj
    }
  }

  // draw transcript figures
  async _drawTranscript (element, color, plotFormat,
    drawName = true, drawAsArrow = false, addTooltip = true) {
    const canvasYPos = this.tracksYPos(element.height_order)
    const scale = this.offscreenPosition.scale
    // sizes
    const textSize = plotFormat.textSize
    // store element metadata
    const transcriptObj = {
      id: element.transcript_id,
      name: element.gene_name,
      chrom: element.chrom,
      start: element.start,
      end: element.end,
      mane: element.mane,
      scale: scale,
      color: element.mane ? lightenColor(color, 15) : color, // lighten colors for MANE transcripts
      features: []
    }
    // Keep track of latest track
    if (this.heightOrderRecord.latestHeight !== element.height_order) {
      this.heightOrderRecord = {
        latestHeight: element.height_order,
        latestNameEnd: 0,
        latestTrackEnd: 0
      }
    }
    // Draw a line to mark gene's length
    // cap lines at offscreen canvas start/end
    const displayedTrStart = Math.round(
      (transcriptObj.start > this.offscreenPosition.start
        ? scale * (transcriptObj.start - this.offscreenPosition.start)
        : 0)
    )
    const displayedTrEnd = Math.round(
      (this.offscreenPosition.end > transcriptObj.end
        ? scale * (transcriptObj.end - this.offscreenPosition.start)
        : this.offscreenPosition.end)
    )
    // store start and end coordinates
    transcriptObj.x1 = displayedTrStart
    transcriptObj.x2 = displayedTrEnd
    transcriptObj.y1 = canvasYPos - (this.geneLineWidth / 2)
    transcriptObj.y2 = canvasYPos + (this.geneLineWidth / 2)
    // draw transcript backbone
    drawLine({
      ctx: this.drawCtx,
      x: displayedTrStart,
      x2: displayedTrEnd,
      y: canvasYPos,
      y2: canvasYPos,
      color: transcriptObj.color,
      lineWith: this.geneLineWidth // set width of the element
    })
    // Draw gene name
    const textYPos = this.tracksYPos(element.height_order)
    if (drawName) {
      const mane = element.mane ? ' [MANE] ' : ''
      drawText({
        ctx: this.drawCtx,
        text: `${transcriptObj.name}${mane}${element.strand === '+' ? '→' : '←'}`,
        x: Math.round(((displayedTrEnd - displayedTrStart) / 2) + displayedTrStart),
        y: textYPos + this.featureHeight,
        fontProp: textSize
      })
    }

    // draw arrows in gene
    if (drawAsArrow) {
      drawArrow({
        ctx: this.drawCtx,
        x: element.strand === '+' ? displayedTrEnd : displayedTrStart, // xPos
        y: canvasYPos, // yPos
        dir: element.strand === '+' ? 1 : -1, // direction
        height: this.featureHeight / 2, // height
        lineWidth: this.geneLineWidth, // lineWidth
        color: transcriptObj.color // color
      })
    } else {
      // draw features
      for (const feature of element.features) {
        const featureObj = this._drawFeature(
          feature, element.height_order,
          canvasYPos, transcriptObj.color, plotFormat
        )
        if (featureObj !== undefined) {
          transcriptObj.features.push(featureObj)
        }
      }
      transcriptObj.y1 = Math.min(...transcriptObj.features.map(feat => feat.y1))
      transcriptObj.y2 = Math.max(...transcriptObj.features.map(feat => feat.y2))
    }

    // adapt coordinates to global screen coordinates from coorinates local to canvas
    updateVisableElementCoordinates({
      element: transcriptObj,
      screenPosition: this.onscreenPosition,
      scale: this.offscreenPosition.scale
    })
    // make a virtual representation of the genetic element
    const virtualElement = makeVirtualDOMElement({
      x1: transcriptObj.visibleX1,
      x2: transcriptObj.visibleX2,
      y1: transcriptObj.visibleY1,
      y2: transcriptObj.visibleY2,
      canvas: this.contentCanvas
    })
    // create a tooltip html element and append to DOM
    const elementInfo = [
      { title: element.chrom, value: `${element.start}-${element.end}` },
      { title: 'id', value: element.transcript_id }
    ]
    if (element.refseq_id) { elementInfo.push({ title: 'refSeq', value: element.refseq_id }) }
    if (element.hgnc_id) { elementInfo.push({ title: 'hgnc', value: element.hgnc_id }) }
    if ( addTooltip ) {
      const tooltip = createTooltipElement({
        id: `popover-${element.transcript_id}`,
        title: transcriptObj.name,
        information: elementInfo
      })
      // add features to element
      addFeatures(element, tooltip)
      // create tooltip
      this.trackContainer.appendChild(tooltip)
      transcriptObj.tooltip = {
        instance: createPopper(virtualElement, tooltip, {
          modifiers: [
            { name: 'offset', options: { offset: [0, virtualElement.getBoundingClientRect().height] } }
          ]
        }),
        virtualElement: virtualElement,
        tooltip: tooltip,
        isDisplayed: false
      }
    } else { 
      transcriptObj.tooltip = false
    }
    return transcriptObj
  }

  //  Draws transcripts in given range
  async drawOffScreenTrack ({ startPos, endPos, maxHeightOrder, data }) {
    //    store positions used when rendering the canvas
    this.offscreenPosition = {
      start: startPos,
      end: endPos,
      scale: (this.drawCanvas.width /
              (endPos - startPos))
    }

    // Set needed height of visible canvas and transcript tooltips
    this.setContainerHeight(maxHeightOrder)

    // Keeps track of previous values
    this.heightOrderRecord = {
      latestHeight: 0, // Latest height order for annotation
      latestNameEnd: 0, // Latest annotations end position
      latestTrackEnd: 0 // Latest annotations title's end position
    }

    // limit drawing of transcript to pre-defined resolutions
    let filteredTranscripts = []
    if (this.getResolution < this.maxResolution + 1) {
      filteredTranscripts = data.transcripts.filter(
        transc => isElementOverlapping(
          transc, { start: startPos, end: endPos }
        )
      )
    }
    // dont show tracks with no data in them
    if (filteredTranscripts.length > 0) {
      this.setContainerHeight(this.trackData.max_height_order)
    } else {
      this.setContainerHeight(0)
    }
    this.clearTracks()

    // define plot formating parameters
    const plotFormat = {
      textSize: 10,
      titleMargin: 2
    }

    // Go through queryResults and draw appropriate symbols
    const drawGeneName = this.getResolution < 3
    const drawTooltips = this.getResolution < 4
    const drawExons = this.getResolution < 4
    for (const transc of filteredTranscripts) {
      if (!this.expanded && transc.height_order !== 1) { continue }
      // draw base transcript
      const color = transc.strand === '+'
        ? this.colorSchema.strand_pos
        : this.colorSchema.strand_neg
      // test create some genetic elements and store them
      const transcriptObj = await this._drawTranscript(
        transc,
        color,
        plotFormat,
        drawGeneName, // if gene names should be drawn
        !drawExons, // if transcripts should be represented as arrows
        drawTooltips,  // if tooltips should be added
      )
      this.geneticElements.push(transcriptObj)
    }
  }
}
