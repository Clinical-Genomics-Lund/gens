class OverviewCanvas extends FrequencyTrack {
  constructor (xPos, fullPlotWidth, lineMargin, near, far, sampleName,
    hgType, hgFileDir) {
    super(sampleName, hgType, hgFileDir)

    // Plot variables
    this.fullPlotWidth = fullPlotWidth; // Width for all chromosomes to fit in
    this.plotHeight = 180; // Height of one plot
    this.titleMargin = 10; // Margin between plot and title
    this.legendMargin = 45; // Margin between legend and plot
    this.x = xPos; // Starting x-position for plot
    this.y = 20 + this.titleMargin + 2 * lineMargin; // Starting y-position for plot
    this.leftRightPadding = 2; // Padding for left and right in graph
    this.topBottomPadding = 8; // Padding for top and bottom in graph
    this.leftmostPoint = this.x + 10; // Draw y-values for graph left of this point

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

    // Canvas variables
    this.width = document.body.clientWidth; // Canvas width
    this.height = this.y + 2 * this.plotHeight + 2 * this.topBottomPadding; // Canvas height
    this.drawCanvas.width = parseInt(this.width);
    this.drawCanvas.height = parseInt(this.height);
    this.staticCanvas = document.getElementById('overview-static');

    // Initialize marker div element
    this.markerElem = document.getElementById('overview-marker');
    this.markerElem.style.height = (this.plotHeight*2)+"px";
    this.markerElem.style.marginTop = 1.5 - (this.plotHeight+this.topBottomPadding)*2 +"px";

    // WebGL scene variables
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(this.width / -2, this.width / 2,
      this.height / -2, this.height / 2, near, far);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.drawCanvas, context: this.context, antialiasing: true });

    // Change to fourth quadrant of scene
    this.camera.position.set(this.width / 2 - lineMargin,
      this.height / 2 - lineMargin, 1);

    // Set dimensions of overview canvases
    this.staticCanvas.width = this.width;
    this.staticCanvas.height = this.height;
    $.getJSON($SCRIPT_ROOT + '/api/get-overview-chrom-dim', {
      x_pos: this.x,
      y_pos: this.y,
      plot_width: this.fullPlotWidth,
      hg_type: this.hgType,
    }).done( (result) => {
      this.dims = result['chrom_dims'];
    });

    // Select a chromosome in overview track
    this.staticCanvas.addEventListener('mousedown', (event) => {
      event.stopPropagation();
      let selectedChrom = this.pixelPosToGenomicLoc(event.x);
      // Dont update if chrom previously selected
      if ( ic.chromosome != selectedChrom.chrom ) {
        // Move interactive view to selected region
        ic.chromosome = selectedChrom.chrom;
        ic.start = 0;
        ic.end = this.dims[ic.chromosome].size - 1;
        // Mark region
        this.markRegion(selectedChrom.chrom, ic.start, ic.end);
        ic.redraw();  // redraw canvas
      }
    });

    let _this = this;
  }

  pixelPosToGenomicLoc(pixelpos) {
    let match = {}
    for(const i of this.chromosomes) {
      const chr = this.dims[i];
      if (pixelpos > chr.x_pos && pixelpos < chr.x_pos + chr.width) {
        match.chrom = i;
        match.pos = Math.floor( chr.size * (pixelpos-chr.x_pos)/chr.width );
      }
    }
    return match;
  }

  markRegion(chrom, start, end) {
    if ( this.dims != null ) {
      let scale = this.dims[chrom]['width'] / this.dims[chrom]['size'];
      let overviewMarker = document.getElementById('overview-marker');

      let markerStartPos, markerWidth;
      // Calculate position and size of marker
      if( (end-start)*scale < 2 ) {
        markerStartPos = 1+(this.dims[chrom]['x_pos']+start*scale);
        markerWidth = 2;
      }
      else{
        markerStartPos = 1.5+(this.dims[chrom]['x_pos']+start*scale);
        markerWidth = Math.max(2,Math.ceil((end-start)*scale)-1);
      }

      // Update the dom element
      overviewMarker.style.left = markerStartPos+"px";
      overviewMarker.style.width = (markerWidth)+"px";
    }
  }


  async drawOverviewContent(printing) {
    $.getJSON($SCRIPT_ROOT + '/api/get-overview-chrom-dim', {
      hg_type: this.hgType,
      x_pos: this.x,
      y_pos: this.y,
      plot_width: this.fullPlotWidth,
    }).done((result) => {
      let dims = result['chrom_dims'];
      // make index of chromosome screen positions
      const chrom_pos = this.chromosomes.map(chrom => {
        return {
        region: `${chrom}:0-None`,
        x_pos: dims[chrom]['x_pos'] + this.leftRightPadding,
        y_pos: dims[chrom]['y_pos'],
        x_ampl: dims[chrom]['width'] - 2 * this.leftRightPadding,
        }
      })
      // make a single request with all chromosome positions
      console.time("getcov-overview");
      $.ajax({
        type: "POST",
        url: $SCRIPT_ROOT + '/api/get-multiple-coverages',
        contentType: 'application/json',
        data: JSON.stringify({
          sample_id: this.sampleName,
          hg_type: this.hgType,
          plot_height: this.plotHeight,
          chromosome_pos: chrom_pos,
          top_bottom_padding: this.topBottomPadding,
          baf_y_start: this.baf.yStart,
          baf_y_end: this.baf.yEnd,
          log2_y_start: this.log2.yStart,
          log2_y_end: this.log2.yEnd,
          overview: 'True',
          reduce_data: 1
        }),
        success: (covData) => {
          console.timeEnd("getcov-overview");
          const staticCanvas = document.getElementById('overview-static');
          const chromSubset = Object.keys(covData['results']); // get chromosome in subset
          for (let i = 0; i < chromSubset.length; i++) {
            const chrom = chromSubset[i];
            const width = dims[chrom]['width'];
            const chromCovData = covData['results'][chrom];

            // Draw chromosome title
            drawText(staticCanvas,
              chromCovData['x_pos'] - this.leftRightPadding + width / 2,
              chromCovData['y_pos'] - this.titleMargin,
              chromCovData['chrom'], 10, 'center');

            // Draw rotated y-axis legends
            if (chromCovData['x_pos'] < this.leftmostPoint) {
              drawRotatedText(this.staticCanvas, 'B Allele Freq', 18, chromCovData['x_pos'] - this.legendMargin,
                chromCovData['y_pos'] + this.plotHeight / 2, -Math.PI / 2, this.titleColor);
              drawRotatedText(this.staticCanvas, 'Log2 Ratio', 18, chromCovData['x_pos'] - this.legendMargin,
                chromCovData['y_pos'] + 1.5 * this.plotHeight, -Math.PI / 2, this.titleColor);
            }

            // Draw BAF
            createGraph(this.scene, staticCanvas,
              chromCovData['x_pos'] - this.leftRightPadding,
              chromCovData['y_pos'], width, this.plotHeight, this.topBottomPadding,
              this.baf.yStart, this.baf.yEnd, this.baf.step,
              chromCovData['x_pos'] < this.leftmostPoint, this.borderColor, i != 0);
            drawGraphLines(this.scene, chromCovData['x_pos'], result['y_pos'],
              this.baf.yStart, this.baf.yEnd, this.baf.step, this.topBottomPadding,
              width, this.plotHeight);

            // Draw Log 2 ratio
            createGraph(this.scene, staticCanvas,
              chromCovData['x_pos'] - this.leftRightPadding,
              chromCovData['y_pos'] + this.plotHeight, width,
              this.plotHeight, this.topBottomPadding, this.log2.yStart,
              this.log2.yEnd, this.log2.step,
              chromCovData['x_pos'] < this.leftmostPoint, this.borderColor, i != 0);
            drawGraphLines(this.scene, chromCovData['x_pos'],
              chromCovData['y_pos'] + this.plotHeight, this.log2.yStart,
              this.log2.yEnd, this.log2.step, this.topBottomPadding,
              width, this.plotHeight);

            // Plot scatter data
            drawData(this.scene, chromCovData['baf'], this.baf.color);
            drawData(this.scene, chromCovData['data'], this.log2.color)
          }
        },
        dataType: 'json',
      }).done(() => {
        // Render scene and transfer to visible canvas
        this.renderer.render(this.scene, this.camera);
        this.staticCanvas.getContext('2d').drawImage(this.drawCanvas, 0, 0);
        document.querySelector('.loading-view').toggleAttribute('hidden');
        document.querySelector('#grid-container').style.visibility =
          'visible';
        document.querySelector('#grid-container').style.display = 'grid';
        if (printing == true) {
          printPage();
        }
      }).fail((result) => {
        console.log(result['responseText']);
        //window.location.href = "/404"
      });
    });
  }
}
