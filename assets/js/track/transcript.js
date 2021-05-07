// Transcript definition

import { BaseAnnotationTrack, isWithinElementBbox, isElementOverlapping, lightenColor } from './base.js'
import { showTooltip, hideTooltip, createTooltipElement } from './tooltip.js'
import { createPopper } from '@popperjs/core'
import { drawRect, drawLine, drawArrow, drawText } from '../draw.js'


// make tooltip text
function buildTooltipContent(elem, exon) {
  const container = document.createElement('div')
  container.classList.add('tooltip-content')
  // add title
  const title = document.createElement('h4')
  title.innerText = elem.mane ? `${elem.gene_name} [${elem.mane}]` : elem.gene_name
  container.appendChild(title)
  // add body information
  const body = document.createElement('ul')
  let information = [
    {title: elem.chrom, value: `${elem.start}-${elem.end}`},
    {title: 'id', value: elem.transcript_id},
  ]
  if ( elem.refseq_id ) {information.push({title: 'refSeq', value: elem.refseq_id})}
  if ( elem.hgnc_id ) {information.push({title: 'hgnc', value: elem.hgnc_id})}
  for (const info of information) {
    let li = document.createElement('li')
    let bold = document.createElement('strong')
    bold.innerText = info.title
    li.innerText = bold.innerHTML += ` : ${info.value}`
    body.appendChild(li)
  }
  container.appendChild(body)
  return container
}

// Make a virtual DOM element from a genetic element object
function generateGetBoundingClientRect(x1, x2, y1, y2) {
  return () => ({
    width: Math.round(x2 - x1),
    height: Math.round(y2 - y1),
    top: y1,
    right: x1,
    bottom: y2,
    left: x2,
  })
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
    this.geneticElements = []
    // setup listeners for hover function
    this.trackContainer.addEventListener('mouseleave', 
      (event) => {
        for (const element of this.geneticElements) {
          hideTooltip(element.tooltip)
      }
    })
    this.trackContainer.addEventListener('mousemove', 
      (event) => {
        event.preventDefault()
        event.stopPropagation()
        for (const element of this.geneticElements) {
          const visableElem = {
            x1: element.visibleX1, x2: element.visibleX2,
            y1: element.y1, y2: element.y2
          }
          const point = {x: event.offsetX, y: event.offsetY}
          if (element.tooltip.isDisplayed) {
            if (!isWithinElementBbox({element: visableElem, point })) {
              hideTooltip(element.tooltip)
              element.tooltip.instance.update()
            }
          } else {
            // check if element is being displayed or not
            if ( isElementOverlapping(element, this.onscreenPosition) ) {
              // check if mouse pointer is within displayed element
              if (isWithinElementBbox({element: visableElem, point })) {
                showTooltip(element.tooltip)
                element.tooltip.instance.update()
            }
          }
        }
      }
    })
  }
  

  // draw feature
  _drawFeature (feature, queryResult, heightOrder, canvasYPos, geneText,
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
    
    const feature_obj = {
      name: feature.name,
      id: feature.exon_number,
      start: feature.start,
      end: feature.end,
      x1: Math.round(x),
      x2: Math.round(x + width),
      y1: Math.round(y),
      y2: Math.round(y + height),
      isDisplayed: false,
    }
    // Draw the geometry that represents the feature
    if (feature.feature === 'exon') {
      // Add tooltip title for whole gene
      // const exonText = `${geneText}
      // ${"-".repeat(30)}
      // Exon number: ${feature.exon_number}
      // chr ${queryResult.chromosome}:${feature.start}-${feature.end}`;
      // this.heightOrderRecord.latestTrackEnd = this.hoverText(
      //   exonText,
      //   `${titleMargin + scale * (feature.start - queryResult.queryStart)}px`,
      //   `${titleMargin + textYPos - (this.featureHeight / 2)}px`,
      //   `${scale * (feature.end - feature.start)}px`,
      //   `${this.featureHeight}px`,
      //   1,
      //   this.heightOrderRecord.latestTrackEnd);
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
    }
    return feature_obj
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
    let transcript_obj = {
      id: element.transcript_id,
      chrom: element.chrom,
      start: element.start,
      end: element.end,
      mane: element.mane,
      scale: scale,
      color: element.mane ? lightenColor(color, 15) : color, // lighten colors for MANE transcripts
      features: [],
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

    // Set tooltip text
    let geneText = ''

    // draw arrows in gene
    if (drawAsArrow) {
      drawArrow({
        ctx: this.drawCtx,
        x: element.strand === '+' ? displayedTrEnd : displayedTrStart, // xPos
        y: canvasYPos, // yPos
        dir: element.strand === '+' ? 1 : -1, // direction
        height: this.featureHeight / 2, // height
        lineWidth: this.geneLineWidth, // lineWidth
        color: transcript.color // color
      })
    } else {
      // draw features
      for (const feature of element.features) {
        const feature_obj = this._drawFeature(
          feature, queryResult, element.height_order,
          canvasYPos, geneText, transcript_obj.color, plotFormat
        )
        transcript_obj.features.push(feature_obj)
      }
      transcript_obj.y1 = Math.min(...transcript_obj.features.map(feat => feat.y1))
      transcript_obj.y2 = Math.max(...transcript_obj.features.map(feat => feat.y2))
    }

    // Add tooltip title for whole gene
    // this.heightOrderRecord.latestTrackEnd = this.hoverText(
    //   geneText,
    //   `${titleMargin + displayedTrStart}px`,
    //   `${titleMargin + textYPos - this.featureHeight / 2}px`,
    //   `${displayedTrEnd - displayedTrStart + 1}px`,
    //   `${this.featureHeight + textSize}px`,
    //   0,
    //   this.heightOrderRecord.latestTrackEnd
    // );
    // adapt coordinates to global screen coordinates from coorinates local to canvas
    // create tooltip for transcript
    transcript_obj.visibleX1 = Math.round((Math.max(0, transcript_obj.start - this.onscreenPosition.start) * transcript_obj.scale))
    transcript_obj.visibleX2 = Math.round((Math.min(this.onscreenPosition.end, transcript_obj.end - this.onscreenPosition.start) * transcript_obj.scale))
    const canvasBbox = this.contentCanvas.getBoundingClientRect()
    transcript_obj.visibleY1 = Math.round(transcript_obj.y1 + canvasBbox.y)
    transcript_obj.visibleY2 = Math.round(transcript_obj.y2 + canvasBbox.y)
    const virtualElement = {
      getBoundingClientRect: generateGetBoundingClientRect(
        transcript_obj.visibleX1, transcript_obj.visibleX2, transcript_obj.visibleY1, transcript_obj.visibleY2,
    )}
    const tooltip = createTooltipElement(
      buildTooltipContent(element).innerHTML,
      `${element.id}-popover`
    )
    this.trackContainer.appendChild(tooltip)
    transcript_obj.tooltip = {
      instance: createPopper(virtualElement, tooltip, {modifiers: [
        {name: 'offset', options: {offset: [0, virtualElement.getBoundingClientRect().height / 2]}},
      ]}),
      virtualElement: virtualElement,
      tooltip: tooltip,
      isDisplayed: false,
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
