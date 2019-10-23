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
      // Intersection
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
    let div = document.createElement('div');
    div.setAttribute('id', x + '' + y);
    div.setAttribute('id', 'annotation-overlay');
    div.style.left = x + 'px';
    div.style.top = y + 'px';
    document.getElementById('annotation-overlays').appendChild(div);

    // Add close area
    let close = document.createElement('button');
    close.setAttribute('id', 'annotation-button');
    close.setAttribute('class', 'far fa-window-close');
    div.appendChild(close);

    close.onclick = function (event) {
      event.preventDefault();
      event.stopPropagation();
      // TODO: Do logic for closing div
    }

    // Add delete button
    let del= document.createElement('button');
    del.setAttribute('id', 'annotation-button');
    del.setAttribute('class', 'fas fa-trash-alt');
    div.appendChild(del);

    del.onclick = function (event) {
      event.preventDefault();
      event.stopPropagation();
      // TODO: Do logic for removing div
    }

    // Text span
    let textSpan = document.createElement('span');
    textSpan.setAttribute('id', 'annotation-span');
    textSpan.setAttribute('contenteditable', 'true');
    div.appendChild(textSpan);

    // When clicking on div, put focus on the text span
    div.onclick = function (event) {
      textSpan.focus();
    }
  }
}
