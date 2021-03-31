// Overview canvas definition

import { FrequencyTrack } from './interactive.js'
import { create, get } from './fetch.js'
import { createGraph, drawData, drawGraphLines, drawText, drawRotatedText } from './genecanvas.js'
import { CHROMOSOMES } from './constants.js'
import { drawTrack } from './navigation.js'

export class OverviewCanvas extends FrequencyTrack {
  constructor (xPos, fullPlotWidth, lineMargin, near, far, sampleName,
    hgType, hgFileDir) {
    super({sampleName, hgType, hgFileDir})

    // Plot variables
    this.fullPlotWidth = fullPlotWidth // Width for all chromosomes to fit in
    this.plotHeight = 180 // Height of one plot
    this.titleMargin = 10 // Margin between plot and title
    this.legendMargin = 45 // Margin between legend and plot
    this.x = xPos // Starting x-position for plot
    this.y = 20 + this.titleMargin + 2 * lineMargin // Starting y-position for plot
    this.leftRightPadding = 2 // Padding for left and right in graph
    this.topBottomPadding = 8 // Padding for top and bottom in graph
    this.leftmostPoint = this.x + 10 // Draw y-values for graph left of this point

    // BAF values
    this.baf = {
      yStart: 1.0, // Start value for y axis
      yEnd: 0.0, // End value for y axis
      step: 0.2, // Step value for drawing ticks along y-axis
      color: '#000000' // Viz color
    }

    // Log2 ratio values
    this.log2 = {
      yStart: 3.0, // Start value for y axis
      yEnd: -3.0, // End value for y axis
      step: 1.0, // Step value for drawing ticks along y-axis
      color: '#000000' // Viz color
    }

    // Canvas variables
    this.width = document.body.clientWidth // Canvas width
    this.height = this.y + 2 * this.plotHeight + 2 * this.topBottomPadding // Canvas height
    this.drawCanvas.width = parseInt(this.width)
    this.drawCanvas.height = parseInt(this.height)
    this.staticCanvas = document.getElementById('overview-static')

    // Initialize marker div element
    this.markerElem = document.getElementById('overview-marker')
    this.markerElem.style.height = (this.plotHeight * 2) + 'px'
    this.markerElem.style.marginTop = 0 - (this.plotHeight + this.topBottomPadding) * 2 + 'px'

    // Set dimensions of overview canvases
    this.staticCanvas.width = this.width
    this.staticCanvas.height = this.height
    this.getOverviewChromDim ().then( () => {
      // Select a chromosome in overview track
      this.staticCanvas.addEventListener('mousedown', event => {
        event.stopPropagation()
        const selectedChrom = this.pixelPosToGenomicLoc(event.x)
        // Dont update if chrom previously selected
        // Move interactive view to selected region
        const chrom = selectedChrom.chrom
        const start = 1
        const end = this.dims[chrom].size - 1
        // Mark region
        this.markRegion({chrom, start, end})
        drawTrack({chrom, start, end}) // redraw canvas
      })
      this.staticCanvas.parentElement.addEventListener('mark-region', event => {
        this.markRegion({} = event.detail.region)
      })
    })
  }

  pixelPosToGenomicLoc (pixelpos) {
    const match = {}
    for (const i of CHROMOSOMES) {
      const chr = this.dims[i]
      if (pixelpos > chr.x_pos && pixelpos < chr.x_pos + chr.width) {
        match.chrom = i
        match.pos = Math.floor(chr.size * (pixelpos - chr.x_pos) / chr.width)
      }
    }
    return match
  }

  async getOverviewChromDim () {
    await get('get-overview-chrom-dim', {
      x_pos: this.x,
      y_pos: this.y,
      plot_width: this.fullPlotWidth,
      hg_type: this.hgType
    }).then(result => {
      this.dims = result.chrom_dims
      this.chromPos = CHROMOSOMES.map(chrom => {
        return {
          region: `${chrom}:0-None`,
          x_pos: this.dims[chrom].x_pos + this.leftRightPadding,
          y_pos: this.dims[chrom].y_pos,
          x_ampl: this.dims[chrom].width - 2 * this.leftRightPadding
        }
      })
    })
  }

