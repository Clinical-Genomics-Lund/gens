// Functions for rendering the interactive canvas

import { drawRotatedText, drawData, drawText, createGraph, drawVerticalTicks, drawGraphLines } from './genecanvas.js'
import { get } from './fetch.js'
import { Scene, OrthographicCamera, WebGLRenderer } from 'three'

class KeyLogger {
  // Records keypress combinations
  constructor (bufferSize = 10) {
    // Setup variables
    this.bufferSize = bufferSize
    this.lastKeyTime = Date.now()
    this.heldKeys = {} // store held keys
    this.keyBuffer = [] // store recent keys
    // Add listending functions
    document.addEventListener('keydown', event => {
      // store event
      const eventData = {
        key: event.key,
        target: window.event.target.nodeName,
        time: Date.now()
      }
      const keyEvent = new CustomEvent('keyevent', { detail: eventData })
      this.heldKeys[event.key] = true // recored pressed keys
      this.keyBuffer.push(eventData)
      // empty buffer
      while (this.keyBuffer.length > this.bufferSize) { this.keyBuffer.shift() }
      document.dispatchEvent(keyEvent) // event information
    })
    document.addEventListener('keyup', event => {
      delete this.heldKeys[event.key]
    })
  }

  recentKeys (timeWindow) {
    // get keys pressed within a window of time.
    const currentTime = Date.now()
    return this.keyBuffer.filter(keyEvent =>
      timeWindow > currentTime - keyEvent.time)
  }

  lastKeypressTime () {
    return this.keyBuffer[this.keyBuffer.length - 1] - Date.now()
  }
}

export class FrequencyTrack {
  constructor (sampleName, hgType, hgFileDir) {
    // setup IO
    this.sampleName = sampleName // File name to load data from
    this.hgType = hgType // Whether to load HG37 or HG38, default is HG38
    this.hgFileDir = hgFileDir // File directory
    // For looping purposes
    this.chromosomes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
      '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21',
      '22', 'X', 'Y']
    // Border
    this.borderColor = '#666' // Color of border
    this.titleColor = 'black' // Color of titles/legends
    // Setup canvas
    this.drawCanvas = document.createElement('canvas')
    this.context = this.drawCanvas.getContext('webgl2')
  }
}

