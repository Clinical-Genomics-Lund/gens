class Annotation {
  constructor (height) {
    this.rects = this.loadAnnotations(null);
    this.annotationCanvas = document.getElementById('annotation');
    this.ctx = this.annotationCanvas.getContext('2d');
    this.annotationCanvas.width = $(document).innerWidth();
    this.annotationCanvas.height =  height;
    this.drawAnnotations(null, this.annotationCanvas);
    this.rw = 4;
    this.rh = 4;
  }

  loadAnnotations (range) {
    return [
      {x: 250, y: 250, w: 4, h: 4},
      {x: 400, y: 370, w: 4, h: 4}
    ];
  }

  drawAnnotations (annotations, canvas) {
    let i = 0;
    let r;

    // render initial rects.
    while (r = this.rects[i++]) {
      this.drawAnnotation(r);
    }
  }

  drawAnnotation (rect) {
    this.ctx.rect(rect.x, rect.y, rect.w, rect.h);
    this.ctx.fillStyle = "blue";
    this.ctx.fill();
  }

  intersectAnnotation (clx, cly) {
    let rect = this.annotationCanvas.getBoundingClientRect();
    let x = clx - 10;
    let y = cly - 10;

    if (this.ctx.isPointInPath(x, y)) {
      console.log('Pointin path!!!');
    }
  }

  addAnnotation (x, y) {
    // Make it point at cursor tip
    x -= 10;
    y -= 10;

    // If annotation already exists, do not add it
    if (this.ctx.isPointInPath(x, y)) {
      return;
    }

    let rect = {x: x, y: y, w: this.rw, h: this.rh};
    this.rects.push(rect);
    this.drawAnnotation(rect);
  }
}
