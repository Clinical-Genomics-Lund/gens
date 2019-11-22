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

    // Set canvas height
    this.rightMargin = ($(document).innerWidth() - this.x - adjustedMargin);
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
    let chrom = 1; // First chromosome
    let drawnChrom = 0; // Amount of async drawn chromosomes
    let yPos = oc.y + oc.rowMargin;

    while (chrom <= oc.numChrom) {
      // Fill row with graphs, start on new row when full
      for (let xPos = oc.x;
        (xPos + oc.boxWidth < oc.rightMargin) && (chrom <= oc.numChrom);
        xPos += oc.boxWidth) {

        // Draw data
        $.getJSON($SCRIPT_ROOT + '/_getoverviewcov', {
          region: chrom + ':0-None',
          median: logRMedian,
          xpos: xPos + oc.xMargin,
          ypos: yPos,
          boxHeight: oc.boxHeight,
          boxWidth: oc.boxWidth,
          y_margin: oc.yMargin,
          x_margin: 2 * oc.xMargin,
          baf_y_start: baf.yStart,
          baf_y_end: baf.yEnd,
          logr_y_start: logr.yStart,
          logr_y_end: logr.yEnd
        }, function (result) {
          let staticCanvas = document.getElementById('overview-static');
          // Draw chromosome title
          drawText(staticCanvas,
            result['x_pos'] - oc.xMargin + result['box_width'] / 2,
            result['y_pos'] - oc.titleMargin,
            result['chrom'], 10, 'center');

          // Draw BAF
          createGraph(oc.scene, staticCanvas,
            result['x_pos'] - oc.xMargin,
            result['y_pos'], result['box_width'], oc.boxHeight, oc.yMargin,
            baf.yStart, baf.yEnd, baf.step,
            result['x_pos'] < oc.leftmostPoint);
          drawGraphLines(oc.scene, result['x_pos'], result['y_pos'],
            baf.yStart, baf.yEnd, baf.step, oc.yMargin,
            result['box_width'], oc.boxHeight);

          // Draw LogR
          createGraph(oc.scene, staticCanvas,
            result['x_pos'] - oc.xMargin,
            result['y_pos'] + oc.boxHeight, result['box_width'],
            oc.boxHeight, oc.yMargin, logr.yStart,
            logr.yEnd, logr.step,
            result['x_pos'] < oc.leftmostPoint);
          drawGraphLines(oc.scene, result['x_pos'],
            result['y_pos'] + oc.boxHeight, logr.yStart,
            logr.yEnd, logr.step, oc.yMargin,
            result['box_width'], oc.boxHeight);

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
        chrom++;
      }
      // Start on new row
      yPos += 2 * oc.boxHeight + oc.rowMargin;
    }
  }

  // Check if coordinates is inside the graph
  insideGraph (x, y) {
    let yPos = 2 * this.y + this.staticCanvas.offsetTop;
    for (let i = 0; i < this.numChrom; i++) {
      // Take new row into account
      if (i > 0 && i % this.chromPerRow == 0) {
        yPos += 2 * this.boxHeight + this.rowMargin;
      }
      if (x > this.x + adjustedMargin + (i % this.chromPerRow) * this.boxWidth &&
          x < this.x + adjustedMargin + ((i % this.chromPerRow) + 1) * this.boxWidth &&
          y > yPos && y < yPos + 2 * this.boxHeight) {
        return true;
      }
    }
    return false;
  }
}