export class InteractiveCanvas extends FrequencyTrack {
  constructor (inputField, lineMargin, near, far, sampleName, hgType, hgFileDir) {
    super(sampleName, hgType, hgFileDir)
    // The canvas input field to display and fetch chromosome range from
    this.inputField = inputField
    this.keyLogger = new KeyLogger() // start log keys

    // Plot variables
    this.titleMargin = 80 // Margin between plot and title
    this.legendMargin = 45 // Margin between legend and plot
    this.leftRightPadding = 2 // Padding for left and right in graph
    this.topBottomPadding = 8 // margin for top and bottom in graph
    this.plotWidth = Math.min(1500, 0.9 * document.body.clientWidth - this.legendMargin) // Width of one plot
    this.extraWidth = this.plotWidth / 1.5 // Width for loading in extra edge data
    this.plotHeight = 180 // Height of one plot
    this.x = document.body.clientWidth / 2 - this.plotWidth / 2 // X-position for first plot
    this.y = 10 + 2 * lineMargin + this.titleMargin // Y-position for first plot
    this.canvasHeight = 2 + this.y + 2 * (this.leftRightPadding + this.plotHeight) // Height for whole canvas

    // BAF values
    this.baf = {
      yStart: 1.0, // Start value for y axis
      yEnd: 0.0, // End value for y axis
      step: 0.2, // Step value for drawing ticks along y-axis
      color: '#000000' // Viz color
    }

    // Log2 ratio values
    this.log2 = {
      yStart: 4.0, // Start value for y axis
      yEnd: -4.0, // End value for y axis
      step: 1.0, // Step value for drawing ticks along y-axis
      color: '#000000' // Viz color
    }

    // Setup draw canvas
    this.drawWidth = Math.max(this.plotWidth + 2 * this.extraWidth, document.body.clientWidth) // Draw-canvas width
    this.drawCanvas.width = parseInt(this.drawWidth)
    this.drawCanvas.height = parseInt(this.canvasHeight)

    // Setup visible canvases
    this.contentCanvas = document.getElementById('interactive-content')
    this.staticCanvas = document.getElementById('interactive-static')
    this.staticCanvas.width = this.contentCanvas.width = document.body.clientWidth
    this.staticCanvas.height = this.contentCanvas.height = this.canvasHeight

    // Setup loading div dimensions
    this.loadingDiv = document.getElementById('loading-div')
    this.loadingDiv.style.width = `${this.plotWidth - 2.5}px`
    this.loadingDiv.style.left = `${this.x + 4}px`
    this.loadingDiv.style.top = `${this.y + 83 + 1}px`
    this.loadingDiv.style.height = `${this.plotHeight * 2 - 2.5}px`

    // Initialize marker div
    this.markerElem = document.getElementById('interactive-marker')
    this.markerElem.style.height = `${this.plotHeight * 2}px`
    this.markerElem.style.top = `${this.y + 82}px`

    // State values
    const input = inputField.value.split(/:|-/)
    this.chromosome = input[0]
    this.start = parseInt(input[1])
    this.end = parseInt(input[2])
    this.allowDraw = true

    // Listener values
    this.pressedKeys = {}
    this.markingRegion = false
    this.drag = false
    this.dragStart = {}
    this.dragEnd = {}

    // WebGL scene variables
    this.scene = new Scene()
    this.camera = new OrthographicCamera(this.drawWidth / -2, this.drawWidth / 2,
      this.canvasHeight / -2, this.canvasHeight / 2, near, far)
    this.renderer = new WebGLRenderer({
      canvas: this.drawCanvas,
      context: this.context,
      antialiasing: true
    })

    // Change to fourth quadrant of scene
    this.camera.position.set(this.drawWidth / 2 - lineMargin,
      this.canvasHeight / 2 - lineMargin, 1)

    this.scale = this.calcScale()

    // Setup listeners
    this.contentCanvas.addEventListener('mousedown', (event) => {
      event.stopPropagation()
      if (this.allowDraw && !this.drag) {
        if (this.keyLogger.heldKeys.Control) {
          this.zoomOut()
        } else { // Related to dragging
          // If region should be marked
          if (this.keyLogger.heldKeys.Shift) {
            this.markingRegion = true
          }
          // Make sure scale factor is updated
          this.scale = this.calcScale()
          // store coordinates
          this.dragStart = {
            x: event.x,
            y: event.y
          }
          this.dragEnd = {
            x: event.x,
            y: event.y
          }
          this.drag = true
        }
      }
    })

    // When in active dragging of the canvas
    this.contentCanvas.addEventListener('mousemove', (event) => {
      event.preventDefault()
      event.stopPropagation()
      // If region should be marked
      if (this.keyLogger.heldKeys.Shift && this.allowDraw) {
        this.markingRegion = true
      }
      if (this.drag) {
        this.dragEnd = {
          x: event.x,
          y: event.y
        }

        if (this.markingRegion) {
          this.markRegion(this.dragStart.x, this.dragEnd.x)
        } else {
          // pan content canvas
          this.panContent(this.dragEnd.x - this.dragStart.x)
        }
      }
    })

    // When stop dragging
    this.contentCanvas.addEventListener('mouseup', (event) => {
      event.preventDefault()
      event.stopPropagation()
      // reset marking region
      if (this.markingRegion) {
        this.markingRegion = false
        this.resetRegionMarker()
        const scale = this.calcScale()
        // numerical sort
        const [start, end] = [this.start + Math.round((this.dragStart.x - this.x) / scale),
          this.start + Math.round((this.dragEnd.x - this.x) / scale)].sort((a, b) => a - b)
        // if shift - click, zoom in a region 10
        // fix for slowdown when shift clicking
        if ((end - start) < 10) {
          this.zoomIn()
        }
        //
        this.loadChromosome(this.chromosome, start, end + 1)
      }
      // reload window when stop draging
      if (this.drag) {
        this.markingRegion = false
        this.drag = false
        let moveDist = Math.floor((this.dragStart.x - this.dragEnd.x) / this.scale)

        // Do not allow negative values
        if (parseInt(this.start) + moveDist < 0) {
          moveDist -= (parseInt(this.start) + moveDist)
        }
        this.start = parseInt(this.start) + moveDist
        this.end = parseInt(this.end) + moveDist

        this.redraw(null, false)
      }
    })

    // Setup handling of keydown events
    document.addEventListener('DOMContentLoaded', () => {
      const keystrokeDelay = 2000
      document.addEventListener('keyevent', event => {
        const key = event.detail.key

        // dont act on key presses in input fields
        const excludeFileds = ['input', 'select', 'textarea']
        if (!excludeFileds.includes(event.detail.target.toLowerCase())) {
          if (key === 'Enter') {
            // Enter was pressed, process previous key presses.
            const recentKeys = this.keyLogger.recentKeys(keystrokeDelay)
            recentKeys.pop() // skip Enter key
            const lastKey = recentKeys[recentKeys.length - 1]
            const numKeys = parseInt((recentKeys
              .slice(lastKey.length - 2)
              .filter(val => parseInt(val.key))
              .map(val => val.key)
              .join('')))
            // process keys
            if (lastKey.key === 'x' || lastKey.key === 'y') {
              this.loadChromosome(lastKey.key)
            } else if (numKeys && numKeys > 0 < 23) {
              this.loadChromosome(numKeys)
            } else {
              return
            }
          }
          switch (key) {
            case 'ArrowLeft':
              this.nextChromosome()
              break
            case 'ArrowRight':
              this.previousChromosome()
              break
            case 'a':
              this.panTracksLeft()
              break
            case 'd':
              this.panTracksRight()
              break
            case 'ArrowUp':
            case 'w':
            case '+':
              this.zoomIn()
              break
            case 'ArrowDown':
            case 's':
            case '-':
              this.zoomOut()
              break
            default:
          }
        }
      })
    })
  }

