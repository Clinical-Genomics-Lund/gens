class Annotation {
  constructor (height) {
    this.annotations = this.loadAnnotations(null);
    this.newAnnotations = [];
    this.annotationCanvas = document.getElementById('annotation');
    this.ctx = this.annotationCanvas.getContext('2d');
    this.annotationCanvas.width = $(document).innerWidth();
    this.annotationCanvas.height =  height;
    this.rw = 4;
    this.rh = 4;
    this.drawAnnotations();
  }

  loadAnnotations (range) {
    return [];
  }

  saveAnnotations (canvas) {
    for (let i = 0; i < this.newAnnotations.length; i++) {
      let annotation = this.newAnnotations[i];
      let text = document.getElementById(annotation.x + '' + annotation.y).getElementsByTagName('span')[0].innerHTML;

      // Convert y coordinate
      let datay = canvas.toDataCoord(0, annotation.y);
      let backy = canvas.toScreenCoord(0, datay);
      console.log(annotation.x, annotation.y);

      // ca(180.000, 0.6) BAF
      console.log('data coord ', canvas.toDataCoord(1461, 147));
      console.log('screen coord ', canvas.toScreenCoord(180000, 0.6, true));

      // ca(180.000, 0.0) LogR
      console.log('data coord ', canvas.toDataCoord(1461, 344));
      console.log('screen coord ', canvas.toScreenCoord(180000, 0.0, false));

      $.getJSON($SCRIPT_ROOT + '/_saveannotation', {
        region: document.getElementById('region_field').placeholder,
        xPos: annotation.x,
        yPos: annotation.y,
        text: text
      }, function(result) {
      });
    }
  }

  drawAnnotations () {
    let i = 0;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.annotationCanvas.width, this.annotationCanvas.height);

    // render initial annotations.
    this.ctx.beginPath();
    for (let i = 0; i < this.annotations.length; i++) {
      let r = this.annotations[i];
      this.ctx.rect(r.x, r.y, r.w, r.h);
    }
    this.ctx.fillStyle = "blue";
    this.ctx.fill();
  }

  intersectsAnnotation (x, y) {
    if (this.ctx.isPointInPath(x, y)) {
      for (let i = 0; i < this.annotations.length; i++) {
        let rect = this.annotations[i];
        if (Math.abs(x - rect.x) <= this.rw && Math.abs(y - rect.y) <= this.rh) {
          document.getElementById(rect.x + '' + rect.y).style.visibility = 'visible';
          return true;
        }
      }
    }
    return false;
  }

  removeAnnotation (id) {
    for (let i = 0; i < this.annotations.length; i++) {
      let rect = this.annotations[i];
      let newrect = this.newAnnotations[i];

      // Remove from list of new annotations
      if ( newrect && id == newrect.x + '' + newrect.y) {
        this.newAnnotations.splice(i, 1);
      }

      // Remove from list of all loaded annotations
      if ( rect && id == rect.x + '' + rect.y) {
        this.annotations.splice(i, 1);
        break;
      }
    }
  }

  addAnnotation (x, y, xOffset, yOffset) {
    // If annotation already exists, do not add it
    if (this.ctx.isPointInPath(x, y)) {
      return;
    }

    let rect = {x: x - xOffset, y: y - yOffset, w: this.rw, h: this.rh};
    this.annotations.push(rect);
    this.newAnnotations.push(rect);
    this.drawAnnotations();

    // Annotation box
    let div = document.createElement('div');
    div.setAttribute('id', (x - xOffset) + '' + (y - yOffset));
    div.setAttribute('class', 'annotation-overlay');
    div.style.left = x + 1 + 'px';
    div.style.top = y + 1 + 'px';
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
      // TODO: Add different language options?
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

    // When clicking on div, make the text span focused
    div.onclick = function (event) {
      textSpan.focus();
    }
  }
}
