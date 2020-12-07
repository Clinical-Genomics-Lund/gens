// Draw variants
VARIANT_TR_TABLE = {'del': 'deletion', 'dup': 'duplication'}

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
    $.getJSON($SCRIPT_ROOT + '/api/get-variant-data', {
      sample_id: oc.sampleName,
      variant_category: 'sv',
      region: region,
      hg_type: hgType,
      collapsed: this.expanded ? false : true,
    }, (queryResult) => {
      const startQueryPos = queryResult['start_pos'];
      const endQueryPos = queryResult['end_pos'];
      const scale = this.trackCanvas.width / (endQueryPos - startQueryPos);
      const titleMargin = 2;
      const textSize = 10;

      // Set needed height of visible canvas and transcript tooltips
      this.setContainerHeight(queryResult['max_height_order']);

    // Keeps track of previous values
    let latest_height = 0; // Latest height order for annotation
    let latest_name_end = 0; // Latest annotations end position
    let latestTrackEnd = 0; // Latest annotations title's end position

    this.clearTracks();

    // Draw track
    for (let i = 0; i < queryResult.variants.length; i++) {
      const variant = queryResult.variants[i];  // store variant
      const variantId = variant['display_name'];
      const chrom = variant['chromosome'];
      const variantCategory = variant['sub_category'];  // del or dup
      const variantType = variant['variant_type'];
      const variantLength = variant['length'];
      const quality = variant['quality'];
      const rankScore = variant['rank_score'];
      const variantStart = variant['position'];
      const variantEnd = variant['end'];
      const color = this.colorSchema[variantCategory];
      const heightOrder = 1;
      const canvasYPos = this.tracksYPos(heightOrder);

      // Only draw visible tracks
      if (!this.expanded && heightOrder != 1)
        continue

      // Keep track of latest track
      if (latest_height != heightOrder) {
        latest_height = heightOrder;
        latest_name_end = 0;
        latestTrackEnd = 0;
      }

      // if set begining draw
      //const drawStartCoord = variantStart - startQueryPos > 0 ? scale * (variantStart - startQueryPos) : 0;
      //const drawEndCoord = variantEnd > endQueryPos ? scale * endQueryPos : scale * (variantEnd - startQueryPos);
      const drawStartCoord = scale * (variantStart - startQueryPos);
      const drawEndCoord = scale * (variantEnd - startQueryPos);
      // Draw motif line
      if (variantCategory == 'del') {
        const waveHeight = 7;
        this.drawWaveLine(drawStartCoord,
                          drawEndCoord,
                          canvasYPos + waveHeight / 2,
                          waveHeight, color);
      } else {
        this.drawLine(drawStartCoord, drawEndCoord, canvasYPos + 4, color);
        this.drawLine(drawStartCoord, drawEndCoord, canvasYPos, color);
      }

      // Draw variant type
      const textYPos = this.tracksYPos(heightOrder);
      latest_name_end = this.drawText(`${variant["category"]} - ${variantType} ${VARIANT_TR_TABLE[variantCategory]}; length: ${variantLength}`,
        scale * ((variantStart + variantEnd) / 2 - startQueryPos),
        textYPos + this.featureHeight, textSize, latest_name_end);

      // Set tooltip text
      let variantText = `Id: ${variantId}\n` +
                        `Position: ${chrom}:${variantStart}-${variantEnd}\n` +
                        `Type: ${variantType} ${variantCategory}\n` +
                        `Quality: ${quality}\n` +
                        `Rank score: ${rankScore}\n`;


      // Add tooltip title for whole gene
      latestTrackEnd = this.hoverText(variantText,
        titleMargin + scale * (variantStart - startQueryPos) + 'px',
        titleMargin + textYPos - this.featureHeight / 2 + 'px',
        scale * (variantEnd - variantStart) + 'px',
        this.featureHeight + textSize + 'px',
        0, latestTrackEnd);
    }
    })
  }
}
