// Transcript definition

import { BaseAnnotationTrack, lightenColor } from './base.js'
import { initTrackTooltips, createTooltipElement, makeVirtualDOMElement, updateVisableElementCoordinates } from './tooltip.js'
import { createPopper } from '@popperjs/core'
import { drawRect, drawLine, drawArrow, drawText } from '../draw.js'
import { getVisibleXCoordinates, isElementOverlapping } from './utils.js'

function createList (information) {
  const list = document.createElement('ul')
  for (const info of information) {
    const li = document.createElement('li')
    const bold = document.createElement('strong')
    bold.innerText = info.title
    li.innerText = bold.innerHTML += `: ${info.value}`
    list.appendChild(li)
  }
  return list
}

// make tooltip text
function buildTooltipContent (elem) {
  const container = document.createElement('div')
  container.classList.add('tooltip-content')
  // add title
  const title = document.createElement('h4')
  title.innerText = elem.mane ? `${elem.gene_name} [${elem.mane}]` : elem.gene_name
  container.appendChild(title)
  // add body information
  const information = [
    { title: elem.chrom, value: `${elem.start}-${elem.end}` },
    { title: 'id', value: elem.transcript_id }
  ]
  if (elem.refseq_id) { information.push({ title: 'refSeq', value: elem.refseq_id }) }
  if (elem.hgnc_id) { information.push({ title: 'hgnc', value: elem.hgnc_id }) }
  const body = createList(information)
  // build feature information
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
    featureContainer.appendChild(createList(information))
    body.appendChild(featureContainer)
  }
  container.appendChild(body)
  return container
}



export class TranscriptTrack extends BaseAnnotationTrack {
  constructor (x, width, near, far, hgType, colorSchema) {
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

    this.hgType = hgType
    this.maxResolution = 4
    // Define with of the elements
    this.geneLineWidth = 2
    initTrackTooltips(this)
  }

