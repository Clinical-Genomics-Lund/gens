class Annotation {
  constructor (height, sampleName) {
    this.newAnnotations = [];
    this.annotations = [];
    this.annotationCanvas = document.getElementById('annotation');
    this.ctx = this.annotationCanvas.getContext('2d');
    this.annotationCanvas.width = $(document).innerWidth();
    this.annotationCanvas.height =  height;
    this.rw = 4;
    this.rh = 4;
    this.xOffset = this.annotationCanvas.offsetLeft;
    this.yOffset = this.annotationCanvas.offsetTop;
    this.sampleName = sampleName;
    this.saveInterval = 1000;
    this.typingTimer;
  }
      // Calculate which canvas div belong to
      // let y_pos = parseFloat(this.style.top);

      // if (y_pos < ic.contentCanvas.offsetTop + ic.contentCanvas.height) {

  saveAnnotations () {
    clearTimeout(ac.typingTimer);
    for (let i = 0; i < this.newAnnotations.length; i++) {
      let index = this.newAnnotations[i];
      let annot = this.annotations[index];

      let text = document.getElementById(annot.x + '' + annot.y).getElementsByTagName('span')[0].innerHTML;

      // Do not save empty annotations
      if (text == '') {
        continue;
      }

      if (annot.y < ic.contentCanvas.offsetTop + ic.contentCanvas.height) {
        $.getJSON($SCRIPT_ROOT + '/_saveinteractiveannotation', {
          region: document.getElementById('region_field').placeholder,
          text: text,
          xPos: annot.x,
          yPos: annot.y,
          sample_name: this.sampleName,
          top: ic.y,
          left: ic.x + adjustedMargin,
          width: ic.boxWidth,
          height: ic.boxHeight,
          y_margin: ic.yMargin
        });
      } else {
        $.getJSON($SCRIPT_ROOT + '/_saveoverviewannotation', {
          text: text,
          xPos: annot.x,
          yPos: annot.y,
          sample_name: this.sampleName,
          top: oc.y + oc.staticCanvas.offsetTop - ac.yOffset + oc.rowMargin,
          left: oc.x + adjustedMargin,
          width: oc.boxWidth,
          height: oc.boxHeight,
          y_margin: oc.yMargin,
          num_chrom: oc.numChrom,
          right_margin: oc.rightMargin + adjustedMargin,
          row_height: oc.rowHeight,
        });
      }
    }
    this.newAnnotations = [];
  }

  clearAnnotations(height) {
    $('.annotation-overlay').remove();
    this.ctx.clearRect(0, 0, this.annotationCanvas.width, height);
    this.annotations = [];
    this.newAnnotations = [];
  }

  drawAnnotations () {
    let i = 0;

    // render initial annotations.
    this.ctx.beginPath();
    for (let i = 0; i < this.annotations.length; i++) {
      let r = this.annotations[i];
      this.ctx.rect(r.x, r.y, r.w, r.h);
    }
    this.ctx.fillStyle = 'gray';
    this.ctx.fill();
  }

  intersectsAnnotation (x, y, visibility) {
    if (this.ctx.isPointInPath(x, y)) {
      for (let i = 0; i < this.annotations.length; i++) {
        let rect = this.annotations[i];
        if (Math.abs(x - rect.x) <= this.rw && Math.abs(y - rect.y) <= this.rh) {
          if (visibility) {
            document.getElementById(rect.x + '' + rect.y).style.visibility = 'visible';
          }
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

    let text = document.getElementById(removedAnnot.x + '' + removedAnnot.y).getElementsByTagName('span')[0].innerHTML;

    // Check if annotation belongs to interactive or overview canvas
    if (removedAnnot.y < (oc.staticCanvas.offsetTop - this.yOffset)) {
      // Remove from database
      $.getJSON($SCRIPT_ROOT + '/_removeannotation', {
        region: document.getElementById('region_field').placeholder,
        xPos: removedAnnot.x,
        yPos: removedAnnot.y,
        text: text,
        sample_name: this.sampleName,
        overview: false,
        top: ic.y,
        left: ic.x + adjustedMargin,
        width: ic.boxWidth,
        height: ic.boxHeight,
        y_margin: ic.yMargin
      });
    } else {
      // Remove from database
      $.getJSON($SCRIPT_ROOT + '/_removeannotation', {
        xPos: removedAnnot.x,
        yPos: removedAnnot.y,
        text: text,
        sample_name: this.sampleName,
        overview: true,
        top: oc.y + oc.staticCanvas.offsetTop - ac.yOffset + oc.rowMargin,
        left: oc.x + adjustedMargin,
        width: oc.boxWidth,
        height: oc.boxHeight,
        y_margin: oc.yMargin,
        num_chrom: oc.numChrom,
        right_margin: oc.rightMargin + adjustedMargin,
        row_height: oc.rowHeight
      });
    }
  }

  delFromScreen(annot) {
    // Delete annotation from screen
    while (annot.firstChild) {
      annot.removeChild(annot.firstChild)
    }
    annot.remove();
  }

  addAnnotation (x, y, text, canvas, dataType) {
    // If annotation already exists in this point, do not add a new one
    if (ac.ctx.isPointInPath(x, y)) {
      return;
    }

    let rect = {x: x, y: y, w: ac.rw, h: ac.rh};
    ac.annotations.push(rect);
    ac.drawAnnotations();

    // Add annotation box
    ac.addAnnotationBox(x, y, text, canvas, dataType);

    if (dataType == 'overview') {
      // Add annotation box for interactive graph
      $.getJSON($SCRIPT_ROOT + '/_convertbetweenviews', {
        ovr_x_pos: x,
        ovr_y_pos: y,
        ovr_left: oc.x + adjustedMargin,
        ovr_top: oc.y + oc.staticCanvas.offsetTop - ac.yOffset + oc.rowMargin,
        ovr_width: oc.boxWidth,
        ovr_height: oc.boxHeight,
        num_chrom: oc.numChrom,
        ovr_right_margin: oc.rightMargin + adjustedMargin,
        ovr_row_height: oc.rowHeight,
        in_left: ic.x + adjustedMargin,
        in_top: ic.y,
        in_start: ic.start,
        in_end: ic.end,
        in_width: ic.boxWidth,
        in_height: ic.boxHeight,
        in_y_margin: ic.yMargin
      }, function(result) {
        ac.addAnnotationBox(result['x_pos'], result['y_pos'], text, ic,
          dataType);
      });
    } else {
      // Add annotation box for overview graph
      $.getJSON($SCRIPT_ROOT + '/_convertbetweenviews', {
        x_pos: x,
        y_pos: y,
        left: ic.x + adjustedMargin,
        top: ic.y,
        start: ic.start,
        end: ic.end,
        width: ic.boxWidth,
        height: ic.boxHeight,
        y_margin: ic.yMargin
      }, function(result) {
        ac.addAnnotationBox(result['x_pos'], result['y_pos'], text, ic,
          dataType);
      });
    }
  }

  addAnnotationBox(x, y, text, canvas, dataType) {
    // Annotation box
    let div = document.createElement('div');
    div.setAttribute('id', x + '' + y);
    div.setAttribute('class', 'annotation-overlay');
    div.setAttribute('data-index', (ac.annotations.length - 1));
    div.setAttribute('data-type', dataType);

    // Center annotation box's left corner on annotation point
    div.style.left = x + ac.rw / 2 + 'px';
    div.style.top = y + ac.rh / 2 + 'px';
    document.getElementById('annotation-overlays').appendChild(div);

    // Add typing timer, when typing has stopped save the content
    div.addEventListener('input', function() {
      clearTimeout(ac.typingTimer);

      ac.newAnnotations.push(parseInt(this.dataset.index));

      ac.typingTimer = setTimeout(function() {
        ac.saveAnnotations();
      }, ac.saveInterval);
    });

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
    let del = document.createElement('button');
    del.setAttribute('id', 'annotation-button');
    del.setAttribute('class', 'far fa-trash-alt');
    div.appendChild(del);

    del.onclick = function (event) {
      event.preventDefault();
      event.stopPropagation();
      // TODO: Add different language options?
      if(confirm('Delete annotation?')) {
        let annot = event.srcElement.closest('.annotation-overlay')

        // Delete annotation from database
        ac.removeAnnotation(annot.id, canvas);

        ac.delFromScreen(annot);

        // Clear and redraw annotation canvas
        ac.drawAnnotations();
      }
    }

    // Text span
    let textSpan = document.createElement('span');
    textSpan.id = 'annotation-text';
    textSpan.contentEditable = 'true';
    textSpan.textContent = text;

    // Don't register keypress for other events while textspan is focused
    textSpan.onkeydown = function(event) {
      event.stopPropagation();
    };
    div.appendChild(textSpan);
    textSpan.focus();

    // When clicking on div, make the text span focused
    div.onclick = function (event) {
      textSpan.focus();
    }
  }
}
