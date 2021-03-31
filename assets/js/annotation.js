// Annotation track definition

import { Track, isElementOverlapping } from './track.js'
import { get } from './fetch.js'
import { parseRegionDesignation } from './navigation.js'

export class AnnotationTrack extends Track {
  constructor (x, width, near, far, hgType, defaultAnnotation) {
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
    this.hgType = hgType

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
  }

  // Fills the list with source files
  annotSourceList (defaultAnntotation) {
    get('get-annotation-sources', { hg_type: this.hgType })
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
          if (fileName.match(defaultAnntotation)) {
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
  async drawOffScreenTrack (queryResult) {
    const textSize = 10

    // store positions used when rendering the canvas
    this.offscreenPosition = {
      start: queryResult.start_pos,
      end: queryResult.end_pos,
      scale: (this.drawCanvas.width /
              (queryResult.end_pos - queryResult.start_pos))
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
      filteredAnnotations = queryResult
        .data
        .annotations
        .filter(annot => isElementOverlapping(annot,
          {
            start: queryResult.start_pos,
            end: queryResult.end_pos
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
      const chrom = track.chrom
      const heightOrder = track.height_order
      const score = track.score
      const start = track.start
      const end = track.end
      const strand = track.strand
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

      // Draw box for annotation
      const canvasYPos = this.tracksYPos(heightOrder)
      // if (this.expanded && heightOrder === 1 ) { continue}
      this.drawBox(
        scale * (start - this.offscreenPosition.start),
        canvasYPos,
        scale * (end - start),
        this.featureHeight / 2,
        color
      )

      const textYPos = this.tracksYPos(heightOrder)
      // limit drawing of titles to certain resolution
      if (this.getResolution < 6) {
        // Draw annotation name
        this.heightOrderRecord.latestNameEnd = this.drawText(
          annotationName,
          scale * ((start + end) / 2 - this.offscreenPosition.start),
          textYPos + this.featureHeight,
          textSize,
          this.heightOrderRecord.latestNameEnd)

        // Draw arrows
        if (strand) {
          const direction = strand === '+' ? 1 : -1
          this.drawArrows(scale * (start - this.trackData.start_pos),
            scale * (end - this.trackData.start_pos),
            canvasYPos,
            direction,
            this.arrowColor)
        }
      }

      // Set tooltip text
      const geneText = `${annotationName}
chr${chrom}:${start}-${end}
Score = ${score}`

      // Add tooltip title for whole gene
      // this.heightOrderRecord.latestTrackEnd = this.hoverText(
      //   geneText,
      //   `${scale * (start - this.trackData.start_pos)}px`,
      //   `${textYPos - this.featureHeight / 2}px`,
      //   `${scale * (end - start)}px`,
      //   `${this.featureHeight + textSize}px`,
      //   0,
      //   this.heightOrderRecord.latestHeight);
    }
  }
}
