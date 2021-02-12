class Annotation extends Track {
  constructor (x, width, near, far, hgType, defaultAnnotation) {
    // Dimensions of track canvas
    const visibleHeight = 300; // Visible height for expanded canvas, overflows for scroll
    const minHeight = 35; // Minimized height

    super(width, near, far, visibleHeight, minHeight);

    // Set inherited variables
    // TODO use the names contentCanvas and drawCanvas
    this.drawCanvas = document.getElementById('annotation-draw');
    this.contentCanvas = document.getElementById('annotation-content');
    this.trackTitle = document.getElementById('annotation-titles');
    this.trackContainer = document.getElementById('annotation-container');
    this.featureHeight = 18;
    this.arrowThickness = 2;

    this.offScreenPosition = {start: 1, end: null};

    // Setup html objects now that we have gotten the canvas and div elements
    this.setupHTML(x + 1);

    this.trackContainer.style.marginTop = '-1px';
    this.hgType = hgType;

    // Setup annotation list
    this.sourceList = document.getElementById('source-list');
    this.sourceList.addEventListener('change', () => {
      this.expanded = false;
      this.additionalQueryParams = {source: this.sourceList.value};
      this.drawTrack(document.getElementById('region_field').value);
    })
    this.annotSourceList(defaultAnnotation);

    // GENS api parameters
    this.apiEntrypoint = 'get-annotation-data';
    this.additionalQueryParams = {source: defaultAnnotation}
  }

  // Fills the list with source files
  annotSourceList (defaultAnntotation) {
    get('get-annotation-sources', {hg_type: this.hgType})
      .then( result => {
        if(result.sources.length > 0) {
          this.sourceList.style.visibility = 'visible';
        }
        for (let i = 0; i < result.sources.length; i++) {
          // Add annotation file name to list
          let opt = document.createElement('option');
          const file_name = result.sources[i];
          opt.value = file_name;
          opt.innerHTML = file_name;

          // Set mimisbrunnr as default file
          if (file_name.match(defaultAnntotation)) {
            opt.setAttribute('selected', true);
          }
          this.sourceList.appendChild(opt);
        }})
      .then( result => {
        this.drawTrack(document.getElementById('region_field').value);
    });
  }

  // Draws annotations in given range
  async drawOffScreenTrack(queryResult) {
    const scale = this.drawCanvas.width / (this.trackData.end_pos - this.trackData.start_pos);
    const textSize = 10;

    // store positions used when rendering the canvas
    this.offscreenPosition = {
      start: queryResult.start_pos,
      end: queryResult.end_pos,
      scale: scale
    };

    //  Set needed height of visible canvas and transcript tooltips
    this.setContainerHeight(this.trackData.max_height_order);

    // Keeps track of previous values
    let latest_height = 0; // Latest height order for annotation
    let latest_name_end = 0; // Latest annotations end position
    let latest_track_end = 0; // Latest annotations title's end position

    this.clearTracks();

    // limit drawing of transcript to pre-defined resolutions
    let filteredAnnotations = [];
    if (this.getResolution < this.maxResolution + 1) {
      filteredAnnotations = queryResult
        .data
        .annotations
        .filter(annot => isElementOverlapping(annot,
                                              {start: queryResult.start_pos,
                                               end: queryResult.end_pos}));
    }
    // dont show tracks with no data in them
    if ( filteredAnnotations.length > 0 ) {
      this.trackContainer.setAttribute('data-state', 'collapsed');
    } else {
      this.trackContainer.setAttribute('data-state', 'nodata');
    }

    // Go through results and draw appropriate symbols
    for (let i = 0; i < filteredAnnotations.length; i++) {
      const track = filteredAnnotations[i];
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
      if (!this.expanded && height_order != 1) {
        continue
      }

      // Keep track of latest annotations
      if (latest_height != height_order) {
        latest_height = height_order;
        latest_name_end = 0;
        latest_track_end = 0;
      }

      // Draw box for annotation
      this.drawBox(
        scale * (start - this.trackData['start_pos']),
        canvasYPos, scale * (end - start),
        this.featureHeight / 2, color
      );

      // Draw annotation name
      const textYPos = this.tracksYPos(height_order);
      latest_name_end = this.drawText(annotationName,
        scale * ((start + end) / 2 - this.trackData['start_pos']),
        textYPos + this.featureHeight, textSize, latest_name_end);

      // Set tooltip text
      const geneText = annotationName + '\n' + 'chr' + chrom + ':' + start + '-' + end + '\n' + 'Score = ' + score;

      // Add tooltip title for whole gene
      latest_track_end = this.hoverText(geneText,
        scale * (start - this.trackData['start_pos']) + 'px',
        textYPos - this.featureHeight / 2 + 'px',
        scale * (end - start) + 'px',
        this.featureHeight + textSize + 'px',
        0, latest_height);

      // Draw arrows
      if (strand) {
        let direction = strand == '+' ? 1 : -1;
        this.drawArrows(scale * (start - this.trackData['start_pos']),
          scale * (end -
this.trackData['start_pos']), canvasYPos, direction,
          this.arrowColor);
      }
    }
  }
}