  // draw feature
  _drawFeature (feature, queryResult, heightOrder, canvasYPos,
    color, plotFormat) {
    // Go trough feature list and draw geometries
    const titleMargin = plotFormat.titleMargin
    const textYPos = this.tracksYPos(heightOrder)
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
      const feature_obj = {
        id: feature.exon_number,
        start: feature.start,
        end: feature.end,
        x1: Math.round(x),
        x2: Math.round(x + width),
        y1: Math.round(y),
        y2: Math.round(y + height),
        isDisplayed: false,
        visibleX1: visibleCoords.x1,
        visibleX2: visibleCoords.x2,
      }
      drawRect({
        ctx: this.drawCtx,
        x: feature_obj.x1,
        y: feature_obj.y1,
        width: width,
        height: height,
        lineWidth: 1,
        fillColor: color,
        open: false
      })
      return feature_obj
    }
  }

  // draw transcript figures
  async _drawTranscript (element, queryResult, color, plotFormat,
    drawName = true, drawAsArrow = false) {
    const canvasYPos = this.tracksYPos(element.height_order)
    const scale = this.offscreenPosition.scale
    // sizes
    const textSize = plotFormat.textSize
    const titleMargin = plotFormat.titleMargin
    // store element metadata
    const transcript_obj = {
      id: element.transcript_id,
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
      (transcript_obj.start > this.offscreenPosition.start
        ? scale * (transcript_obj.start - this.offscreenPosition.start)
        : 0)
    )
    const displayedTrEnd = Math.round(
      (this.offscreenPosition.end > transcript_obj.end
        ? scale * (transcript_obj.end - this.offscreenPosition.start)
        : this.offscreenPosition.end)
    )
    // store start and end coordinates
    transcript_obj.x1 = displayedTrStart
    transcript_obj.x2 = displayedTrEnd
    transcript_obj.y1 = canvasYPos - (this.geneLineWidth / 2)
    transcript_obj.y2 = canvasYPos + (this.geneLineWidth / 2)
    // draw transcript backbone
    drawLine({
      ctx: this.drawCtx,
      x: displayedTrStart,
      x2: displayedTrEnd,
      y: canvasYPos,
      y2: canvasYPos,
      color: transcript_obj.color,
      lineWith: this.geneLineWidth // set width of the element
    })
    // Draw gene name
    const textYPos = this.tracksYPos(element.height_order)
    if (drawName) {
      const mane = element.mane ? ' [MANE] ' : ''
      drawText({
        ctx: this.drawCtx,
        text: `${transcript_obj.name}${mane}${element.strand === '+' ? '→' : '←'}`,
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
        color: transcript_obj.color // color
      })
    } else {
      // draw features
      for (const feature of element.features) {
        const feature_obj = this._drawFeature(
          feature, queryResult, element.height_order,
          canvasYPos, transcript_obj.color, plotFormat
        )
        if (feature_obj !== undefined) {
          transcript_obj.features.push(feature_obj)
        }
      }
      transcript_obj.y1 = Math.min(...transcript_obj.features.map(feat => feat.y1))
      transcript_obj.y2 = Math.max(...transcript_obj.features.map(feat => feat.y2))
    }

    // adapt coordinates to global screen coordinates from coorinates local to canvas
    updateVisableElementCoordinates({
      element: transcript_obj,
      canvas: this.contentCanvas,
      screenPosition: this.onscreenPosition,
      scale: this.offscreenPosition.scale,
    })
    // make a virtual representation of the genetic element
    const virtualElement = makeVirtualDOMElement(
      transcript_obj.visibleX1, transcript_obj.visibleX2,
      transcript_obj.visibleY1, transcript_obj.visibleY2
    )
    const tooltip = createTooltipElement(
      buildTooltipContent(element).innerHTML,
      `${element.transcript_id}-popover`
    )
    this.trackContainer.appendChild(tooltip)
    transcript_obj.tooltip = {
      instance: createPopper(virtualElement, tooltip, {
        modifiers: [
          { name: 'offset', options: { offset: [0, virtualElement.getBoundingClientRect().height / 2] } }
        ]
      }),
      virtualElement: virtualElement,
      tooltip: tooltip,
      isDisplayed: false
    }
    return transcript_obj
  }

  //  Draws transcripts in given range
  async drawOffScreenTrack (queryResult) {
    //    store positions used when rendering the canvas
    this.offscreenPosition = {
      start: queryResult.start_pos,
      end: queryResult.end_pos,
      scale: (this.drawCanvas.width /
              (queryResult.end_pos - queryResult.start_pos))
    }
    this.geneticElements = []

    // Set needed height of visible canvas and transcript tooltips
    this.setContainerHeight(queryResult.max_height_order)

    // Keeps track of previous values
    this.heightOrderRecord = {
      latestHeight: 0, // Latest height order for annotation
      latestNameEnd: 0, // Latest annotations end position
      latestTrackEnd: 0 // Latest annotations title's end position
    }

    // limit drawing of transcript to pre-defined resolutions
    let filteredTranscripts = []
    if (this.getResolution < this.maxResolution + 1) {
      filteredTranscripts = queryResult.data.transcripts.filter(
        transc => isElementOverlapping(
          transc, { start: queryResult.start_pos, end: queryResult.end_pos }
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
    const drawExons = this.getResolution < 4
    for (const transc of filteredTranscripts) {
      if (!this.expanded && transc.height_order !== 1) { continue }
      // draw base transcript
      const canvasYPos = this.tracksYPos(transc.height_order)
      const color = transc.strand === '+'
        ? this.colorSchema.strand_pos
        : this.colorSchema.strand_neg
      // test create some genetic elements and store them
      const transcript_obj = await this._drawTranscript(
        transc, queryResult, color,
        plotFormat,
        drawGeneName, // if gene names should be drawn
        !drawExons // if transcripts should be represented as arrows
      )
      this.geneticElements.push(transcript_obj)
    }
  }
}