  markRegion ({chrom, start, end}) {
    if (this.dims !== undefined) {
      const scale = this.dims[chrom].width / this.dims[chrom].size
      const overviewMarker = document.getElementById('overview-marker')

      let markerStartPos, markerWidth
      // Calculate position and size of marker
      if ((end - start) * scale < 2) {
        markerStartPos = 1 + (this.dims[chrom].x_pos + start * scale)
        markerWidth = 2
      } else {
        markerStartPos = 1.5 + (this.dims[chrom].x_pos + start * scale)
        markerWidth = Math.max(2, Math.ceil((end - start) * scale) - 1)
      }

      // Update the dom element
      overviewMarker.style.left = markerStartPos + 'px'
      overviewMarker.style.width = (markerWidth) + 'px'
    }
  }

  async drawOverviewPlotSegment ({canvas, chrom, width, chromCovData}) {
    // Draw chromosome title
    drawText(
      canvas,
      chromCovData.x_pos - this.leftRightPadding + width / 2,
      chromCovData.y_pos - this.titleMargin,
      chromCovData.chrom, 10, 'center'
    )

    // Draw rotated y-axis legends
    if (chromCovData.x_pos < this.leftmostPoint) {
      drawRotatedText(canvas, 'B Allele Freq', 18, chromCovData.x_pos - this.legendMargin,
        chromCovData.y_pos + this.plotHeight / 2, -Math.PI / 2, this.titleColor)
      drawRotatedText(canvas, 'Log2 Ratio', 18, chromCovData.x_pos - this.legendMargin,
        chromCovData.y_pos + 1.5 * this.plotHeight, -Math.PI / 2, this.titleColor)
    }
    // Draw BAF
    createGraph(canvas,
      chromCovData.x_pos - this.leftRightPadding,
      chromCovData.y_pos, width, this.plotHeight, this.topBottomPadding,
      this.baf.yStart, this.baf.yEnd, this.baf.step,
      chromCovData.x_pos < this.leftmostPoint, this.borderColor, chrom !== CHROMOSOMES[0])
    drawGraphLines({
      canvas: canvas,
      x: chromCovData.x_pos,
      y: chromCovData.y_pos,
      yStart: this.baf.yStart,
      yEnd: this.baf.yEnd,
      stepLength: this.baf.step,
      yMargin: this.topBottomPadding,
      width: width,
      height: this.plotHeight
    })

    // Draw Log 2 ratio
    createGraph(canvas,
      chromCovData.x_pos - this.leftRightPadding,
      chromCovData.y_pos + this.plotHeight, width,
      this.plotHeight, this.topBottomPadding, this.log2.yStart,
      this.log2.yEnd, this.log2.step,
      chromCovData.x_pos < this.leftmostPoint, this.borderColor, chrom !== CHROMOSOMES[0])
    drawGraphLines({
      canvas: canvas,
      x: chromCovData.x_pos,
      y: chromCovData.y_pos + this.plotHeight,
      yStart: this.log2.yStart,
      yEnd: this.log2.yEnd,
      stepLength: this.log2.step,
      yMargin: this.topBottomPadding,
      width: width,
      height: this.plotHeight
    })
    // Plot scatter data
    drawData({
      canvas: canvas,
      data: chromCovData.baf,
      color: this.baf.color
    })
    drawData({
      canvas: canvas,
      data: chromCovData.data,
      color: this.log2.color
    })
  }

  async drawOverviewContent (printing) {
    await this.getOverviewChromDim()
    // query gens for coverage values
    const covData = await create('get-multiple-coverages', {
      sample_id: this.sampleName,
      hg_type: this.hgType,
      plot_height: this.plotHeight,
      chromosome_pos: this.chromPos,
      top_bottom_padding: this.topBottomPadding,
      baf_y_start: this.baf.yStart,
      baf_y_end: this.baf.yEnd,
      log2_y_start: this.log2.yStart,
      log2_y_end: this.log2.yEnd,
      overview: 'True',
      reduce_data: 1
    })
    const staticCanvas = document.getElementById('overview-static')
    for (const [chrom, res] of Object.entries(covData.results)) {
      this.drawOverviewPlotSegment({
        canvas: this.staticCanvas, chrom: chrom,
        width: this.dims[chrom].width, chromCovData: res
      })
    }
  }
}
