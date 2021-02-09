// Draw variants
VARIANT_TR_TABLE = {del: 'deletion', dup: 'duplication'}

class Variant extends Track {
  constructor (x, width, near, far, hgType, colorSchema, highlightedVariantId) {
    // Dimensions of track canvas
    const visibleHeight = 100; // Visible height for expanded canvas, overflows for scroll
    const minHeight = 35; // Minimized height

    super(width, near, far, visibleHeight, minHeight, colorSchema);

    // Set inherited variables
    this.drawCanvas = document.getElementById('variant-draw');
    this.contentCanvas = document.getElementById('variant-content');
    this.trackTitle = document.getElementById('variant-titles');
    this.trackContainer = document.getElementById('variant-container');
    this.featureHeight = 18;
    this.arrowThickness = 2;

    // Setup html objects now that we have gotten the canvas and div elements
    this.setupHTML(x + 1);

    this.trackContainer.style.marginTop = '-1px';
    this.hgType = hgType;

    // GENS api parameters
    this.apiEntrypoint = 'get-variant-data';
    this.additionalQueryParams = {variant_category: 'sv'}

    // Initialize highlighted variant
    this.highlightedVariantId = highlightedVariantId;
  }

  // Draw highlight for a given region
  drawHighlight (startPos, endPos) {
    this.drawBox(startPos, 0,
      endPos - startPos + 1,
      this.visibleHeight,
      'rgb(235,235,33, 0.4)')
  }

  async drawOffScreenTrack(queryResult) {
    queryResult.variants = queryResult
      .data
      .variants
      .filter(variant => variant.end > queryResult.queryStart ||
              variant.start < queryResult.queryEnd)
    //  Draws variants in given range
    const startQueryPos = queryResult['start_pos'];
    const endQueryPos = queryResult['end_pos'];
    const scale = this.drawCanvas.width / (endQueryPos - startQueryPos);
    const titleMargin = 2;
    const textSize = 10;
    // store positions used when rendering the canvas
    this.offscreenPosition = {
      start: startQueryPos,
      end: endQueryPos,
      scale: scale
    };

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
      const variantName = variant['display_name']; // varaint name
      const chrom = variant['chromosome'];
      const variantCategory = variant['sub_category'];  // del, dup, sv, str
      const variantType = variant['variant_type'];
      const variantLength = variant['length'];
      const quality = variant['quality'];
      const rankScore = variant['rank_score'];
      const variantStart = variant['position'];
      const variantEnd = variant['end'];
      const color = this.colorSchema[variantCategory] || this.colorSchema['default'] || 'black';
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
      const drawStartCoord = scale * (variantStart - startQueryPos);
      const drawEndCoord = scale * (variantEnd - startQueryPos);
      // Draw motif line
      switch (variantCategory) {
        case 'del':
          const waveHeight = 7;
          this.drawWaveLine(drawStartCoord,
                            drawEndCoord,
                            canvasYPos + waveHeight / 2,
                            waveHeight, color);
          break;
        case 'dup':
          this.drawLine(drawStartCoord, drawEndCoord, canvasYPos + 4, color);
          this.drawLine(drawStartCoord, drawEndCoord, canvasYPos, color);
          break;
        default:  // other types of elements
          this.drawLine(drawStartCoord, drawEndCoord, canvasYPos, color);
          console.log(`Unhandled variant type ${variantCategory}; drawing default shape`)
      }
      // Move and display highlighted region
      if (variant._id == this.highlightedVariantId) {
        this.drawHighlight(drawStartCoord, drawEndCoord);
      }

      // Draw variant type
      const textYPos = this.tracksYPos(heightOrder);
      latest_name_end = this.drawText(`${variant["category"]} - ${variantType} ${VARIANT_TR_TABLE[variantCategory]}; length: ${variantLength}`,
        scale * ((variantStart + variantEnd) / 2 - startQueryPos),
        textYPos + this.featureHeight, textSize, latest_name_end);

      // Set tooltip text
      let variantText = `Id: ${variantName}\n` +
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
  }
}
