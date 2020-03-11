class OverviewCanvas {
  constructor (xPos, lineMargin, near, far, sampleName, hgType) {
    this.sampleName = sampleName; // File name to load data from
    this.hgType = hgType; // Whether to load HG37 or HG38, default is HG38

    // Plot variables
    this.plotWidth = 120; // Width of one plot
    this.plotHeight = 180; // Height of one plot
    this.x = xPos; // X-position for plot
    this.y = 5 + 2 * lineMargin; // Y-position for plot
    this.numChrom = 24; // Number of displayable chromosomes
    this.chromosomes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
      '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21',
      '22', 'X', 'Y'] // For looping purposes
    this.rowMargin = 30; // margin between rows
    this.titleMargin = 10; // Margin between plot and title
    this.leftMargin = 0.05 * document.body.clientWidth; // Margin between graphs and page
    this.xMargin = 2; // margin for x-axis in graph
    this.yMargin = 8; // margin for top and bottom in graph
    this.leftmostPoint = this.x + 10; // Draw y-values for graph left of this point
    this.borderColor = 'gray';

    // BAF values
    this.baf = {
      yStart: 1.0, // Start value for y axis
      yEnd: 0.0, // End value for y axis
      step: 0.2, // Step value for drawing ticks along y-axis
      color: '#000000' // Viz color
    };

    // Log2 ratio values
    this.log2 = {
      yStart: 3.0, // Start value for y axis
      yEnd: -3.0, // End value for y axis
      step: 1.0, // Step value for drawing ticks along y-axis
      color: '#000000' // Viz color
    };

    // Set canvas height
    this.rightMargin = (document.body.clientWidth - this.x - 10);
    this.chromPerRow =  Math.floor((this.rightMargin - this.x) / this.plotWidth);
    let numRows = Math.ceil(this.numChrom / this.chromPerRow);
    this.rowHeight = (this.titleMargin + this.rowMargin + 2 * (this.xMargin + this.plotHeight));

    // Canvas variables
    this.width = document.body.clientWidth; // Canvas width
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
    this.camera.position.set(this.width / 2 - lineMargin,
      this.height / 2 - lineMargin, 1);

    // Set dimensions of overview canvases
    this.staticCanvas.width = this.width;
    this.staticCanvas.height = this.height;
    let _this = this;
  }

  drawOverviewContent (printing) {
    let drawnChrom = 0; // Amount of async drawn chromosomes

    $.getJSON($SCRIPT_ROOT + '/_overviewchromdim', {
      hg_type: this.hgType,
      x_pos: this.x,
      y_pos: this.y + this.rowMargin,
      plot_width: this.plotWidth,
      plot_height: 2 * this.plotHeight,
      right_margin: this.rightMargin,
      row_height: this.rowHeight,
    }).done( (result) => {
      let dims = result['chrom_dims'];
      for (let i = 0; i < this.chromosomes.length; i++) {
        let chrom = this.chromosomes[i];
        // Draw data
        $.getJSON($SCRIPT_ROOT + '/_getoverviewcov', {
          region: chrom + ':0-None',
          sample_name: this.sampleName,
          hg_type: this.hgType,
          xpos: dims[chrom]['x_pos'] + this.xMargin,
          ypos: dims[chrom]['y_pos'],
          plot_height: this.plotHeight,
          y_margin: this.yMargin,
          x_ampl: dims[chrom]['width'] - 2 * this.xMargin,
          baf_y_start: this.baf.yStart,
          baf_y_end: this.baf.yEnd,
          log2_y_start: this.log2.yStart,
          log2_y_end: this.log2.yEnd,
          overview: 'True'
        }, (result) => {
          let staticCanvas = document.getElementById('overview-static');
          chrom = result['chrom']
          let width = dims[chrom]['width']

          // Draw chromosome title
          drawText(staticCanvas,
            result['x_pos'] - this.xMargin + width / 2,
            result['y_pos'] - this.titleMargin,
            result['chrom'], 10, 'center');

          // Draw BAF
          createGraph(this.scene, staticCanvas,
            result['x_pos'] - this.xMargin,
            result['y_pos'], width, this.plotHeight, this.yMargin,
            this.baf.yStart, this.baf.yEnd, this.baf.step,
            result['x_pos'] < this.leftmostPoint, this.borderColor);
          drawGraphLines(this.scene, result['x_pos'], result['y_pos'],
            this.baf.yStart, this.baf.yEnd, this.baf.step, this.yMargin,
            width, this.plotHeight);

          // Draw Log 2 ratio
          createGraph(this.scene, staticCanvas,
            result['x_pos'] - this.xMargin,
            result['y_pos'] + this.plotHeight, width,
            this.plotHeight, this.yMargin, this.log2.yStart,
            this.log2.yEnd, this.log2.step,
            result['x_pos'] < this.leftmostPoint, this.borderColor);
          drawGraphLines(this.scene, result['x_pos'],
            result['y_pos'] + this.plotHeight, this.log2.yStart,
            this.log2.yEnd, this.log2.step, this.yMargin,
            width, this.plotHeight);

          // Plot scatter data
          drawData(this.scene, result['baf'], this.baf.color);
          drawData(this.scene, result['data'], this.log2.color);
        }).done( (result) =>  {
          if (++drawnChrom === this.numChrom) {
            // Render scene and transfer to visible canvas
            this.renderer.render(this.scene, this.camera);
            this.staticCanvas.getContext('2d').drawImage(
              this.contentCanvas.transferToImageBitmap(), 0, 0);
            document.getElementById('progress-bar').remove();
            document.getElementById('progress-container').remove();
            document.getElementById('grid-container').style.visibility =
              'visible';
            document.getElementById('grid-container').style.display = 'grid';
            if (printing == true) {
              printPage();
            }
          } else {
            document.getElementById('progress-bar').value =
              drawnChrom / this.numChrom;
          }
        }).fail( (result) => {
          console.log(result['responseText']);
          drawnChrom++;
        });
      }
    });
  }
}
