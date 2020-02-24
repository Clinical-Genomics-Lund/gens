class Annotation extends Track {
  constructor (x, width, near, far, hgType) {
    // Dimensions of track canvas
    const maxRows = 67; // Max height order for canvas
    const visibleHeight = 100; // Visible height for expanded canvas, overflows for scroll
    const minHeight = 35; // Minimized height

    super(width, near, far, maxRows, visibleHeight, minHeight);

    // Set inherited variables
    this.trackCanvas = document.getElementById('annotation-canvas');
    this.trackTitle = document.getElementById('annotation-titles');
    this.trackContainer = document.getElementById('annotation-container');
    this.arrowColor =  0xffffff;

    // Setup html objects now that we have gotten the canvas and div elements
    this.setupHTML(x + 1);

    this.trackContainer.style.marginTop = '-1px';
    this.hgType = hgType;

    // Setup annotation list
    this.sourceList = document.getElementById('source-list');
    this.sourceList.addEventListener('change', () => {
      this.clearTracks;
      this.drawTracks(document.getElementById('region_field').value);
    })
    this.annotSourceList();
  }

  annotSourceList () {
    $.getJSON($SCRIPT_ROOT + '/_getannotationsources', {}, (result) => {
      if(result['sources'].length > 0) {
        this.sourceList.style.visibility = 'visible';
      }

      for (let i = 0; i < result['sources'].length; i++) {
        // Add annotation file name to list
        let opt = document.createElement('option');
        const file_name = result['sources'][i];
        opt.value = file_name;
        opt.innerHTML = file_name;

        // TODO: Set default value
        if (file_name == 'cagdb') {
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
      source: this.sourceList.value
    }, (result) => {
      const scale = this.trackCanvas.width / (result['end_pos'] - result['start_pos']);
      const titleMargin = 2;

      // Set needed height of visible canvas and transcript tooltips
      this.setContainerHeight(result['max_height_order']);

      let latest_height = 0;
      let latest_name_end = 0;
      let latest_title_end = 0;

      // Go through results and draw appropriate symbols
      for (let i = 0; i < result['tracks'].length; i++) {
        const track = result['tracks'][i];
        const geneName = track['name'];
        const chrom = track['chrom'];
        const height_order = track['height_order'];
        const score = track['score'];
        const start = track['start'];
        const end = track['end'];
        const strand = track['strand'];
        const color = track['color'];

        // Only draw visible tracks
        if (!this.expanded && height_order != 1)
          continue

        if (latest_height != height_order) {
          latest_height = height_order;
          latest_name_end = 0;
          latest_title_end = 0;
        }

        const adjustedYPos = this.tracksYPos(height_order);
        const textHeight = 10;

        this.drawBand(scale * (start - result['start_pos']),
          adjustedYPos, scale * (end - start), this.featureHeight / 2, color);

        // Draw gene name
        latest_name_end = this.drawGeneName(geneName,
          scale * ((start + end) / 2 - result['start_pos']),
          adjustedYPos + this.featureHeight, textHeight, latest_name_end);

        // Add tooltip title for whole gene
        const geneText = geneName + '\n' + 'chr' + chrom + ':' + start + '-' + end + '\n' + 'Score = ' + score;
        latest_title_end = this.insertTitle(geneText,
          titleMargin + scale * (start - result['start_pos']) + 'px',
          titleMargin + adjustedYPos - this.featureHeight / 2 + 'px',
          scale * (end - start) + 'px',
          this.featureHeight + textHeight + 'px',
          0, latest_height);

        // Draw arrows
        let direction = strand == '+' ? 1 : -1;
        this.drawArrows(scale * (start - result['start_pos']),
          scale * (end - result['start_pos']), adjustedYPos, direction, this.arrowColor);
      }

      this.renderer.render(this.scene, this.camera);

      // Transfer image to visible canvas
      this.trackContext.drawImage(this.drawCanvas.transferToImageBitmap(),
        0, 0, this.trackCanvas.width, this.trackCanvas.height,
        0, 0, this.trackCanvas.width, this.trackCanvas.height);

      // Clear draw canvas
      ic.scene.remove.apply(this.scene, this.scene.children);
    });
  }
}