  // Draw static content for interactive canvas
  async drawStaticContent () {
    const linePadding = 2
    const staticContext = this.staticCanvas.getContext('2d')

    // Fill background colour
    staticContext.fillStyle = 'white'
    staticContext.fillRect(0, 0, this.staticCanvas.width, this.staticCanvas.height)

    // Make content area visible
    staticContext.clearRect(this.x + linePadding, this.y + linePadding,
      this.plotWidth, this.staticCanvas.height)
    staticContext.clearRect(0, 0, this.staticCanvas.width, this.y + linePadding)

    // Draw rotated y-axis legends
    drawRotatedText(this.staticCanvas, 'B Allele Freq', 18, this.x - this.legendMargin,
      this.y + this.plotHeight / 2, -Math.PI / 2, this.titleColor)
    drawRotatedText(this.staticCanvas, 'Log2 Ratio', 18, this.x - this.legendMargin,
      this.y + 1.5 * this.plotHeight, -Math.PI / 2, this.titleColor)

    // Draw BAF
    createGraph(this.scene, this.staticCanvas, this.x, this.y, this.plotWidth,
      this.plotHeight, this.topBottomPadding, this.baf.yStart, this.baf.yEnd,
      this.baf.step, true, this.borderColor)

    // Draw Log 2 ratio
    createGraph(this.scene, this.staticCanvas, this.x, this.y + this.plotHeight,
      this.plotWidth, this.plotHeight, this.topBottomPadding, this.log2.yStart,
      this.log2.yEnd, this.log2.step, true, this.borderColor)

    // Render scene
    this.renderer.render(this.scene, this.camera)

    // Transfer image to visible canvas
    staticContext.drawImage(this.drawCanvas, 0, 0)

    // Clear scene for next render
    this.scene.remove.apply(this.scene, this.scene.children)
  }

