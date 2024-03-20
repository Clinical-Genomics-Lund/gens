// Annotation track definition

import { BaseAnnotationTrack } from './base.js'
import { isElementOverlapping } from './utils.js'
import { get } from '../fetch.js'
import { parseRegionDesignation } from '../navigation.js'
import { drawRect, drawText } from '../draw.js'
import { initTrackTooltips, createTooltipElement, makeVirtualDOMElement, updateVisibleElementCoordinates } from './tooltip.js'
import { createPopper } from '@popperjs/core'

// Convert to 32bit integer
function stringToHash (string) {
  let hash = 0
  if (string.length === 0) return hash
  for (let i = 0; i < string.length; i++) {
    const char = string.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash
}

export class AnnotationTrack extends BaseAnnotationTrack {
  constructor (x, width, near, far, genomeBuild, defaultAnnotation) {
    // Dimensions of track canvas
    const visibleHeight = 300 // Visible height for expanded canvas, overflows for scroll
    const minHeight = 35 // Minimized height

    super(width, near, far, visibleHeight, minHeight)

    // Set inherited variables
    // TODO use the names contentCanvas and drawCanvas
    this.drawCanvas = document.getElementById('annotation-draw')
    this.contentCanvas = document.getElementById('annotation-content')
    this.trackTitle = document.getElementById('annotation-titles')
    this.trackContainer = document.getElementById('annotation-track-container')
    this.featureHeight = 18
    this.arrowThickness = 2

    // Setup html objects now that we have gotten the canvas and div elements
    this.setupHTML(x + 1)

    this.trackContainer.style.marginTop = '-1px'
    this.genomeBuild = genomeBuild

    // Setup annotation list
    this.sourceList = document.getElementById('source-list')
    this.sourceList.addEventListener('change', () => {
      this.expanded = false
      this.additionalQueryParams = { source: this.sourceList.value }
      const region = parseRegionDesignation(document.getElementById('region-field').value)
      this.drawTrack({ forceRedraw: true, ...region })
    })
    this.annotSourceList(defaultAnnotation)

    // GENS api parameters
    this.apiEntrypoint = 'get-annotation-data'
    this.additionalQueryParams = { source: defaultAnnotation }

    this.maxResolution = 6 // define other max resolution
    this.numRenderedElements = 0
    initTrackTooltips(this)
  }

  // Fills the list with source files
  annotSourceList (defaultAnnotation) {
    get('get-annotation-sources', { genome_build: this.genomeBuild })
      .then(result => {
        if (result.sources.length > 0) {
          this.sourceList.style.visibility = 'visible'
        }
        for (const fileName of result.sources) {
          // Add annotation file name to list
          const opt = document.createElement('option')
          opt.value = fileName
          opt.innerHTML = fileName

          // Set mimisbrunnr as default file
          if (fileName.match(defaultAnnotation)) {
            opt.setAttribute('selected', true)
          }
          this.sourceList.appendChild(opt)
        }
      })
      .then(() => {
        const region = parseRegionDesignation(document.getElementById('region-field').value)
        this.drawTrack({ ...region })
      })
  }

  // Draws annotations in given range
  async drawOffScreenTrack ({ startPos, endPos, maxHeightOrder, data }) {
    const textSize = 10

    // store positions used when rendering the canvas
    this.offscreenPosition = {
      start: startPos,
      end: endPos,
      scale: (this.drawCanvas.width /
              (endPos - startPos))
    }
    const scale = this.offscreenPosition.scale

    this.heightOrderRecord = {
      latestHeight: 0, // Latest height order for annotation
      latestNameEnd: 0, // Latest annotations end position
      latestTrackEnd: 0 // Latest annotations title's end position
    }

    // limit drawing of transcript to pre-defined resolutions
    let filteredAnnotations = []
    if (this.getResolution < this.maxResolution + 1) {
      filteredAnnotations = data
        .annotations
        .filter(annot => isElementOverlapping(annot,
          {
            start: startPos,
            end: endPos
          }))
    }
    // dont show tracks with no data in them
    if (filteredAnnotations.length > 0) {
      //  Set needed height of visible canvas and transcript tooltips
      this.setContainerHeight(this.trackData.max_height_order)
    } else {
      //  Set needed height of visible canvas and transcript tooltips
      this.setContainerHeight(0)
    }
    this.clearTracks()

    // Go through results and draw appropriate symbols
    for (const track of filteredAnnotations) {
      const annotationName = track.name
      const heightOrder = track.height_order
      const start = track.start
      const end = track.end
      const color = track.color

      // Only draw visible tracks
      if (!this.expanded && heightOrder !== 1) {
        continue
      }

      // Keep track of latest annotations
      if (this.heightOrderRecord.latestHeight !== heightOrder) {
        this.heightOrderRecord = {
          latestHeight: heightOrder,
          latestNameEnd: 0,
          latestTrackEnd: 0
        }
      }
      // make an annotation object that tracks screen coordinates of object
      const x1 = scale * (start - this.offscreenPosition.start)
      const canvasYPos = this.tracksYPos(heightOrder)
      const annotationObj = {
        id: stringToHash(track.name),
        name: track.name,
        start: track.start,
        end: track.end,
        x1: x1,
        x2: x1 + scale * (end - start + 1),
        y1: canvasYPos,
        y2: canvasYPos + (this.featureHeight / 2),
        features: [],
        isDisplayed: false
      }
      // Draw box for annotation
      drawRect({
        ctx: this.drawCtx,
        x: annotationObj.x1,
        y: annotationObj.y1,
        width: annotationObj.x2 - annotationObj.x1,
        height: this.featureHeight / 2,
        lineWidth: 1,
        fillColor: color,
        open: false
      })
      // get onscreen positions for offscreen xy coordinates
      updateVisibleElementCoordinates({
        element: annotationObj,
        screenPosition: this.onscreenPosition,
        scale: this.offscreenPosition.scale
      })
      // create a tooltip html element and append to DOM
      const tooltip = createTooltipElement({
        id: `popover-${annotationObj.id}`,
        title: annotationObj.name,
        information: [
          { title: track.chrom, value: `${track.start}-${track.end}` },
          { title: 'Score', value: `${track.score}` }
        ]
      })
      this.trackContainer.appendChild(tooltip)
      // make a  virtual element as tooltip hitbox
      const virtualElement = makeVirtualDOMElement({
        x1: annotationObj.visibleX1,
        x2: annotationObj.visibleX2,
        y1: annotationObj.visibleY1,
        y2: annotationObj.visibleY2,
        canvas: this.contentCanvas
      })
      // add tooltip to annotationObj
      annotationObj.tooltip = {
        instance: createPopper(virtualElement, tooltip, {
          modifiers: [
            { name: 'offset', options: { offset: [0, virtualElement.getBoundingClientRect().height] } }
          ]
        }),
        virtualElement: virtualElement,
        tooltip: tooltip,
        isDisplayed: false
      }
      this.geneticElements.push(annotationObj)

      const textYPos = this.tracksYPos(heightOrder)
      // limit drawing of titles to certain resolution
      if (this.getResolution < 6) {
        // Draw annotation name
        drawText({
          ctx: this.drawCtx,
          text: annotationName,
          x: scale * ((start + end) / 2 - this.offscreenPosition.start),
          y: textYPos + this.featureHeight,
          fontProp: textSize
        })
      }
    }
  }
}
