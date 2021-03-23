// Draw data points
function drawData (canvas, data, color) {
    let ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    for(let i=0; i<data.length; i+=2) {
	if(data[i+1] > 0 ) { // FIXME: Why are some values < 0?
	  ctx.fillRect(data[i], data[i+1], 2, 2)
	}
    }
}

// Draws vertical tick marks for selected values between
// xStart and xEnd with step length.
// The amplitude scales the values to drawing size
function drawVerticalTicks (canvas, renderX, y, xStart, xEnd,
  width, yMargin, titleColor) {
  const lineThickness = 1;
  const lineWidth = 5;
  const regionSize = xEnd - xStart;
  const scale = width / regionSize;
  const maxNumTicks = 30;

  // Create a step size which is an even power of ten (10, 100, 1000 etc)
  let stepLength = 10**Math.floor(Math.log10(regionSize)-1);

  // Change to "half-steps" (50, 500, 5000) if too many ticks
  if( regionSize / stepLength > maxNumTicks ) {
    stepLength *= 5;
  }

  // Get  starting position for the first tick
  let xFirstTick = Math.ceil(xStart/stepLength) * stepLength;

  // Draw the ticks
  for (let step = xFirstTick; step <= xEnd; step += stepLength) {
    let xStep = scale * (step - xStart);
    let value = numberWithCommas(step.toFixed(0));

    // Draw text and ticks only for the leftmost box
    drawRotatedText(canvas, value, 10, renderX + xStep + 8,
      y - value.length - 3 * yMargin, -Math.PI / 4, titleColor);

    // Draw tick line
    drawLine(canvas, renderX + xStep, y - lineWidth, renderX + xStep, y,
            lineThickness, "#777");
  }
}

// Draws horizontal lines for selected values between
// yStart and yEnd with step length.
// The amplitude scales the values to drawing size
function drawGraphLines (canvas, x, y, yStart, yEnd, stepLength, yMargin, width, height) {
  let ampl = (height - 2 * yMargin) / (yStart - yEnd); // Amplitude for scaling y-axis to fill whole height
  let lineThickness = 1;

  for (let step = yStart; step >= yEnd; step -= stepLength) {
    // Draw horizontal line
    let yPos = y + yMargin + (yStart - step) * ampl;
    drawLine(canvas, x, yPos,
      x + width - 2 * lineThickness,
      yPos, lineThickness, "#ddd");
  }
}

// Creates a graph for one chromosome data type
function createGraph (canvas, x, y, width, height, yMargin, yStart,
  yEnd, step, addTicks, color, open) {
  // Draw tick marks
  if (addTicks) {
    drawTicks(canvas, x, y + yMargin, yStart, yEnd, step, yMargin, width,
      height, color);
  }

  // Draw surrounding coordinate box
  drawBox(canvas, x, y, width, height, 1, color, open);
}

// Handle zoom in button click
function zoomIn (ic) {
  let size = ic.end - ic.start;
  ic.start += Math.floor(size * 0.2);
  ic.end -= Math.floor(size * 0.2);
  ic.redraw (null);
}

// Handle zoom out button click
function zoomOut (ic) {
  let size = ic.end - ic.start;
  ic.start -= Math.floor(size / 3);
  ic.end += Math.floor(size / 3);
  if (ic.start < 1) {
    ic.start = 1;
  }
  ic.redraw (null);
}


//                //
// HELP FUNCTIONS //
//                //

// Draws tick marks for selected values between
// yStart and yEnd with step length.
// The amplitude scales the values to drawing size
function drawTicks (canvas, x, y, yStart, yEnd, stepLength, yMargin, width, height, color) {
  let ampl = (height - 2 * yMargin) / (yStart - yEnd); // Amplitude for scaling y-axis to fill whole height
  let lineThickness = 2;
  let lineWidth = 4;

  for (let step = yStart; step >= yEnd; step -= stepLength) {
    drawText(canvas, x - lineWidth, y + (yStart - step) * ampl + 2.2,
      step.toFixed(1), 10, 'right');

    // Draw tick line
    drawLine(canvas, x - lineWidth, y + (yStart - step) * ampl, x, y + (yStart - step) * ampl, lineThickness, color);
  }
}

// Draw 90 degree rotated text
function drawRotatedText (canvas, text, textSize, posx, posy, rot, color) {
  let ctx = canvas.getContext('2d');
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = ''.concat(textSize, 'px Arial');
  ctx.translate(posx, posy); // Position for text
  ctx.rotate(rot); // Rotate rot degrees
  ctx.textAlign = 'center';
  ctx.fillText(text, 0, 9);
  ctx.restore();
}

// Draw aligned text at (x, y)
function drawText (canvas, x, y, text, textSize, align) {
  let ctx = canvas.getContext('2d');
  ctx.save();
  ctx.font = ''.concat(textSize, 'px Arial');
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'black';
  ctx.fillText(text, x, y);
  ctx.restore();
}

// Draws a line between point (x, y) and (x2, y2)
function drawLine (canvas, x, y, x2, y2, thickness, color) {
  let ctx = canvas.getContext('2d');
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  x = Math.floor(x) + 0.5;
  x2 = Math.floor(x2) + 0.5;
  y = Math.floor(y) + 0.5;
  y2 = Math.floor(y2) + 0.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

// Draws a box from top left corner with a top and bottom margin
function drawBox (canvas, x, y, width, height, lineWidth, color, open) {
  let ctx = canvas.getContext("2d")
  x = Math.floor(x)+0.5;
  y = Math.floor(y)+0.5;
  width = Math.floor(width);
    
  // Draw box without left part, to allow stacking boxes
  // horizontally without getting double lines between them.
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  
  if(open === true) {
    ctx.beginPath();
    ctx.moveTo(x,y);
    ctx.lineTo(x+width,y);
    ctx.lineTo(x+width,y+height);
    ctx.lineTo(x,y+height);
    ctx.stroke();
  // Draw normal 4-sided box
  } else {
    ctx.strokeRect(x, y, width, height);
  }
}

// Makes large numbers more readable with commas
function numberWithCommas (x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Reloads page to printable size
function loadPrintPage(region) {
  let location = window.location.href.replace(/region=.*&/, 'region=' + region + '&');
  location = location.includes('?') ? `${location}&print_page=true` : `${location}?print_page=true`
  window.location.replace(location);
}

// Show print prompt and reloads page after print
function printPage () {
  document.querySelector('.no-print').toggleAttribute('hidden');
  window.addEventListener('afterprint', function() {
    window.location.replace(window.location.href.replace('&print_page=true', ''))
  }, {once : true});
  print();
}

// Make hard link and copy link to clipboard
function copyPermalink(hg_type, region) {
  let [baseUrl, urlParams] = window.location.href.split('?');
  // create element and add url to it
  let tempElement = document.createElement("input");
  tempElement.value = `${baseUrl}?hg_type=${hg_type}&region=${region}`;
  // add element to DOM
  document.body.append(tempElement);
  tempElement.select();
  document.execCommand("copy");
  tempElement.remove();  // remove temp node
}
