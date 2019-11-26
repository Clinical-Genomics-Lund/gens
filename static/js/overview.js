class OverviewCanvas {
  constructor (xPos, lineMargin, adjustedMargin, near, far) {
    // Box variables
    this.boxWidth = 120; // Width of one box
    this.boxHeight = 100; // Height of one box
    this.x = xPos; // X-position for box
    this.y = 20 + 2 * lineMargin; // Y-position for box
    this.numChrom = 24; // Number of displayable chromosomes, 23 and 24 are X respectively Y chromosomes.
    this.rowMargin = 30; // margin between rows
    this.titleMargin = 10; // Margin between box and title
    this.leftMargin = 0.05 * $(document).innerWidth(); // Margin between graphs and page
    this.xMargin = 2; // margin for x-axis in graph
    this.yMargin = 5; // margin for top and bottom in graph
    this.leftmostPoint = this.x + 10; // Draw y-values for graph left of this point
    this.adjustedMargin = adjustedMargin;

    // Set canvas height
    this.rightMargin = ($(document).innerWidth() - this.x - this.adjustedMargin - 10);
    this.chromPerRow =  Math.floor((this.rightMargin - this.x) / this.boxWidth);
    let numRows = Math.ceil(this.numChrom / this.chromPerRow);
    let rowHeight = (this.titleMargin + this.rowMargin + 2 * (this.xMargin + this.boxHeight));

    // Canvas variables
    this.width = $(document).innerWidth(); // Canvas width
    this.height = this.y + numRows * rowHeight; // Canvas height
    this.contentCanvas = new OffscreenCanvas(this.width, this.height);
    this.staticCanvas = document.getElementById('overview-static');
    this.context = this.contentCanvas.getContext('webgl2');

    // WebGL scene variables
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(this.width / -2, this.width / 2,
      this.height / -2, this.height / 2, near, far);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.contentCanvas, context: this.context, antialiasing: true });

    // Change to fourth quadrant of scene
    this.camera.position.x = this.width / 2 - lineMargin;
    this.camera.position.y = this.height / 2 - lineMargin;
    this.camera.position.z = 1;

    // Set dimensions of overview canvases
    this.staticCanvas.width = this.width;
    this.staticCanvas.height = this.height;
    let _this = this;
  }

  drawOverviewContent (oc, baf, logr, logRMedian) {
    let drawnChrom = 0; // Amount of async drawn chromosomes

    $.getJSON($SCRIPT_ROOT + '/_overviewchromdim', {
      num_chrom: oc.numChrom,
      x_pos: oc.x,
      y_pos: oc.y + oc.rowMargin,
      box_width: oc.boxWidth,
      right_margin: oc.rightMargin,
      row_height: 2 * oc.boxHeight + oc.rowMargin,
      x_margin: 2 * oc.xMargin
    }).done(function (result) {
      let dims = result['chrom_dims']
      for (let chrom = 1; chrom <= dims.length &&
        chrom <= oc.numChrom; chrom++) {
        // Draw data
        $.getJSON($SCRIPT_ROOT + '/_getoverviewcov', {
          region: chrom + ':0-None',
          median: logRMedian,
          xpos: dims[chrom - 1]['x_pos'] + oc.xMargin,
          ypos: dims[chrom - 1]['y_pos'],
          boxHeight: oc.boxHeight,
          y_margin: oc.yMargin,
          x_ampl: dims[chrom - 1]['width'] - 2 * oc.xMargin,
          baf_y_start: baf.yStart,
          baf_y_end: baf.yEnd,
          logr_y_start: logr.yStart,
          logr_y_end: logr.yEnd
        }, function (result) {
          let staticCanvas = document.getElementById('overview-static');
          let chrom = result['chrom']
          if (chrom == 'X') chrom = 23;
          if (chrom == 'Y') chrom = 24;
          chrom = parseInt(chrom);
          let width = dims[chrom - 1]['width']

          // Draw chromosome title
          drawText(staticCanvas,
            result['x_pos'] - oc.xMargin + width / 2,
            result['y_pos'] - oc.titleMargin,
            result['chrom'], 10, 'center');

          // Draw BAF
          createGraph(oc.scene, staticCanvas,
            result['x_pos'] - oc.xMargin,
            result['y_pos'], width, oc.boxHeight, oc.yMargin,
            baf.yStart, baf.yEnd, baf.step,
            result['x_pos'] < oc.leftmostPoint);
          drawGraphLines(oc.scene, result['x_pos'], result['y_pos'],
            baf.yStart, baf.yEnd, baf.step, oc.yMargin,
            width, oc.boxHeight);

          // Draw LogR
          createGraph(oc.scene, staticCanvas,
            result['x_pos'] - oc.xMargin,
            result['y_pos'] + oc.boxHeight, width,
            oc.boxHeight, oc.yMargin, logr.yStart,
            logr.yEnd, logr.step,
            result['x_pos'] < oc.leftmostPoint);
          drawGraphLines(oc.scene, result['x_pos'],
            result['y_pos'] + oc.boxHeight, logr.yStart,
            logr.yEnd, logr.step, oc.yMargin,
            width, oc.boxHeight);

          // Plot scatter data
          drawData(oc.scene, result['baf'], baf.color);
          drawData(oc.scene, result['data'], logr.color);
        }).done(function (result) {
          if (++drawnChrom === oc.numChrom) {
            // Render scene and transfer to visible canvas
            oc.renderer.render(oc.scene, oc.camera);
            oc.staticCanvas.getContext('2d').drawImage(
              oc.contentCanvas.transferToImageBitmap(), 0, 0);
            document.getElementById('progress-bar').remove();
            document.getElementById('progress-container').remove();
            document.getElementById('grid-container').style.visibility =
                'visible';
            document.getElementById('grid-container').style.display = 'grid';
          } else {
            document.getElementById('progress-bar').value =
                drawnChrom / oc.numChrom;
          }
        }).fail(function (result) {
          console.log(result['responseText']);
          drawnChrom++;
        });
      }
    });
  }

  // Convert screen coordinates to data coordinates
  toDataCoord (xPos, yPos) {
    let adjustedXPos = this.x + adjustedMargin;

    // Calculate x position
    let x = this.start + (this.end - this.start) * ((xPos - adjustedXPos) / this.boxWidth);
    if (yPos <= (this.y + this.boxHeight)) {
      // Calculate y position for BAF
      let y = (this.y + this.boxHeight - this.yMargin - yPos) /
        (this.boxHeight - 2 * this.yMargin);
      return [x, y, true, this.chromosome];
    } else {
      // Calculate y position for LogR
      let y = (this.y + 1.5 * this.boxHeight - yPos) / (this.boxHeight - 2 * this.yMargin);
      return [x, y, false, this.chromosome];
    }
  }

  // Convert data coordinates to screen coordinates
  toScreenCoord (xPos, yPos, baf, chrom) {
    // Set the global configs to synchronous
    $.ajaxSetup({
      async: false
    });

    $.getJSON($SCRIPT_ROOT + '/_overviewchromdim', {
      num_chrom: this.numChrom,
      x_pos: this.x,
      y_pos: this.y + this.rowMargin,
      box_width: this.boxWidth,
      right_margin: this.rightMargin,
      row_height: 2 * this.boxHeight + this.rowMargin,
      x_margin: 2 * this.xMargin
    }).done(function (result) {
      console.log(result);
      let dims = result['chrom_dims'][chrom];
      console.log(xPos, yPos, baf, dims['x_pos'], dims['y_pos'],
        dims['size'], 0, dims['width'], oc.boxHeight, oc.yMargin);
      return dataToScreen(xPos, yPos, baf, dims['x_pos'], dims['y_pos'],
        dims['size'], 0, dims['width'], oc.boxHeight, oc.yMargin);
    }).fail(function (result){
      console.log('failed');
      return null;
    });
    console.log('hej');

    // Set the global configs to synchronous
    $.ajaxSetup({
      async: true
    });
  }

  // Check if coordinates is inside the graph
  insideGraph (x, y) {
    let yPos = 2 * this.y + this.staticCanvas.offsetTop;
    for (let i = 0; i < this.numChrom; i++) {
      // Take new row into account
      if (i > 0 && i % this.chromPerRow == 0) {
        yPos += 2 * this.boxHeight + this.rowMargin;
      }
      if (x > this.x + this.adjustedMargin + (i % this.chromPerRow) * this.boxWidth &&
          x < this.x + this.adjustedMargin + ((i % this.chromPerRow) + 1) * this.boxWidth &&
          y > yPos && y < yPos + 2 * this.boxHeight) {
        return true;
      }
    }
    return false;
  }
}
