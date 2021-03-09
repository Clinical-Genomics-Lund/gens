class Transcript extends Track {
  constructor (x, width, near, far, hgType, colorSchema) {
    // Dimensions of track canvas
    const visibleHeight = 100; // Visible height for expanded canvas, overflows for scroll
    const minHeight = 35; // Minimized height

    super(width, near, far, visibleHeight, minHeight, colorSchema);

    // Set inherited variables
    this.drawCanvas = document.getElementById('transcript-draw');
    this.contentCanvas = document.getElementById('transcript-content');
    this.trackTitle = document.getElementById('transcript-titles');
    this.trackContainer = document.getElementById('transcript-container');

    // Setup html objects now that we have gotten the canvas and div elements
    this.setupHTML(x + 1);

    // GENS api parameters
    this.apiEntrypoint = 'get-transcript-data';

    this.hgType = hgType;
    this.maxResolution = 4;
    // Define with of the elements
    this.geneLineWidth = 2;
  }

  // draw feature
  _drawFeature(feature, element, queryResult, canvasYPos, geneText,
               color, plotFormat) {
    // Go trough feature list and draw geometries
    const titleMargin = plotFormat.titleMargin;
    const textYPos = this.tracksYPos(element.height_order);
    let latestFeaturePos = element.start;
    const scale = this.offscreenPosition.scale;
    for (let feature of element.features) {
      latestFeaturePos = feature.end;
      // Draw the geometry that represents the feature
      if ( feature.feature == 'exon') {
        // Add tooltip title for whole gene
        // const exonText = `${geneText}
// ${"-".repeat(30)}
// Exon number: ${feature.exon_number}
// chr ${queryResult.chromosome}:${feature.start}-${feature.end}`;
        // this.heightOrderRecord.latestTrackEnd = this.hoverText(
        //   exonText,
        //   `${titleMargin + scale * (feature.start - queryResult.queryStart)}px`,
        //   `${titleMargin + textYPos - (this.featureHeight / 2)}px`,
        //   `${scale * (feature.end - feature.start)}px`,
        //   `${this.featureHeight}px`,
        //   1,
        //   this.heightOrderRecord.latestTrackEnd);
        this.drawBox(
          scale * (feature.start - this.offscreenPosition.start),
          canvasYPos, scale * (feature.end - feature.start),
          this.featureHeight, color);
      }
    }
  }

  // draw transcript figures
  async _drawTranscript(element, queryResult, color, plotFormat,
                        drawName=true, drawAsArrow=false) {
    const geneName = element.gene_name;
    const transcriptID = element.transcript_id;
    const chrom = element.chrom;
    const trStart = element.start;
    const trEnd = element.end;
    const canvasYPos = this.tracksYPos(element.height_order);
    const scale = this.offscreenPosition.scale;
    // sizes
    const textSize = plotFormat.textSize;
    const titleMargin = plotFormat.titleMargin;
    // lighten colors for MANE transcripts
    let elementColor = element.mane ? pSBC(0.3, color) : color;

    // Keep track of latest track
    if ( this.heightOrderRecord.latestHeight != element.height_order ) {
      this.heightOrderRecord = {
        latestHeight: element.height_order,
        latestNameEnd: 0,
        latestTrackEnd: 0,
      }
    }
    // Draw a line to mark gene's length
    // cap lines at offscreen canvas start/end
    const displayedTrStart = Math.round(
      (trStart > this.offscreenPosition.start
       ? scale * (trStart - this.offscreenPosition.start)
       : 0)
    );
    const displayedTrEnd = Math.round(
      (this.offscreenPosition.end > trEnd
       ? scale * (trEnd - this.offscreenPosition.start)
       : this.offscreenPosition.end)
    );
    this.drawLine(
      displayedTrStart,
      displayedTrEnd,
      canvasYPos,
      elementColor,
      this.geneLineWidth,  // set width of the element
    );
    // Draw gene name
    const textYPos = this.tracksYPos(element.height_order);
    if ( drawName ) {
      const mane = element.mane ? ' [MANE] ' : ''
      this.heightOrderRecord.latestNameEnd = this.drawText(
        `${geneName}${mane}${element.strand == "+" ? "→" : "←"}`,
        Math.round(((displayedTrEnd - displayedTrStart) / 2) + displayedTrStart),
        textYPos + this.featureHeight,
        textSize,
        this.heightOrderRecord.latestNameEnd,
      );
    }

    // Set tooltip text
    let geneText = '';
    if (element.mane == true) {
      geneText = `${geneName} [MANE]\nchr${chrom}:${trStart}-${trEnd}\n` +
      `id = ${transcriptID}\nrefseq_id = ${element.refseqID}\nhgnc = ${element.hgncID}`;
    } else {
      geneText = `${geneName}\nchr${chrom}:${trStart}-${trEnd}\n` +
      `id = ${transcriptID}`;
    }

    // draw arrows in gene
    if ( drawAsArrow ) {
      this.drawArrow(
        element.strand == '+' ? displayedTrEnd : displayedTrStart,  // xPos
        canvasYPos,                      // yPos
        element.strand == '+' ? 1 : -1,  // direction
        this.featureHeight / 2,          // height
        this.geneLineWidth,              // lineWidth
        elementColor,                    // color
      );
    } else {
      // draw features
      for (let feature of element.features) {
        this._drawFeature(
          feature, element, queryResult,
          canvasYPos, geneText, elementColor, plotFormat
        );
      }
    }

    // Add tooltip title for whole gene
    // this.heightOrderRecord.latestTrackEnd = this.hoverText(
    //   geneText,
    //   `${titleMargin + displayedTrStart}px`,
    //   `${titleMargin + textYPos - this.featureHeight / 2}px`,
    //   `${displayedTrEnd - displayedTrStart + 1}px`,
    //   `${this.featureHeight + textSize}px`,
    //   0,
    //   this.heightOrderRecord.latestTrackEnd
    // );
  }

  //  Draws transcripts in given range
  async drawOffScreenTrack(queryResult) {
    //    store positions used when rendering the canvas
    this.offscreenPosition = {
      start: queryResult.start_pos,
      end: queryResult.end_pos,
      scale: (this.drawCanvas.width /
              (queryResult.end_pos - queryResult.start_pos)),
    };

    // Set needed height of visible canvas and transcript tooltips
    this.setContainerHeight(queryResult.max_height_order);

    // Keeps track of previous values
    this.heightOrderRecord = {
      latestHeight: 0,    // Latest height order for annotation
      latestNameEnd: 0,  // Latest annotations end position
      latestTrackEnd: 0, // Latest annotations title's end position
    };

    // limit drawing of transcript to pre-defined resolutions
    let filteredTranscripts = [];
    if (this.getResolution < this.maxResolution + 1) {
      filteredTranscripts = queryResult.data.transcripts.filter(
        transc => isElementOverlapping(
          transc, {start: queryResult.start_pos, end: queryResult.end_pos}
        )
      );
    }
    // dont show tracks with no data in them
    if ( filteredTranscripts.length > 0 ) {
      this.setContainerHeight(this.trackData.max_height_order);
    } else {
      this.setContainerHeight(0);
    }
    this.clearTracks();

    // define plot formating parameters
    const plotFormat = {
      textSize: 10,
      titleMargin: 2,
    }

    // Go through queryResults and draw appropriate symbols
    const drawGeneName = this.getResolution < 3;
    const drawExons = this.getResolution < 4;
    for ( let transc of filteredTranscripts ) {
      if (!this.expanded && transc.height_order != 1)
        continue
      // draw base transcript
      const canvasYPos = this.tracksYPos(transc.height_order);
      const color = transc.strand == '+'
            ? this.colorSchema.strand_pos
            : this.colorSchema.strand_neg;
      await this._drawTranscript(
        transc, queryResult, color,
        plotFormat,
        drawGeneName,  // if gene names should be drawn
        !drawExons, // if transcripts should be represented as arrows
      );
    }
  }
}
