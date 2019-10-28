class Annotation {
  constructor (height) {
    this.rects = this.loadAnnotations(null);
    this.annotationCanvas = document.getElementById('annotation');
    this.ctx = this.annotationCanvas.getContext('2d');
    this.annotationCanvas.width = $(document).innerWidth();
    this.annotationCanvas.height =  height;
    this.drawAnnotations();
    this.rw = 4;
    this.rh = 4;
    this.mouseOffset = 10;
  }

  loadAnnotations (range) {
    return [
      {x: 250, y: 250, w: 4, h: 4},
      {x: 400, y: 370, w: 4, h: 4}
    ];
  }

  drawAnnotations () {
    let i = 0;
    let r;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.annotationCanvas.width, this.annotationCanvas.height);

    // render initial rects.
    this.ctx.beginPath();
    while (r = this.rects[i++]) {
      this.ctx.rect(r.x - this.mouseOffset, r.y - this.mouseOffset, r.w, r.h);
    }
    this.ctx.fillStyle = "blue";
    this.ctx.fill();
  }

  intersectsAnnotation (x, y) {
    let rect = this.annotationCanvas.getBoundingClientRect();

    if (this.ctx.isPointInPath(x - this.mouseOffset + this.rw, y - this.mouseOffset + this.rh)) {
      for (let i = 0; i < this.rects.length; i++) {
        let rect = this.rects[i];
        if (Math.abs(x - rect.x) <= this.rw && Math.abs(y - rect.y) <= this.rh) {
          document.getElementById(rect.x + '' + rect.y).style.visibility = 'visible';
          return true;
        }
      }
    }
    return false;
  }

  removeAnnotation (id) {
    for (let i = 0; i < this.rects.length; i++) {
      let rect = this.rects[i];
      if ( id == rect.x + '' + rect.y) {
        this.rects.splice(i, 1);
        break;
      }
    }
  }

  addAnnotation (x, y) {
    // If annotation already exists, do not add it
    if (this.ctx.isPointInPath(x, y)) {
      return;
    }

    let rect = {x: x, y: y, w: this.rw, h: this.rh};
    this.rects.push(rect);
    this.drawAnnotations();

    // Annotation box
    let div = document.createElement('div');
    div.setAttribute('id', x + '' + y);
    div.setAttribute('class', 'annotation-overlay');
    div.style.left = x + 'px';
    div.style.top = y + 'px';
    document.getElementById('annotation-overlays').appendChild(div);

    // Add close button
    let close = document.createElement('button');
    close.setAttribute('id', 'annotation-button');
    close.setAttribute('class', 'fas fa-times');
    div.appendChild(close);

    close.onclick = function (event) {
      event.preventDefault();
      event.stopPropagation();
      event.srcElement.closest('.annotation-overlay').style.visibility = 'hidden';
    }

    // Add delete button
    let del= document.createElement('button');
    del.setAttribute('id', 'annotation-button');
    del.setAttribute('class', 'far fa-trash-alt');
    div.appendChild(del);

    del.onclick = function (event) {
      event.preventDefault();
      event.stopPropagation();
      // TODO: Get correct language phrase?
      if(confirm('Delete annotation?')) {
        let parent = event.srcElement.closest('.annotation-overlay')

        // Delete annotation from database
        ac.removeAnnotation(parent.id);

        // Delete annotation from screen
        while (parent.firstChild) {
          parent.removeChild(parent.firstChild)
        }
        parent.remove();

        // Clear and redraw annotation canvas
        ac.drawAnnotations();

      }
    }

    // Text span
    let textSpan = document.createElement('span');
    textSpan.setAttribute('id', 'annotation-text');
    textSpan.setAttribute('contenteditable', 'true');
    div.appendChild(textSpan);

    // When clicking on div, put focus on the text span
    div.onclick = function (event) {
      textSpan.focus();
    }
  }
}
