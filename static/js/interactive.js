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
    this.canvasHeight = 2 + this.y + 2 * (this.xMargin + this.plotHeight); // Canvas height
    this.moveImg = null; // Holds a copy of latest drawn scene, used for dragging interactive canvas

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
    let input = inputField.placeholder.split(/:|-/);
    this.chromosome = input[0];
    this.start = input[1];
    this.end = input[2];
    this.disallowDrag = false;
    this.disallowDraw = false;

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
    this.camera.position.x = this.drawWidth / 2 - lineMargin;
    this.camera.position.y = this.canvasHeight / 2 - lineMargin;
    this.camera.position.z = 1;
  }

  loadAnnotations (ac, region) {
    $.getJSON($SCRIPT_ROOT + '/_loadannotationrange', {
      sample_name: ac.sampleName,
      hg_type: this.hgType,
      region: region,
      top: this.y,
      left: this.x,
      width: this.plotWidth,
      height: this.plotHeight,
      logr_height: Math.abs(logr.yStart - logr.yEnd),
      baf_height: Math.abs(baf.yStart - baf.yEnd),
      y_margin: this.yMargin
    }, (result) => {
      let annotations = result['annotations'];
      ac.ctx.clearRect(0, 0, ac.annotationCanvas.width, this.canvasHeight);
      for (let i = 0; i < annotations.length; i++) {
        ac.addAnnotation(annotations[i]['x'], annotations[i]['y'],
          annotations[i]['width'], annotations[i]['height'],
          annotations[i]['text'], this, 'interactive');
      }
      ac.drawAnnotations();
    });
  }

  // Draw static content for interactive canvas
  drawStaticContent (baf, logr) {
    let linePadding = 2;
    let staticContext = this.staticCanvas.getContext('2d');
    // Fill background colour
    staticContext.fillStyle = 'white';
    staticContext.fillRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);

    // Make content area visible
    staticContext.clearRect(this.x + linePadding, this.y + linePadding,
      this.plotWidth, this.staticCanvas.height);
    staticContext.clearRect(0, 0, this.staticCanvas.width, this.y + linePadding);

    // Draw rotated y-axis legends
    staticContext.fillStyle = 'black';
    drawRotatedText(this.staticCanvas, 'B Allele Freq', 18, this.x - this.legendMargin,
      this.y + this.plotHeight / 2, -Math.PI / 2);
    drawRotatedText(this.staticCanvas, 'Log R Ratio', 18, this.x - this.legendMargin,
      this.y + 1.5 * this.plotHeight, -Math.PI / 2);

    // Draw BAF
    createGraph(this.scene, this.staticCanvas, this.x, this.y, this.plotWidth, this.plotHeight,
      this.yMargin, baf.yStart, baf.yEnd, baf.step, true);

    // Draw LogR
    createGraph(this.scene, this.staticCanvas, this.x, this.y + this.plotHeight, this.plotWidth,
      this.plotHeight, this.yMargin, logr.yStart, logr.yEnd, logr.step, true);

    this.renderer.render(this.scene, this.camera);

    // Transfer image to visible canvas
    staticContext.drawImage(this.drawCanvas.transferToImageBitmap(), 0, 0);

    // Clear scene for next render
    this.scene.remove.apply(this.scene, this.scene.children);
  }

  // Draw values for interactive canvas
  drawInteractiveContent (baf, logr) {
    $.getJSON($SCRIPT_ROOT + '/_getoverviewcov', {
      region: document.getElementById('region_field').placeholder,
      sample_name: this.sampleName,
      hg_type: this.hgType,
      xpos: this.extraWidth,
      ypos: this.y,
      plot_height: this.plotHeight,
      extra_plot_width: this.extraWidth,
      y_margin: this.yMargin,
      x_ampl: this.plotWidth,
      baf_y_start: baf.yStart,
      baf_y_end: baf.yEnd,
      logr_y_start: logr.yStart,
      logr_y_end: logr.yEnd
    }, (result) => {
      // Clear canvas
      this.contentCanvas.getContext('2d').clearRect(0, 0,
        this.contentCanvas.width, this.contentCanvas.height);

      // Draw ticks for x-axis
      drawVerticalTicks(this.scene, this.contentCanvas, this.extraWidth, this.x, this.y,
        result['start'], result['end'], this.plotWidth, this.yMargin);

      // Draw horizontal lines for BAF and LogR
      drawGraphLines(this.scene, 0, result['y_pos'],
        baf.yStart, baf.yEnd, baf.step, this.yMargin, this.drawWidth, this.plotHeight);
      drawGraphLines(this.scene, 0, result['y_pos'] + this.plotHeight,
        logr.yStart, logr.yEnd, logr.step, this.yMargin, this.drawWidth, this.plotHeight);

      // Plot scatter data
      drawData(this.scene, result['baf'], baf.color);
      drawData(this.scene, result['data'], logr.color);
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

      // Set values
      this.chromosome = result['chrom'];
      this.start = result['start'];
      this.end = result['end'];
      this.inputField.placeholder = this.chromosome + ':' + this.start + '-' + this.end;
    }).done(() => {
      this.disallowDraw = false;
      this.inputField.blur();
    }).fail((result) => {
      console.log('Bad input');
      this.inputField.placeholder = 'Bad input: ' + this.inputField.placeholder;
      this.inputField.value = '';
    });
  }

  // Check if coordinates is inside the graph
  insideGraph (x, y) {
    if (x < (this.x + this.plotWidth) && x > this.x &&
      y < (this.y + 2 * this.plotHeight) && y > this.y) {
      return true;
    } else {
      return false;
    }
  }

  // Redraw interactive canvas
  redraw (ac, baf, logr, inputValue) {
    if (this.disallowDraw) {
      return;
    }
    this.disallowDrag = false;
    this.disallowDraw = true;

    ac.saveAnnotations();

    // Clear annotations and tracks
    ac.clearAnnotations(this.canvasHeight);
    tc.clearTracks();

    // Set input field
    if (inputValue) {
      this.inputField.placeholder = inputValue;
    } else {
      this.inputField.placeholder = this.chromosome + ':' + this.start + '-' + this.end;
    }

    this.drawInteractiveContent(baf, logr);
    this.loadAnnotations(ac, this.inputField.placeholder);
    ac.drawAnnotations();
    tc.drawTracks(this.inputField.placeholder);
  }
}
