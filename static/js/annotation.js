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
    // Make it point at cursor tip
    this.ctx.rect(rect.x - 10, rect.y - 10, rect.w, rect.h);
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
    // If annotation already exists, do not add it
    if (this.ctx.isPointInPath(x, y)) {
      return;
    }

    let rect = {x: x, y: y, w: this.rw, h: this.rh};
    this.rects.push(rect);
    this.drawAnnotation(rect);

    // Add associated text area
    let div = document.getElementById('annotation-texts');
    let textArea = document.createElement('textarea');
    textArea.setAttribute('id', 'annotation-textarea');
    textArea.style.left = x + 'px';
    textArea.style.top = y + 'px';
    div.appendChild(textArea);

    // Add close area
    let close = document.createElement('button');
    close.setAttribute('id', 'textarea-close');
    close.setAttribute('class', 'far fa-window-close');
    textArea.appendChild(close);

    // Add delete button
    let del= document.createElement('button');
    del.setAttribute('id', 'textarea-delete');
    del.setAttribute('class', 'fas fa-trash-alt');
    textArea.appendChild(del);
  }
}
