class OverviewCanvas {
  constructor (xPos, lineMargin, near, far) {
    // Plot variables
    this.plotWidth = 120; // Width of one plot
    this.plotHeight = 100; // Height of one plot
    this.x = xPos; // X-position for plot
    this.y = 20 + 2 * lineMargin; // Y-position for plot
    this.numChrom = 24; // Number of displayable chromosomes, 23 and 24 are X respectively Y chromosomes.
    this.rowMargin = 30; // margin between rows
    this.titleMargin = 10; // Margin between plot and title
    this.leftMargin = 0.05 * $(document).innerWidth(); // Margin between graphs and page
    this.xMargin = 2; // margin for x-axis in graph
    this.yMargin = 5; // margin for top and bottom in graph
    this.leftmostPoint = this.x + 10; // Draw y-values for graph left of this point

    // Set canvas height
    this.rightMargin = ($(document).innerWidth() - this.x - 10);
    this.chromPerRow =  Math.floor((this.rightMargin - this.x) / this.plotWidth);
    let numRows = Math.ceil(this.numChrom / this.chromPerRow);
    this.rowHeight = (this.titleMargin + this.rowMargin + 2 * (this.xMargin + this.plotHeight));

    // Canvas variables
    this.width = $(document).innerWidth(); // Canvas width
    this.height = this.y + numRows * this.rowHeight; // Canvas height
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

  drawOverviewContent (oc, baf, logr) {
    let drawnChrom = 0; // Amount of async drawn chromosomes

    $.getJSON($SCRIPT_ROOT + '/_overviewchromdim', {
      num_chrom: oc.numChrom,
      x_pos: oc.x,
      y_pos: oc.y + oc.rowMargin,
      plot_width: oc.plotWidth,
      plot_height: 2 * oc.plotHeight,
      right_margin: oc.rightMargin,
      row_height: oc.rowHeight,
    }).done(function (result) {
      let dims = result['chrom_dims'];
      for (let chrom = 1; chrom <= dims.length &&
        chrom <= oc.numChrom; chrom++) {
        // Draw data
        $.getJSON($SCRIPT_ROOT + '/_getoverviewcov', {
          region: chrom + ':0-None',
          sample_name: sampleName,
          xpos: dims[chrom - 1]['x_pos'] + oc.xMargin,
          ypos: dims[chrom - 1]['y_pos'],
          plot_height: oc.plotHeight,
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
            result['y_pos'], width, oc.plotHeight, oc.yMargin,
            baf.yStart, baf.yEnd, baf.step,
            result['x_pos'] < oc.leftmostPoint);
          drawGraphLines(oc.scene, result['x_pos'], result['y_pos'],
            baf.yStart, baf.yEnd, baf.step, oc.yMargin,
            width, oc.plotHeight);

          // Draw LogR
          createGraph(oc.scene, staticCanvas,
            result['x_pos'] - oc.xMargin,
            result['y_pos'] + oc.plotHeight, width,
            oc.plotHeight, oc.yMargin, logr.yStart,
            logr.yEnd, logr.step,
            result['x_pos'] < oc.leftmostPoint);
          drawGraphLines(oc.scene, result['x_pos'],
            result['y_pos'] + oc.plotHeight, logr.yStart,
            logr.yEnd, logr.step, oc.yMargin,
            width, oc.plotHeight);

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

  loadAnnotations (ac, oc) {
    $.getJSON($SCRIPT_ROOT + '/_loadallannotations', {
      sample_name: ac.sampleName,
      num_chrom: oc.numChrom,
      left: oc.x,
      top: oc.y + oc.staticCanvas.offsetTop - ac.yOffset + oc.rowMargin,
      width: oc.plotWidth,
      height: oc.plotHeight,
      row_height: oc.rowHeight,
      right_margin: oc.rightMargin,
      y_margin: oc.yMargin,
    }, function(result) {
      let annotations = result['annotations'];
      ac.ctx.clearRect(0, 0, 0, ac.annotationCanvas.width);
      for (let i = 0; i < annotations.length; i++) {
        ac.addAnnotation(annotations[i]['x'], annotations[i]['y'], annotations[i]['text'], oc, 'overview');
      }
      ac.drawAnnotations();
    });
  }

  // Check if coordinates is inside the graph
  insideGraph (x, y, callback) {
    $.getJSON($SCRIPT_ROOT + '/_overviewchromdim', {
      num_chrom: oc.numChrom,
      x_pos: oc.x,
      y_pos: oc.y + oc.staticCanvas.offsetTop - ac.yOffset + oc.rowMargin,
      plot_width: oc.plotWidth,
      plot_height: oc.plotHeight,
      right_margin: oc.rightMargin,
      row_height: oc.rowHeight,
      margin: oc.xMargin,
      current_x: x,
      current_y: y,
    }).done(function (result) {
      if (result['current_chrom'] == null) {
        return false;
      } else {
        return callback(x, y, '', oc, 'overview');
      }
    });
  }
}
