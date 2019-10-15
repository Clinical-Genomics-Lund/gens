import { drawText, createGraph, drawGraphLines, drawData } from './modules/genecanvas.mjs';

export class OverviewCanvas {
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
    this.xAmpl = this.boxWidth - 2 * this.xMargin; // Part of amplitude for scaling x-axis to fill whole width

    // Set canvas height
    this.rightMargin = ($(document).innerWidth() - this.x - adjustedMargin);
    let numRows = Math.ceil(this.numChrom / ((this.rightMargin - this.x) / this.boxWidth));
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
  }

  drawOverviewContent (baf, logr, logRMedian) {
    let chrom = 1; // First chromosome
    let drawnChrom = 0; // Amount of async drawn chromosomes
    let yPos = this.y + this.rowMargin;

    while (chrom <= this.numChrom) {
      // Fill row with graphs, start on new row when full
      for (let xPos = this.x;
        (xPos + this.boxWidth < this.rightMargin) && (chrom <= this.numChrom);
        xPos += this.boxWidth) {
        // Draw data
        $.getJSON($SCRIPT_ROOT + '/_getoverviewcov', {
          region: chrom + ':0-None',
          median: logRMedian,
          xpos: xPos + this.xMargin,
          ypos: yPos,
          boxHeight: this.boxHeight,
          y_margin: this.yMargin,
          x_ampl: this.xAmpl
        }, function (result) {
          let staticCanvas = document.getElementById('overview-static');
          // Draw chromosome title
          drawText(staticCanvas,
            result['x_pos'] - this.xMargin + this.boxWidth / 2,
            result['y_pos'] - this.titleMargin,
            result['chrom'], 10, 'center');

          // Draw BAF
          createGraph(this.scene, staticCanvas,
            result['x_pos'] - this.xMargin,
            result['y_pos'], this.boxWidth, this.boxHeight, this.yMargin,
            baf.yStart, baf.yEnd, baf.step,
            result['x_pos'] < this.leftmostPoint);
          drawGraphLines(this.scene, result['x_pos'], result['y_pos'],
            baf.yStart, baf.yEnd, baf.step, this.yMargin,
            this.boxWidth, this.boxHeight);

          // Draw LogR
          createGraph(this.scene, staticCanvas,
            result['x_pos'] - this.xMargin,
            result['y_pos'] + this.boxHeight, this.boxWidth,
            this.boxHeight, this.yMargin, logr.yStart,
            logr.yEnd, logr.step,
            result['x_pos'] < this.leftmostPoint);
          drawGraphLines(this.scene, result['x_pos'],
            result['y_pos'] + this.boxHeight, logr.yStart,
            logr.yEnd, logr.step, this.yMargin,
            this.boxWidth, this.boxHeight);

          // Plot scatter data
          drawData(this.scene, result['baf'], '#FF0000');
          drawData(this.scene, result['data'], '#000000');
        }).done(function (result) {
          if (++drawnChrom === this.numChrom) {
            // Render scene and transfer to visible canvas
            this.renderer.render(this.scene, this.camera);
            this.staticCanvas.getContext('2d').drawImage(
              this.contentCanvas.transferToImageBitmap(), 0, 0);
            document.getElementById('progress-bar').remove();
            document.getElementById('progress-container').remove();
            document.getElementById('grid-container').style.visibility =
                'visible';
          } else {
            document.getElementById('progress-bar').value =
                drawnChrom / this.numChrom;
          }
        }).fail(function (result) {
          console.log(result['responseText']);
          drawnChrom++;
        });
        chrom++;
      }
      // Start on new row
      yPos += 2 * this.boxHeight + this.rowMargin;
    }
  }
}
