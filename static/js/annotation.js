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

  // Fills the list with source files
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

  // Draws annotations in given range
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
      let latest_height = 0; // Latest height order for annotation
      let latest_name_end = 0; // Latest annotations end position
      let latest_track_end = 0; // Latest annotations title's end position

      // Go through results and draw appropriate symbols
      for (let i = 0; i < result['annotations'].length; i++) {
        const track = result['annotations'][i];
        const annotationName = track['name'];
        const chrom = track['chrom'];
        const height_order = track['height_order'];
        const score = track['score'];
        const start = track['start'];
        const end = track['end'];
        const strand = track['strand'];
        const color = track['color'];
        const canvasYPos = this.tracksYPos(height_order);

        // Only draw visible tracks
        if (!this.expanded && height_order != 1)
          continue

        // Keep track of latest annotations
        if (latest_height != height_order) {
          latest_height = height_order;
          latest_name_end = 0;
          latest_track_end = 0;
        }

        // Draw box for annotation
        this.drawBox(scale * (start - result['start_pos']),
          canvasYPos, scale * (end - start), this.featureHeight / 2, color);

        // Draw annotation name
        const textYPos = this.tracksYPos(height_order);
        latest_name_end = this.drawText(annotationName,
          scale * ((start + end) / 2 - result['start_pos']),
          textYPos + this.featureHeight, textSize, latest_name_end);

        // Set tooltip text
        const geneText = annotationName + '\n' + 'chr' + chrom + ':' + start + '-' + end + '\n' + 'Score = ' + score;

        // Add tooltip title for whole gene
        latest_track_end = this.hoverText(geneText,
          scale * (start - result['start_pos']) + 'px',
          textYPos - this.featureHeight / 2 + 'px',
          scale * (end - start) + 'px',
          this.featureHeight + textSize + 'px',
          0, latest_height);

        // Draw arrows
        if (strand) {
          let direction = strand == '+' ? 1 : -1;
          this.drawArrows(scale * (start - result['start_pos']),
            scale * (end - result['start_pos']), canvasYPos, direction,
            this.arrowColor);
        }
      }
    });
  }
}