  // Draw values for interactive canvas
  async drawInteractiveContent (clear = true) {
    if (clear) {
      this.loadingDiv.style.display = 'block'
    } else {
      document.getElementsByTagName('body')[0].style.cursor = 'wait'
    }

    console.time('getcoverage')
    get('get-coverage', {
      region: this.inputField.value,
      sample_id: this.sampleName,
      hg_type: this.hgType,
      hg_filedir: this.hgFileDir,
      x_pos: this.extraWidth,
      y_pos: this.y,
      plot_height: this.plotHeight,
      extra_plot_width: this.extraWidth,
      top_bottom_padding: this.topBottomPadding,
      x_ampl: this.plotWidth,
      baf_y_start: this.baf.yStart,
      baf_y_end: this.baf.yEnd,
      log2_y_start: this.log2.yStart,
      log2_y_end: this.log2.yEnd,
      reduce_data: 1
    }).then((result) => {
      console.timeEnd('getcoverage')
      if (result.status === 'error') {
        throw result
      }
      // Clear canvas
      this.contentCanvas.getContext('2d').clearRect(0, 0,
        this.contentCanvas.width, this.contentCanvas.height)

      // Draw ticks for x-axis
      drawVerticalTicks(this.scene, this.contentCanvas, this.extraWidth, this.x,
        this.y, result.start, result.end, this.plotWidth, this.topBottomPadding,
        this.titleColor)

      // Draw horizontal lines for BAF and Log 2 ratio
      drawGraphLines(this.scene, 0, result.y_pos,
        this.baf.yStart, this.baf.yEnd, this.baf.step, this.topBottomPadding,
        this.drawWidth, this.plotHeight)
      drawGraphLines(this.scene, 0, result.y_pos + this.plotHeight,
        this.log2.yStart, this.log2.yEnd, this.log2.step, this.topBottomPadding,
        this.drawWidth, this.plotHeight)

      // Plot scatter data
      drawData(this.scene, result.baf, this.baf.color)
      drawData(this.scene, result.data, this.log2.color)
      this.renderer.render(this.scene, this.camera)

      // Mark the location in the overview plot
      oc.markRegion(result.chrom, result.start, result.end)

      // Draw chromosome title
      drawText(this.contentCanvas,
        document.body.clientWidth / 2,
        result.y_pos - this.titleMargin,
        'Chromosome ' + result.chrom, 'bold 15', 'center')

      // Transfer image to visible canvas
      this.contentCanvas.getContext('2d').drawImage(
        this.drawCanvas, // source image
        this.extraWidth, // sX
        0, // sY
        this.plotWidth + 2 * this.leftRightPadding, // sWidth
        this.canvasHeight, // sHeight
        this.x, // dX
        0, // dY
        this.plotWidth + 2 * this.leftRightPadding, // dWidth
        this.canvasHeight) // dHeight

      // Clear scene before drawing
      this.scene.remove.apply(this.scene, this.scene.children)
      return result
    }).then((result) => {
      if (clear) {
        this.loadingDiv.style.display = 'none'
      } else {
        document.getElementsByTagName('body')[0].style.cursor = 'auto'
      }

      // Set values
      this.chromosome = result.chrom
      this.start = parseInt(result.start)
      this.end = parseInt(result.end)
      this.inputField.value = this.chromosome + ':' + this.start + '-' + this.end
      this.inputField.placeholder = this.inputField.value
      this.allowDraw = true
      this.inputField.blur()
    }).catch(() => {
      this.allowDraw = true

      // Signal bad input by adding error class
      this.inputField.classList.add('error')
      this.inputField.disabled = true

      // Remove error class after a while
      setTimeout(() => {
        this.inputField.classList.remove('error')
        this.inputField.value = this.inputField.placeholder
        this.inputField.disabled = false
      }, 1500)
    })
  }

