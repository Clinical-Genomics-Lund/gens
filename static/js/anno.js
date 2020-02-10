class Anno extends Track {
  constructor (x, width, near, far) {
    // Dimensions of track canvas
    const maxRows = 67; // Max height order for canvas
    const visibleHeight = 100; // Visible height for expanded canvas, overflows for scroll
    const minHeight = 35; // Minimized height

    super(width, near, far, maxRows, visibleHeight, minHeight);

    // Set inherited variables
    this.trackCanvas = document.getElementById('anno-canvas');
    this.trackTitle = document.getElementById('anno-titles');
    this.trackContainer = document.getElementById('anno-container');
    this.arrowColor =  0xffffff;

    // Setup html objects now that we have gotten the canvas and div elements
    this.setupHTML(x);
  }

  drawTracks (region) {
    $.getJSON($SCRIPT_ROOT + '/_getannotationdata', {
      region: region,
      width: this.trackCanvas.width,
    }, (result) => {
      const scale = this.trackCanvas.width / (result['end_pos'] - result['start_pos']);
      const titleMargin = 2;

      // Set needed height of visible canvas and transcript tooltips
      this.setContainerHeight(result['max_height_order']);

      // Go through results and draw appropriate symbols
      for (let i = 0; i < result['tracks'].length; i++) {
        const track = result['tracks'][i];
        const geneName = track['name'];
        const color = track['color'];
        const sequence = track['sequence'];
        const height_order = track['height_order'];
        const score = track['score'];
        const start = track['start'];
        const end = track['end'];
        const strand = track['strand'];

        // Only draw visible tracks
        if (!this.expanded && height_order != 1)
          continue

        const adjustedYPos = this.tracksYPos(height_order);
        const textHeight = 10;

        this.drawTrackLen(scale * (start - result['start_pos']),
          scale * (end - result['start_pos']), adjustedYPos);
        this.drawBand(scale * (start - result['start_pos']),
          adjustedYPos, scale * (end - start), this.featureHeight / 2, color);

        // Draw gene name
        // if (result['res'] == 'd') {
          this.drawGeneName(geneName,
            scale * ((start + end) / 2 - result['start_pos']),
            adjustedYPos + this.featureHeight, textHeight);
        // }

        // Add tooltip title for whole gene
        const geneText = geneName + '\n' + 'chr' + sequence + ':' + start + '-' + end + '\n' + 'Score = ' + score;
        this.insertTitle(geneText,
          titleMargin + scale * (start - result['start_pos']) + 'px',
          titleMargin + adjustedYPos - this.featureHeight / 2 + 'px',
          scale * (end - start) + 'px',
          this.featureHeight + textHeight + 'px',
          0);

        // Draw arrows
        let direction = strand == '+' ? 1 : -1;
        this.drawArrows(scale * (start - result['start_pos']),
        scale * (end - result['start_pos']), adjustedYPos, direction);
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
