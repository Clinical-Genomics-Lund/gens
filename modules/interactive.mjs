import { drawVerticalTicks, drawGraphLines, drawData, drawText,
  drawRotatedText, createGraph } from './modules/genecanvas.mjs';

export class InteractiveCanvas {
  constructor (inputField, lineMargin, near, far) {
    this.inputField = inputField; // The canvas input field to display and fetch chromosome range from

    // Box variables
    this.titleMargin = 60; // Margin between box and title
    this.legendMargin = 45; // Margin between legend and box
    this.xMargin = 2; // margin for x-axis in graph
    this.yMargin = 5; // margin for top and bottom in graph
    this.boxWidth = 0.9 * $(document).innerWidth() - this.legendMargin; // Width of one box
    this.boxHeight = 180; // Height of one box
    this.width = Math.max(this.boxWidth + 2 * this.extraWidth, $(document).innerWidth()); // Canvas width
    this.height = 2 + this.y + this.titleMargin +
      2 * (this.xMargin + this.boxHeight + lineMargin); // Canvas height
    this.x = this.width / 2 - this.boxWidth / 2; // X-position for first box
    this.y = 10 + 2 * lineMargin + this.titleMargin; // Y-position for first box
    this.xAmpl = this.boxWidth - 2 * this.xMargin; // Part of amplitude for scaling x-axis to fill whole box width
    this.extraWidth = $(document).innerWidth(); // Width for loading in extra edge data
    this.moveImg = null; // Placeholder for image copy of contentCanvas

    // Canvases
    this.drawCanvas = new OffscreenCanvas(this.width, this.height);
    this.context = this.drawCanvas.getContext('webgl2');
    this.contentCanvas = document.getElementById('interactive-content');
    this.staticCanvas = document.getElementById('interactive-static');

    // Data values
    this.chromosome = null;
    this.start = null;
    this.end = null;
    this.disallowDrag = false;

    // WebGL scene variables
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(this.width / -2, this.width / 2,
      this.height / -2, this.height / 2, near, far);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.drawCanvas,
      context: this.context,
      antialiasing: true
    });

    // Change to fourth quadrant of scene
    this.camera.position.x = this.width / 2 - lineMargin;
    this.camera.position.y = this.height / 2 - lineMargin;
    this.camera.position.z = 1;

    // Set dimensions of overview canvases
    this.staticCanvas.width = this.width;
    this.staticCanvas.height = this.height;
    this.contentCanvas.width = this.width;
    this.contentCanvas.height = this.height;

    this.staticCanvas.getContext('2d').clearRect(0, 0, this.width, this.height); // TODO: remove this?
  }

  // Draw static content for interactive canvas
  drawStaticContent (baf, logr) {
    let linePadding = 2;
    // Fill background colour
    this.staticCanvas.getContext('2d').fillStyle = 'white';
    this.staticCanvas.getContext('2d').fillRect(0, 0, this.width, this.height);

    // Make content area visible
    this.staticCanvas.getContext('2d').clearRect(this.x + linePadding,
      this.y + linePadding, this.boxWidth, this.width);
    this.staticCanvas.getContext('2d').clearRect(0, 0, this.width,
      this.y + linePadding);

    this.staticCanvas.getContext('2d').fillStyle = 'black';
    // Draw rotated y-axis legends
    drawRotatedText(this.staticCanvas, 'B Allele Freq', 18, this.x - this.legendMargin,
      this.y + this.boxHeight / 2, -Math.PI / 2);
    drawRotatedText(this.staticCanvas, 'Log R Ratio', 18, this.x - this.legendMargin,
      this.y + 1.5 * this.boxHeight, -Math.PI / 2);

    // Draw BAF
    createGraph(this.scene, this.staticCanvas, this.x, this.y, this.boxWidth, this.boxHeight,
      this.yMargin, baf.yStart, baf.yEnd, baf.step, true);

    // Draw LogR
    createGraph(this.scene, this.staticCanvas, this.x, this.y + this.boxHeight, this.boxWidth,
      this.boxHeight, this.yMargin, logr.yStart, logr.yEnd, logr.step, true);

    this.renderer.render(this.scene, this.camera);

    // Transfer image to visible canvas
    this.staticCanvas.getContext('2d').drawImage(
      this.drawCanvas.transferToImageBitmap(), 0, 0);

    // Clear scene for next render
    this.scene.remove.apply(this.scene, this.scene.children);
  }

  // Draw values for interactive canvas
  drawInteractiveContent (baf, logr, logRMedian) {
    $.getJSON($SCRIPT_ROOT + '/_getoverviewcov', {
      region: document.getElementById('region_field').placeholder,
      median: logRMedian,
      xpos: this.x + this.xMargin,
      ypos: this.y,
      boxHeight: this.boxHeight,
      extra_box_width: this.extraWidth,
      y_margin: this.yMargin,
      x_ampl: this.xAmpl
    }, function (result) {
      // Clear canvas
      this.contentCanvas.getContext('2d').clearRect(0, 0,
        this.contentCanvas.width, this.contentCanvas.height);

      // Draw ticks for x-axis
      let ampl = (this.boxWidth) / (result['start'] - result['end']);
      drawVerticalTicks(this.scene, this.contentCanvas, this.x, this.y,
        result['start'], result['end'], this.boxWidth,
        Math.floor((result['end'] - result['start']) / 20), ampl, this.yMargin);

      // Draw horizontal lines for BAF and LogR
      drawGraphLines(this.scene, 0, result['y_pos'],
        baf.yStart, baf.yEnd, baf.step, this.yMargin, this.width, this.boxHeight);
      drawGraphLines(this.scene, 0, result['y_pos'] + this.boxHeight,
        logr.yStart, logr.yEnd, logr.step, this.yMargin, this.width, this.boxHeight);

      // Plot scatter data
      drawData(this.scene, result['baf'], '#FF0000');
      drawData(this.scene, result['data'], '#000000');
      this.renderer.render(this.scene, this.camera);

      // Draw chromosome title
      drawText(this.contentCanvas,
        result['x_pos'] - this.xMargin + this.boxWidth / 2,
        result['y_pos'] - this.titleMargin,
        'Chromosome ' + result['chrom'], 'bold 15', 'center');

      // Transfer image to visible canvas
      this.contentCanvas.getContext('2d').drawImage(
        this.drawCanvas.transferToImageBitmap(), 0, 0);

      // Clear scene before drawing
      this.scene.remove.apply(this.scene, this.scene.children);

      // Set values
      this.chromosome = result['chrom'];
      this.start = result['start'];
      this.end = result['end'];
      this.inputField.placeholder = this.chromosome + ':' + this.start + '-' + this.end;
    }).done(function () {
      this.inputField.blur();
    }).fail(function (result) {
      console.log('Bad input');
      this.inputField.placeholder = 'Bad input: ' + this.inputField.placeholder;
      this.inputField.value = '';
    });
  }

  // Redraw interactive canvas
  redraw () {
    this.disallowDrag = false;
    this.inputField.placeholder = this.chromosome + ':' + this.start + '-' + this.end;
    this.drawInteractiveContent();
  }
}
