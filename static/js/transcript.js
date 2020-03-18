class Transcript extends Track {
  constructor (x, width, near, far, hgType) {
    // Dimensions of track canvas
    const visibleHeight = 100; // Visible height for expanded canvas, overflows for scroll
    const minHeight = 35; // Minimized height

    super(width, near, far, visibleHeight, minHeight);

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
      hg_type: this.hgType,
      collapsed: this.expanded ? false : true
    }, (result) => {
      const scale = this.trackCanvas.width / (result['end_pos'] - result['start_pos']);
      const titleMargin = 2;
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
          const color = strand == '+' ? 'blue' : 'red';

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

          // Draw a line to mark gene's length
          this.drawLine(scale * (start - result['start_pos']),
            scale * (end - result['start_pos']), canvasYPos, color);

          // Draw gene name
          const textYPos = this.tracksYPos(height_order);
          latest_name_end = this.drawGeneName(geneName,
            scale * ((start + end) / 2 - result['start_pos']),
            textYPos + this.featureHeight, textSize, latest_name_end);

          // Add tooltip title for whole gene
          let geneText = '';
          if (mane == true) {
            geneText = `${geneName} [MANE]\nchr${chrom}:${start}-${end}\n` +
            `id = ${transcriptID}\nrefseq_id = ${refseqID}\nhgnc = ${hgncID}`;
          } else {
            geneText = `${geneName}\nchr${chrom}:${start}-${end}\n` +
            `id = ${transcriptID}`;
          }
          latest_title_end = this.insertTitle(geneText,
            titleMargin + scale * (start - result['start_pos']) + 'px',
            titleMargin + textYPos - this.featureHeight / 2 + 'px',
            scale * (end - start) + 'px',
            this.featureHeight + textSize + 'px',
            0, latest_title_end);

          let latestFeaturePos = start;
          for (let j = 0; j < track['features'].length; j++) {
            let feature = track['features'][j];

            // Draw arrows
            let diff = feature['start'] - latestFeaturePos;
            if (scale * diff >= this.arrowWidth) {
              let direction = strand == '+' ? 1 : -1;
              this.drawArrows(scale * (latestFeaturePos - result['start_pos']),
                scale * (feature['start'] - result['start_pos']), canvasYPos,
                direction, color)
            }
            latestFeaturePos = feature['end'];

            switch(feature['feature']) {
              case 'exon':
                let exonText = geneText + '\n' + '-'.repeat(30) + '\nExon number: ' + feature['exon_number'] +
                  '\nchr' + chrom + ':' + feature['start'] + '-' + feature['end'];

                // Add tooltip title for whole gene
                latest_title_end = this.insertTitle(exonText,
                  titleMargin + scale * (feature['start'] - result['start_pos']) + 'px',
                  titleMargin + textYPos - this.featureHeight / 2 + 'px',
                  scale * (feature['end'] - feature['start']) + 'px',
                  this.featureHeight + 'px',
                  1, latest_title_end);

                this.drawBand(scale * (feature['start'] - result['start_pos']),
                  canvasYPos, scale * (feature['end'] - feature['start']),
                  this.featureHeight, color);
                break;
              case 'three_prime_utr':
                this.drawBand(scale * (feature['start'] - result['start_pos']),
                  canvasYPos, scale * (feature['end'] - feature['start']),
                  this.featureHeight / 2, color);
                break;
            }
          }
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
