class Transcript extends Track {
  constructor (x, width, near, far, hgType) {
    // Dimensions of track canvas
    const maxRows = 67; // Max height order for canvas
    const visibleHeight = 100; // Visible height for expanded canvas, overflows for scroll
    const minHeight = 35; // Minimized height

    super(width, near, far, maxRows, visibleHeight, minHeight);

    // Set inherited variables
    this.trackCanvas = document.getElementById('track-canvas');
    this.trackTitle = document.getElementById('track-titles');
    this.trackContainer = document.getElementById('track-container');

    // Setup html objects now that we have gotten the canvas and div elements
    this.setupHTML(x + 1);

    this.hgType = hgType;
  }

  drawTracks (region) {
    $.getJSON($SCRIPT_ROOT + '/_gettrackdata', {
      region: region,
      width: this.trackCanvas.width,
      hg_type: this.hgType,
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
        const geneName = track['gene_name'];
        const transcriptID = track['transcript_id'];
        const seqname = track['seqname'];
        const height_order = track['height_order'];
        const strand = track['strand'];
        const start = track['start'];
        const end = track['end'];
        const color = strand == '+' ? 'blue' : 'red';

        if (latest_height != height_order) {
          latest_height = height_order;
          latest_name_end = 0;
          latest_title_end = 0;
        }

        // Only draw visible tracks
        if (!this.expanded && height_order != 1)
          continue

        const adjustedYPos = this.tracksYPos(height_order);
        const textHeight = 10;

        this.drawTrackLen(scale * (start - result['start_pos']),
          scale * (end - result['start_pos']), adjustedYPos, color);

        // Draw gene name
        latest_name_end = this.drawGeneName(geneName,
          scale * ((start + end) / 2 - result['start_pos']),
          adjustedYPos + this.featureHeight, textHeight, latest_name_end);

        // Add tooltip title for whole gene
        const geneText = geneName + '\n' + 'chr' + seqname + ':' + start + '-' + end + '\n' + 'id = ' + transcriptID;
        latest_title_end = this.insertTitle(geneText,
          titleMargin + scale * (start - result['start_pos']) + 'px',
          titleMargin + adjustedYPos - this.featureHeight / 2 + 'px',
          scale * (end - start) + 'px',
          this.featureHeight + textHeight + 'px',
          0, latest_title_end);

        let latestFeaturePos = start;
        for (let j = 0; j < track['features'].length; j++) {
          let feature = track['features'][j];

          // Draw arrows
          let diff = feature['start'] - latestFeaturePos;
          if (scale * diff >= this.arrowWidth) {
            let direction = strand == '+' ? 1 : -1;
            this.drawArrows(scale * (latestFeaturePos - result['start_pos']),
              scale * (feature['start'] - result['start_pos']), adjustedYPos,
              direction, color)
          }
          latestFeaturePos = feature['end'];

          switch(feature['feature']) {
            case 'exon':
              let exonText = geneText + '\n' + '-'.repeat(30) + '\nExon number: ' + feature['exon_number'] +
                '\nchr' + seqname + ':' + feature['start'] + '-' + feature['end'];

              // Add tooltip title for whole gene
              latest_title_end = this.insertTitle(exonText,
                titleMargin + scale * (feature['start'] - result['start_pos']) + 'px',
                titleMargin + adjustedYPos - this.featureHeight / 2 + 'px',
                scale * (feature['end'] - feature['start']) + 'px',
                this.featureHeight + 'px',
                1, latest_title_end);

              this.drawBand(scale * (feature['start'] - result['start_pos']),
                adjustedYPos, scale * (feature['end'] - feature['start']),
                this.featureHeight, color);
              break;
            case 'three_prime_utr':
              this.drawBand(scale * (feature['start'] - result['start_pos']),
                adjustedYPos, scale * (feature['end'] - feature['start']),
                this.featureHeight / 2, color);
              break;
          }
        }
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
