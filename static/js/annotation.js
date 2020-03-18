class Annotation extends Track {
  constructor (x, width, near, far, hgType) {
    // Dimensions of track canvas
    const visibleHeight = 100; // Visible height for expanded canvas, overflows for scroll
    const minHeight = 35; // Minimized height

    super(width, near, far, visibleHeight, minHeight);

    // Set inherited variables
    this.trackCanvas = document.getElementById('annotation-canvas');
    this.trackTitle = document.getElementById('annotation-titles');
    this.trackContainer = document.getElementById('annotation-container');
    this.featureHeight = 18;
    this.arrowThickness = 2;

    // Setup html objects now that we have gotten the canvas and div elements
    this.setupHTML(x + 1);

    this.trackContainer.style.marginTop = '-1px';
    this.hgType = hgType;

    // Setup annotation list
    this.sourceList = document.getElementById('source-list');
    this.sourceList.addEventListener('change', () => {
      this.expanded = false;
      this.clearTracks;
      this.drawTracks(document.getElementById('region_field').value);
    })
    this.annotSourceList();
  }

  annotSourceList () {
    $.getJSON($SCRIPT_ROOT + '/_getannotationsources', {
      hg_type: this.hgType
    }, (result) => {
      if(result['sources'].length > 0) {
        this.sourceList.style.visibility = 'visible';
      }

      for (let i = 0; i < result['sources'].length; i++) {
        // Add annotation file name to list
        let opt = document.createElement('option');
        const file_name = result['sources'][i];
        opt.value = file_name;
        opt.innerHTML = file_name;

        // Set mimisbrunnr as default file
        if (file_name.match('misbrunnr')) {
          opt.setAttribute('selected', true);
        }
        this.sourceList.appendChild(opt);
      }
    }).done((result) => {
      this.drawTracks(document.getElementById('region_field').value);
    });
  }

  drawTracks (region) {
    $.getJSON($SCRIPT_ROOT + '/_getannotationdata', {
      region: region,
      hg_type: this.hgType,
      source: this.sourceList.value,
      collapsed: this.expanded ? false : true
    }, (result) => {
      const scale = this.trackCanvas.width / (result['end_pos'] - result['start_pos']);
      const textSize = 10;

      // Set needed height of visible canvas and transcript tooltips
      this.setContainerHeight(result['max_height_order']);

      // Keeps track of previous values
      // TODO: use values in array instead, more intuitive?
      let latest_height = 0; // Latest height order for annotation
      let latest_name_end = 0; // Latest annotations end position
      let latest_title_end = 0; // Latest annotations title's end position

      // Do not render more than context buffers height
      const rendering_height = this.tracksYPos(result['max_height_order']);
      let max_rows = this.toRows(this.context.drawingBufferHeight);
      let i = 0;

      // Draw the image in section if drawing buffer is smaller than needed rendering size
      for (let drawStart = 0; drawStart <= rendering_height &&
        drawStart < this.trackCanvas.height;
        drawStart += this.context.drawingBufferHeight) {
        // Go through results and draw appropriate symbols
        for (; i < result['tracks'].length; i++) {
          const track = result['tracks'][i];
          const geneName = track['name'];
          const chrom = track['chrom'];
          const height_order = track['height_order'];
          const score = track['score'];
          const start = track['start'];
          const end = track['end'];
          const strand = track['strand'];
          const color = track['color'];

          // Not able to render any more, start a fresh rendering
          const canvasYPos = this.tracksYPos(height_order) - drawStart;
          if (canvasYPos >= this.context.drawingBufferHeight) {
            break;
          }

          // Only draw visible tracks
          if (!this.expanded && height_order != 1)
            continue

          if (latest_height != height_order) {
            latest_height = height_order;
            latest_name_end = 0;
            latest_title_end = 0;
          }

          // Draw box for annotation
          this.drawBand(scale * (start - result['start_pos']),
            canvasYPos, scale * (end - start), this.featureHeight / 2, color);

          // Draw gene name
          const textYPos = this.tracksYPos(height_order);
          latest_name_end = this.drawGeneName(geneName,
            scale * ((start + end) / 2 - result['start_pos']),
            textYPos + this.featureHeight, textSize, latest_name_end);

          // Add tooltip title for whole gene
          const geneText = geneName + '\n' + 'chr' + chrom + ':' + start + '-' + end + '\n' + 'Score = ' + score;
          latest_title_end = this.insertTitle(geneText,
            scale * (start - result['start_pos']) + 'px',
            textYPos - this.featureHeight / 2 + 'px',
            scale * (end - start) + 'px',
            this.featureHeight + textSize + 'px',
            0, latest_height);

          // Draw arrows
          let direction = strand == '+' ? 1 : -1;
          this.drawArrows(scale * (start - result['start_pos']),
            scale * (end - result['start_pos']), canvasYPos, direction, this.arrowColor);
        }

        this.renderer.render(this.scene, this.camera);

        // Transfer image to visible canvas
        const drawHeight = Math.min(this.trackCanvas.height, drawStart + this.context.drawingBufferHeight) - drawStart;
        this.trackContext.drawImage(this.drawCanvas.transferToImageBitmap(),
          0, 0, this.trackCanvas.width, drawHeight,
          0, drawStart, this.trackCanvas.width, drawHeight);

        // Clear draw canvas
        this.scene.remove.apply(this.scene, this.scene.children);
        max_rows *= 2;
      }
    });
  }
}
