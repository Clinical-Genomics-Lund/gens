class Transcript extends Track {
  constructor (x, width, near, far, hgType, colorSchema) {
    // Dimensions of track canvas
    const visibleHeight = 100; // Visible height for expanded canvas, overflows for scroll
    const minHeight = 35; // Minimized height

    super(width, near, far, visibleHeight, minHeight, colorSchema);

    // Set inherited variables
    this.trackCanvas = document.getElementById('transcript-content');
    this.trackTitle = document.getElementById('transcript-titles');
    this.trackContainer = document.getElementById('transcript-container');
    this.staticCanvas = document.getElementById('transcript-static');

    // Setup html objects now that we have gotten the canvas and div elements
    this.setupHTML(x + 1);

    this.hgType = hgType;
  }

  // Draws transcripts in given range
  drawTracks (region) {
    $.getJSON($SCRIPT_ROOT + '/api/get-transcript-data', {
      region: region,
      hg_type: this.hgType,
      collapsed: this.expanded ? false : true
    }, (result) => {
      const scale = this.trackCanvas.width / (result['end_pos'] - result['start_pos']);
      const titleMargin = 2;
      const textSize = 10;

      // Set needed height of visible canvas and transcript tooltips
      this.setContainerHeight(result['max_height_order']);

      // Keeps track of previous values
      let latest_height = 0; // Latest height order for annotation
      let latest_name_end = 0; // Latest annotations end position
      let latest_track_end = 0; // Latest annotations title's end position

      this.clearTracks();

      // Go through results and draw appropriate symbols
      for (let i = 0; i < result['transcripts'].length; i++) {
        const track = result['transcripts'][i];
        const geneName = track['gene_name'];
        const transcriptID = track['transcript_id'];
        const chrom = track['chrom'];
        const height_order = track['height_order'];
        const strand = track['strand'];
        const start = track['start'];
        const end = track['end'];
        const mane = track['mane']
        const refseqID = track['refseq_id']
        const hgncID = track['hgnc_id']
        const color = strand == '+' ? this.colorSchema['strand_pos'] : this.colorSchema['strand_neg'];
        const canvasYPos = this.tracksYPos(height_order);

        // Only draw visible tracks
        if (!this.expanded && height_order != 1)
          continue

        // Keep track of latest track
        if (latest_height != height_order) {
          latest_height = height_order;
          latest_name_end = 0;
          latest_track_end = 0;
        }

        // Draw a line to mark gene's length
        this.drawLine(scale * (start - result['start_pos']),
          scale * (end - result['start_pos']), canvasYPos, color);

        // Draw gene name
        const textYPos = this.tracksYPos(height_order);
        latest_name_end = this.drawText(geneName,
          scale * ((start + end) / 2 - result['start_pos']),
          textYPos + this.featureHeight, textSize, latest_name_end);

        // Set tooltip text
        let geneText = '';
        if (mane == true) {
          geneText = `${geneName} [MANE]\nchr${chrom}:${start}-${end}\n` +
          `id = ${transcriptID}\nrefseq_id = ${refseqID}\nhgnc = ${hgncID}`;
        } else {
          geneText = `${geneName}\nchr${chrom}:${start}-${end}\n` +
          `id = ${transcriptID}`;
        }

        // Add tooltip title for whole gene
        latest_track_end = this.hoverText(geneText,
          titleMargin + scale * (start - result['start_pos']) + 'px',
          titleMargin + textYPos - this.featureHeight / 2 + 'px',
          scale * (end - start) + 'px',
          this.featureHeight + textSize + 'px',
          0, latest_track_end);

        // Go trough feature list and draw geometries
        let latestFeaturePos = start;
        for (let j = 0; j < track['features'].length; j++) {
          let feature = track['features'][j];

          // Draw arrows
          let diff = feature['start'] - latestFeaturePos;
          if (scale * diff >= this.arrowWidth) {
            if (strand) {
              let direction = strand == '+' ? 1 : -1;
              this.drawArrows(scale * (latestFeaturePos - result['start_pos']),
                scale * (feature['start'] - result['start_pos']), canvasYPos,
                direction, color)
            }
          }
          latestFeaturePos = feature['end'];

          // Draw the geometry that represents the feature
          switch(feature['feature']) {
            case 'exon':
              let exonText = geneText + '\n' + '-'.repeat(30) + '\nExon number: ' + feature['exon_number'] +
                '\nchr' + chrom + ':' + feature['start'] + '-' + feature['end'];

              // Add tooltip title for whole gene
              latest_track_end = this.hoverText(exonText,
                titleMargin + scale * (feature['start'] - result['start_pos']) + 'px',
                titleMargin + textYPos - this.featureHeight / 2 + 'px',
                scale * (feature['end'] - feature['start']) + 'px',
                this.featureHeight + 'px',
                1, latest_track_end);

              this.drawBox(scale * (feature['start'] - result['start_pos']),
                canvasYPos, scale * (feature['end'] - feature['start']),
                this.featureHeight, color);
              break;
            case 'three_prime_utr':
              this.drawBox(scale * (feature['start'] - result['start_pos']),
                canvasYPos, scale * (feature['end'] - feature['start']),
                this.featureHeight / 2, color);
              break;
          }
        }
      }
    });
  }
}
