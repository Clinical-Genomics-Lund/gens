// Draw variants
class Variant extends Track {
  constructor (x, width, near, far, hgType, colorSchema) {
    // Dimensions of track canvas
    const visibleHeight = 100; // Visible height for expanded canvas, overflows for scroll
    const minHeight = 35; // Minimized height

    super(width, near, far, visibleHeight, minHeight, colorSchema);

    // Set inherited variables
    this.trackCanvas = document.getElementById('variant-canvas');
    this.trackTitle = document.getElementById('variant-titles');
    this.trackContainer = document.getElementById('variant-container');
    this.featureHeight = 18;
    this.arrowThickness = 2;

    // Setup html objects now that we have gotten the canvas and div elements
    this.setupHTML(x + 1);

    this.trackContainer.style.marginTop = '-1px';
    this.hgType = hgType;
  }

  // Draws variants in given range
  drawTracks (region) {
    // parse region
    let selectedChrom, startPos, endPos;
    let regionMatch = region.match('(.+):([0-9]+)-([0-9]+)')
    if ( regionMatch != null ) {
      selectedChrom = regionMatch[1];
      startPos = Number(regionMatch[2]);
      endPos = Number(regionMatch[3]);
    } else {
      console.log(`Bad region format: {region}`);
      throw `Bad region format: {region}`;
    }

    const scale = this.trackCanvas.width / (endPos - startPos);
    const titleMargin = 2;
    const textSize = 10;

    // Set the needed height
    this.setContainerHeight(1);

    // Keeps track of previous values
    let latest_height = 0; // Latest height order for annotation
    let latest_name_end = 0; // Latest annotations end position
    let latestTrackEnd = 0; // Latest annotations title's end position

    this.clearTracks();


    // Test draw symbols
    for (let i = 0; i < variants.length; i++) {
      const track = variants[i];
      const variantId = 'Fool';
      const chrom = track['chromosome'];
      const type = track['type'];
      const score = track['score'];
      const variantFunction = track['function'];
      const variantRegion = track['region'];
      const start = track['start'];
      const end = track['end'];
      const color = this.colorSchema[type];
      const heightOrder = 1;
      const canvasYPos = this.tracksYPos(heightOrder);

      // only draw variants on selected chromosome
      if ( selectedChrom != chrom ) {
        console.log(`skipping: ${selectedChrom} != ${chrom}`)
        continue;
      }

      // Only draw visible tracks
      if (!this.expanded && heightOrder != 1)
        continue

      // Keep track of latest track
      if (latest_height != heightOrder) {
        latest_height = heightOrder;
        latest_name_end = 0;
        latestTrackEnd = 0;
      }

      this.drawLine(scale * (start - startPos),
        scale * (end - startPos), canvasYPos, color);

      // Draw variant type
      const textYPos = this.tracksYPos(heightOrder);
      latest_name_end = this.drawText(`${variantRegion} ${type}`,
        scale * ((start + end) / 2 - startPos),
        textYPos + this.featureHeight, textSize, latest_name_end);

      // Set tooltip text
      let variantText = `${variantId}\n` +
                        `Position: ${chrom}:${start}-${end}\n` +
                        `Type: type${type}\n` +
                        `Function: ${variantFunction}\n`;


      // Add tooltip title for whole gene
      latestTrackEnd = this.hoverText(variantText,
        titleMargin + scale * (start - startPos) + 'px',
        titleMargin + textYPos - this.featureHeight / 2 + 'px',
        scale * (end - start) + 'px',
        this.featureHeight + textSize + 'px',
        0, latestTrackEnd);
    }
  }
}
