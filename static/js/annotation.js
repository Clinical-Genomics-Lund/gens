class Annotation {
  constructor (height, sampleName) {
    this.annotations = [];
    this.newAnnotations = [];
    this.annotationCanvas = document.getElementById('annotation');
    this.ctx = this.annotationCanvas.getContext('2d');
    this.annotationCanvas.width = $(document).innerWidth();
    this.annotationCanvas.height =  height;
    this.rw = 4;
    this.rh = 4;
    this.xOffset = this.annotationCanvas.offsetLeft;
    this.yOffset = this.annotationCanvas.offsetTop;
    this.sampleName = sampleName;
  }

  loadAnnotations (ac, canvas, region) {
      $.getJSON($SCRIPT_ROOT + '/_loadannotation', {
        sample_name: this.sampleName,
        region: region
      }, function(result) {
        let annotations = result['annotations'];
        for (let i = 0; i < annotations.length; i++) {
          let canvasCoords = canvas.toScreenCoord(annotations[i]['x'],
            annotations[i]['y'], annotations[i]['baf']);
          ac.addAnnotation(canvasCoords[0], canvasCoords[1], annotations[i]['text'], canvas);
        }
      });
  }

  saveAnnotations (canvas, adjustedMargin) {
    for (let i = 0; i < this.newAnnotations.length; i++) {
      let annot = this.newAnnotations[i];
      let text = document.getElementById(annot.x + '' + annot.y).getElementsByTagName('span')[0].innerHTML;

      // Do not save empty annotations
      if (text == '') {
        continue;
      }

      let dataCoords = canvas.toDataCoord(annot.x, annot.y);

      $.getJSON($SCRIPT_ROOT + '/_saveannotation', {
        region: document.getElementById('region_field').placeholder,
        text: text,
        xPos: dataCoords[0],
        yPos: dataCoords[1],
        baf: dataCoords[2],
        chrom: dataCoords[3],
        sample_name: this.sampleName
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

  removeAnnotation (id, canvas) {
    let removedAnnot = null;
    for (let i = 0; i < this.annotations.length; i++) {
      let annotation = this.annotations[i];
      let newAnnotation = this.newAnnotations[i];

      // Remove from list of new annotations
      if ( newAnnotation && id == newAnnotation.x + '' + newAnnotation.y) {
        this.newAnnotations.splice(i, 1);
      }

      // Remove from list of all loaded annotations
      if ( annotation && id == annotation.x + '' + annotation.y) {
        removedAnnot = this.annotations[i];
        this.annotations.splice(i, 1);
        break;
      }
    }

    if (removedAnnot == null) {
      return;
    }

    let dataCoords = canvas.toDataCoord(removedAnnot.x, removedAnnot.y);
    let offsetDataCoords = canvas.toDataCoord(removedAnnot.x - 1, removedAnnot.y - 1);
    let text = document.getElementById(removedAnnot.x + '' + removedAnnot.y).getElementsByTagName('span')[0].innerHTML;

    // Remove from database
    $.getJSON($SCRIPT_ROOT + '/_removeannotation', {
      region: document.getElementById('region_field').placeholder,
      xPos: dataCoords[0],
      yPos: dataCoords[1],
      chrom: dataCoords[3],
      x_distance: Math.abs(offsetDataCoords[0] - dataCoords[0]),
      y_distance: Math.abs(offsetDataCoords[1] - dataCoords[1]),
      text: text,
      sample_name: this.sampleName
    });
  }

  addAnnotation (x, y, text, canvas) {
    // If annotation already exists in this point, do not add a new one
    if (this.ctx.isPointInPath(x, y)) {
      return;
    }

    let rect = {x: x, y: y, w: this.rw, h: this.rh};
    this.annotations.push(rect);
    this.newAnnotations.push(rect);
    this.drawAnnotations();

    // Annotation box
    let div = document.createElement('div');
    div.setAttribute('id', x + '' + y);
    div.setAttribute('class', 'annotation-overlay');
    // Add offset since annotation box has absolute position
    div.style.left = x + this.xOffset + 1 + 'px';
    div.style.top = y + this.yOffset + 1 + 'px';
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
        ac.removeAnnotation(parent.id, canvas);

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
    textSpan.id = 'annotation-text';
    textSpan.contentEditable = 'true';
    textSpan.textContent = text;
    div.appendChild(textSpan);

    // When clicking on div, make the text span focused
    div.onclick = function (event) {
      textSpan.focus();
    }
  }
}
