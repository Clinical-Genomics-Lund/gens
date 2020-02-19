class InteractiveCanvas {
  constructor (inputField, lineMargin, near, far, sampleName, hgType) {
    this.inputField = inputField; // The canvas input field to display and fetch chromosome range from
    this.sampleName = sampleName; // File name to load data from
    this.hgType = hgType; // Whether to load HG37 or HG38, default is HG38

    // Plot variables
    this.titleMargin = 60; // Margin between plot and title
    this.legendMargin = 45; // Margin between legend and plot
    this.xMargin = 2; // margin for x-axis in graph
    this.yMargin = 5; // margin for top and bottom in graph
    this.extraWidth = $(document).innerWidth(); // Width for loading in extra edge data
    this.plotWidth = 0.9 * $(document).innerWidth() - this.legendMargin; // Width of one plot
    this.plotHeight = 180; // Height of one plot
    this.x = $(document).innerWidth() / 2 - this.plotWidth / 2; // X-position for first plot
    this.y = 10 + 2 * lineMargin + this.titleMargin; // Y-position for first plot
    this.canvasHeight = 2 + this.y + 2 * (this.xMargin + this.plotHeight); // Height for whole canvas
    this.moveImg = null; // Holds a copy of latest drawn scene, used for dragging interactive canvas
    this.borderColor = 'gray';

    // BAF values
    this.baf = {
      yStart: 1.0, // Start value for y axis
      yEnd: 0.0, // End value for y axis
      step: 0.2, // Step value for drawing ticks along y-axis
      color: '#000000' // Viz color
    };

    // LOGR values
    this.logr = {
      yStart: 4.0, // Start value for y axis
      yEnd: -4.0, // End value for y axis
      step: 1.0, // Step value for drawing ticks along y-axis
      color: '#000000' // Viz color
    };

    // Setup draw canvas
    this.drawWidth = Math.max(this.plotWidth + 2 * this.extraWidth, $(document).innerWidth()); // Draw-canvas width
    this.drawCanvas = new OffscreenCanvas(parseInt(this.drawWidth), parseInt(this.canvasHeight));
    this.context = this.drawCanvas.getContext('webgl2');

    // Setup visible canvases
    this.contentCanvas = document.getElementById('interactive-content');
    this.staticCanvas = document.getElementById('interactive-static');
    this.staticCanvas.width = this.contentCanvas.width = $(document).innerWidth();
    this.staticCanvas.height = this.contentCanvas.height = this.canvasHeight;

    // Data values
    const input = inputField.value.split(/:|-/);
    this.chromosome = input[0];
    this.start = input[1];
    this.end = input[2];
    this.allowDraw = true;

    // Listener values
    this.drag = false;
    this.dragStart;
    this.dragEnd;

    // WebGL scene variables
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(this.drawWidth / -2, this.drawWidth / 2,
      this.canvasHeight / -2, this.canvasHeight / 2, near, far);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.drawCanvas,
      context: this.context,
      antialiasing: true
    });

    // Change to fourth quadrant of scene
    this.camera.position.set(this.drawWidth / 2 - lineMargin,
      this.canvasHeight / 2 - lineMargin, 1);

    // Setup listeners
    this.contentCanvas.addEventListener('mousedown', (event) => {
      event.stopPropagation();
      if (!this.drag && this.allowDraw) {
        this.dragStart = {
          x: event.pageX - this.contentCanvas.offsetLeft,
          y: event.pageY - this.contentCanvas.offsetTop
        };
        this.dragEnd = {
          x: event.pageX - this.contentCanvas.offsetLeft,
          y: event.pageY - this.contentCanvas.offsetTop
        };
        this.drag = true;
      }
    });

    this.contentCanvas.addEventListener('mousemove', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (this.drag) {
        this.dragEnd = {
          x: event.pageX - this.contentCanvas.offsetLeft,
          y: event.pageY - this.contentCanvas.offsetTop
        };

        // Clear whole content canvas
        this.contentCanvas.getContext('2d').clearRect(0,
          this.titleMargin / 2,
          this.contentCanvas.width,
          this.contentCanvas.height);

        // Copy draw image to content Canvas
        let lineMargin = 2;
        this.contentCanvas.getContext('2d').drawImage(this.moveImg,
          this.extraWidth - (this.dragEnd.x - this.dragStart.x),
          this.y + lineMargin,
          this.plotWidth + 2 * this.xMargin,
          this.canvasHeight,
          this.x,
          this.y + lineMargin,
          this.plotWidth + 2 * this.xMargin,
          this.canvasHeight);
      }
    });

    this.contentCanvas.addEventListener('mouseup', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (this.drag) {
        this.drag = false;
        let scale = this.plotWidth / (this.end - this.start);
        let moveDist = Math.floor((this.dragStart.x - this.dragEnd.x) / scale);

        // Do not allow negative values
        if (this.start + moveDist < 0) {
          moveDist -= (this.start + moveDist);
        }
        this.start += moveDist;
        this.end += moveDist;

        this.redraw(null);
      }
    });

    document.addEventListener('DOMContentLoaded', () => {
      'use strict';

      const options = {
        eventType: 'keydown',
        keystrokeDelay: 1000
      };

      this.keyMapper(options);
    });
  }

  // Draw static content for interactive canvas
  drawStaticContent () {
    const linePadding = 2;
    const staticContext = this.staticCanvas.getContext('2d');

    // Fill background colour
    staticContext.fillStyle = 'white';
    staticContext.fillRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);

    // Make content area visible
    staticContext.clearRect(this.x + linePadding, this.y + linePadding,
      this.plotWidth, this.staticCanvas.height);
    staticContext.clearRect(0, 0, this.staticCanvas.width, this.y + linePadding);

    // Draw rotated y-axis legends
    staticContext.fillStyle = 'gray';
    drawRotatedText(this.staticCanvas, 'B Allele Freq', 18, this.x - this.legendMargin,
      this.y + this.plotHeight / 2, -Math.PI / 2);
    drawRotatedText(this.staticCanvas, 'Log R Ratio', 18, this.x - this.legendMargin,
      this.y + 1.5 * this.plotHeight, -Math.PI / 2);

    // Draw BAF
    createGraph(this.scene, this.staticCanvas, this.x, this.y, this.plotWidth,
      this.plotHeight, this.yMargin, this.baf.yStart, this.baf.yEnd,
      this.baf.step, true, this.borderColor);

    // Draw LogR
    createGraph(this.scene, this.staticCanvas, this.x, this.y + this.plotHeight,
      this.plotWidth, this.plotHeight, this.yMargin, this.logr.yStart,
      this.logr.yEnd, this.logr.step, true, this.borderColor);

    this.renderer.render(this.scene, this.camera);

    // Transfer image to visible canvas
    staticContext.drawImage(this.drawCanvas.transferToImageBitmap(), 0, 0);

    // Clear scene for next render
    this.scene.remove.apply(this.scene, this.scene.children);
  }

  // Draw values for interactive canvas
  drawInteractiveContent () {
    $.getJSON($SCRIPT_ROOT + '/_getoverviewcov', {
      region: this.inputField.value,
      sample_name: this.sampleName,
      hg_type: this.hgType,
      xpos: this.extraWidth,
      ypos: this.y,
      plot_height: this.plotHeight,
      extra_plot_width: this.extraWidth,
      y_margin: this.yMargin,
      x_ampl: this.plotWidth,
      baf_y_start: this.baf.yStart,
      baf_y_end: this.baf.yEnd,
      logr_y_start: this.logr.yStart,
      logr_y_end: this.logr.yEnd
    }, (result) => {
      // Clear canvas
      this.contentCanvas.getContext('2d').clearRect(0, 0,
        this.contentCanvas.width, this.contentCanvas.height);

      // Draw ticks for x-axis
      drawVerticalTicks(this.scene, this.contentCanvas, this.extraWidth, this.x,
        this.y, result['start'], result['end'], this.plotWidth, this.yMargin);

      // Draw horizontal lines for BAF and LogR
      drawGraphLines(this.scene, 0, result['y_pos'],
        this.baf.yStart, this.baf.yEnd, this.baf.step, this.yMargin,
        this.drawWidth, this.plotHeight);
      drawGraphLines(this.scene, 0, result['y_pos'] + this.plotHeight,
        this.logr.yStart, this.logr.yEnd, this.logr.step, this.yMargin,
        this.drawWidth, this.plotHeight);

      // Plot scatter data
      drawData(this.scene, result['baf'], this.baf.color);
      drawData(this.scene, result['data'], this.logr.color);
      this.renderer.render(this.scene, this.camera);

      // Draw chromosome title
      drawText(this.contentCanvas,
        $(document).innerWidth() / 2,
        result['y_pos'] - this.titleMargin,
        'Chromosome ' + result['chrom'], 'bold 15', 'center');

      this.moveImg = this.drawCanvas.transferToImageBitmap();

      // Transfer image to visible canvas
      this.contentCanvas.getContext('2d').drawImage(this.moveImg,
        this.extraWidth, 0, this.plotWidth + 2 * this.xMargin, this.canvasHeight,
        this.x, 0, this.plotWidth + 2 * this.xMargin, this.canvasHeight);

      // Clear scene before drawing
      this.scene.remove.apply(this.scene, this.scene.children);
    }).done((result) => {
      // Set values
      this.chromosome = result['chrom'];
      this.start = result['start'];
      this.end = result['end'];
      this.inputField.value = this.chromosome + ':' + this.start + '-' + this.end;
      this.inputField.placeholder = this.inputField.value;
      this.allowDraw = true;
      this.inputField.blur();
    }).fail((result) => {
      this.allowDraw = true;

      // Signal bad input by adding error class
      this.inputField.classList.add('error');
      this.inputField.disabled = true;

      // Remove error class after a while
      setTimeout( () => {
        this.inputField.classList.remove('error');
        this.inputField.value = this.inputField.placeholder;
        this.inputField.disabled = false;
      }, 1500);
    });
  }

  // Redraw interactive canvas
  redraw (inputValue) {
    if (!this.allowDraw) {
      return;
    }
    this.allowDraw = false;

    // Set input field
    if (inputValue) {
      this.inputField.value = inputValue;
    } else {
      this.inputField.value = this.chromosome + ':' + this.start + '-' + this.end;
    }

    this.drawInteractiveContent();

    // Clear tracks and annotations
    tc.clearTracks();
    ac.clearTracks();

    // Draw new tracks and annotations
    tc.drawTracks(this.inputField.value);
    ac.drawTracks(this.inputField.value);
  }

  // Key listener for quickly navigating between chromosomes
  keyMapper (options) {
    const keystrokeDelay = options.keystrokeDelay || 1000;

    let state = {
      buffer: '',
      lastKeyTime: Date.now()
    };

    document.addEventListener('keydown', event => {
      const key = event.key;
      const currentTime = Date.now();
      const eventType = window.event;
      const target = eventType.target || eventType.scrElement;
      const targetTagName = (target.nodeType === 1) ? target.nodeName.toUpperCase() : '';
      let buffer = '';

      // Do not listen to keydown events for active fields
      if (/INPUT|SELECT|TEXTAREA/.test(targetTagName)) {
        return;
      }

      if (key === 'Enter' &&
        currentTime - state.lastKeyTime < keystrokeDelay ||
        key.toLowerCase() == 'x' || key.toLowerCase() == 'y') {
        // Enter was pressed, process previous key presses.
        if (key.toLowerCase() == 'x') {
          this.chromosome = 23;
        } else if (key.toLowerCase() == 'y') {
          this.chromosome = 24;
        } else if (state.buffer <= oc.numChrom && state.buffer > 0) {
          this.chromosome = state.buffer;
        } else {
          // No valid key pressed
          return;
        }
        this.redraw (this.chromosome + ':0-None');
      } else if (!isFinite(key)) {
        // Arrow keys for moving graph
        switch (key) {
          case 'ArrowLeft':
            if (this.chromosome == 'X') {
              this.chromosome = '23';
            } else if (this.chromosome == 'Y') {
              this.chromosome = '24';
            }
            this.chromosome = parseInt(this.chromosome) - 1 < 1 ? 24 :
              parseInt(this.chromosome) - 1;
            console.log(this.chromosome);
            this.redraw (this.chromosome + ':0-None');
            break;
          case 'ArrowRight':
            if (this.chromosome == 'X') {
              this.chromosome = '23';
            } else if (this.chromosome == 'Y') {
              this.chromosome = '24';
            }
            this.chromosome = parseInt(this.chromosome) + 1 > 24 ? 1 :
              parseInt(this.chromosome) + 1;
            console.log(this.chromosome);
            this.redraw (this.chromosome + ':0-None');
            break;
          case 'a':
            left(this, sampleName);
            break;
          case 'd':
            right(this, sampleName);
            break;
          case 'w':
          case '+':
            zoomIn(this, sampleName);
            break;
          case 's':
          case '-':
            zoomOut(this, sampleName);
            break;
          default:
            return;
        }
      } else if (currentTime - state.lastKeyTime > keystrokeDelay) {
        // Reset buffer
        buffer = key;
      } else {
        if (state.buffer.length > 1) {
          // Buffer contains more than two digits, keep the last digit
          buffer = state.buffer[state.buffer.length - 1] + key;
        } else {
          // Add new digit to buffer
          buffer = state.buffer + key;
        }
      }
      // Save current state
      state = { buffer: buffer, lastKeyTime: currentTime };
    });
  }
}