  // Redraw interactive canvas
  redraw (inputValue, clear = true) {
    if (!this.allowDraw) {
      return
    }
    this.allowDraw = false

    // Set input field
    if (inputValue) {
      this.inputField.value = inputValue
    } else {
      this.inputField.value = this.chromosome + ':' + this.start + '-' + this.end
    }

    this.drawInteractiveContent(clear)

    // Draw new tracks and annotations
    Promise.all([
      tc.drawTrack(this.inputField.value, false, true),
      vc.drawTrack(this.inputField.value),
      ac.drawTrack(this.inputField.value)
    ])
  }

  calcScale () {
    return this.plotWidth / (this.end - this.start)
  }

  // Function for highlighting region
  markRegion (start, end) {
    // Update the dom element
    this.markerElem.style.left = start < end ? `${start}px` : `${end}px`
    this.markerElem.style.width = `${Math.abs(end - start) + 1}px`
  }

  resetRegionMarker () {
    this.markerElem.style.left = '0px'
    this.markerElem.style.width = '0px'
  }

  // Move track x distance
  panContent (distance) {
    // Clear whole content canvas
    this.contentCanvas.getContext('2d').clearRect(0,
      this.titleMargin / 2,
      this.contentCanvas.width,
      this.contentCanvas.height)
    // Copy draw image to content Canvas
    const lineMargin = 2
    this.contentCanvas.getContext('2d').drawImage(
      this.drawCanvas, // source image
      this.extraWidth - distance, // sX
      this.y + lineMargin, // sY
      this.plotWidth + 2 * this.leftRightPadding, // sWidth
      this.canvasHeight, // sHeight
      this.x, // dX
      this.y + lineMargin, // dY
      this.plotWidth + 2 * this.leftRightPadding, // dWidth
      this.canvasHeight) // dHeight
    // todo fix unified metric. distance is cumulative from mouse centerpoint
    // need to take that into account.
    const scale = this.calcScale()
    const dist = distance / scale
    const region = `${this.chromosome}:${this.start - dist}-${this.end - dist}`
    vc.drawTrack(region)
    tc.drawTrack(region, false, true)
    ac.drawTrack(region)
  }

  // Load coverage of a chromosome
  loadChromosome (chrom, start = 0, end = 'None') {
    this.chromosome = chrom
    this.redraw(`${this.chromosome}:${start}-${end}`)
    console.log(chrom, start, end)
  }

  nextChromosome () {
    this.loadChromosome(
      this.chromosomes[this.chromosomes.indexOf(this.chromosome) - 1])
  }

  previousChromosome () {
    this.loadChromosome(
      this.chromosomes[this.chromosomes.indexOf(this.chromosome) + 1])
  }

  // Pan whole canvas and tracks to the left
  panTracksLeft () {
    let distance = Math.floor(0.1 * (this.end - this.start))
    // Don't allow negative values
    distance = (this.start < distance) ? distance + (this.start - distance) : distance
    this.start -= distance
    this.end -= distance
    this.redraw(null)
  }

  // Pan whole canvas and tracks to the right
  panTracksRight () {
    const distance = Math.floor(0.1 * (this.end - this.start))
    this.start += distance
    this.end += distance
    this.redraw(null)
  }

  // Handle zoom in button click
  zoomIn () {
    const factor = Math.floor((this.end - this.start) * 0.2)
    this.start += factor
    this.end -= factor
    this.redraw(null)
  }

  // Handle zoom out button click
  zoomOut () {
    const factor = Math.floor((this.end - this.start) / 3)
    this.start = (this.start - factor) < 1 ? 1 : this.start - factor
    this.end += factor
    this.redraw(null)
  }
}
