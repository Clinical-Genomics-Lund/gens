class TrackCanvas {
  constructor (x, width) {
    // Track variables
    this.collapsedWidth = width;
    this.collapsedHeight = 100;

    // Canvases
    this.drawCanvas = new OffscreenCanvas(width, $(document).innerHeight());
    this.context = this.drawCanvas.getContext('webgl2');
    this.trackCanvas = document.getElementById('track-canvas');
    this.trackContext = this.trackCanvas.getContext('2d');

    // Setup initial track Canvas
    this.trackCanvas.width = this.collapsedWidth;
    this.trackCanvas.height = this.collapsedHeight;
  }
}
