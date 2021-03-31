// Draw data points
export function drawData ({ ctx, data, color = 'black' }) {
  ctx.fillStyle = '#000'
  for (let i = 0; i < data.length; i += 2) {
    if (data[i + 1] > 0) { // FIXME: Why are some values < 0?
      ctx.fillRect(
        data[i], // x
        data[i + 1], // y
        2, // width
        2 // height
      )
    }
  }
}

// Draws vertical tick marks for selected values between
// xStart and xEnd with step length.
// The amplitude scales the values to drawing size
export function drawVerticalTicks ({
  ctx, renderX, y, xStart, xEnd,
  xoStart, xoEnd,
  width, yMargin, titleColor
}) {
  const lineThickness = 1
  const lineWidth = 5
  const regionSize = xEnd - xStart
  const scale = width / regionSize
  const maxNumTicks = 30

  // Create a step size which is an even power of ten (10, 100, 1000 etc)
  let stepLength = 10 ** Math.floor(Math.log10(regionSize) - 1)

  // Change to "half-steps" (50, 500, 5000) if too many ticks
  if (regionSize / stepLength > maxNumTicks) {
    stepLength *= 5
  }

  // Get  starting position for the first tick
  const xFirstTick = Math.ceil(xoStart / stepLength) * stepLength

  // Draw the ticks
  for (let step = xFirstTick; step <= xoEnd; step += stepLength) {
    const xStep = Math.round(scale * (step - xoStart))
    const value = numberWithCommas(step.toFixed(0))

    // Draw text and ticks only for the leftmost box
    drawRotatedText(ctx, value, 10, renderX + xStep + 8,
      y - value.length - 3 * yMargin, -Math.PI / 4, titleColor)

    // Draw tick line
    drawLine({
      ctx,
      x: renderX + xStep,
      y: y - lineWidth,
      x2: renderX + xStep,
      y2: y,
      lineWidth: lineThickness,
      color: '#777'
    })
  }
}

// Draws horizontal lines for selected values between
// yStart and yEnd with step length.
// The amplitude scales the values to drawing size
export function drawGraphLines ({ ctx, x, y, yStart, yEnd, stepLength, yMargin, width, height }) {
  const ampl = (height - 2 * yMargin) / (yStart - yEnd) // Amplitude for scaling y-axis to fill whole height
  const lineThickness = 1

  for (let step = yStart; step >= yEnd; step -= stepLength) {
    // Draw horizontal line
    const yPos = y + yMargin + (yStart - step) * ampl
    drawLine({ctx, x, y: yPos,
              x2: x + width - 2 * lineThickness,
              y2: yPos, color: '#e5e5e5'})
  }
}

// Creates a graph for one chromosome data type
export function createGraph (ctx, x, y, width, height, yMargin, yStart,
  yEnd, step, addTicks, color = 'black', open) {
  // Draw tick marks
  if (addTicks) {
    drawTicks(ctx, x, y + yMargin, yStart, yEnd, step, yMargin, width,
      height, color)
  }

  // Draw surrounding coordinate box
  drawRect({ctx, x, y, width, height, lineWithd: 1, color, open})
}

// Handle zoom in button click
export function zoomIn (ic) {
  const size = ic.end - ic.start
  ic.start += Math.floor(size * 0.2)
  ic.end -= Math.floor(size * 0.2)
  ic.redraw(null)
}

// Handle zoom out button click
export function zoomOut (ic) {
  const size = ic.end - ic.start
  ic.start -= Math.floor(size / 3)
  ic.end += Math.floor(size / 3)
  if (ic.start < 1) {
    ic.start = 1
  }
  ic.redraw(null)
}

//                //
// HELP FUNCTIONS //
//                //

// Draws tick marks for selected values between
// yStart and yEnd with step length.
// The amplitude scales the values to drawing size
function drawTicks (ctx, x, y, yStart, yEnd, stepLength, yMargin, width, height, color = 'black') {
  const ampl = (height - 2 * yMargin) / (yStart - yEnd) // Amplitude for scaling y-axis to fill whole height
  const lineThickness = 2
  const lineWidth = 4

  for (let step = yStart; step >= yEnd; step -= stepLength) {
    drawText({ctx, x: x - lineWidth, y: y + (yStart - step) * ampl + 2.2,
              text: step.toFixed(1), textSize: 10, align: 'right'})

    // Draw tick line
    drawLine({
      ctx, x: x - lineWidth, y: y + (yStart - step) * ampl,
      x2: x, y2: y + (yStart - step) * ampl, lineWidth: lineThickness, color})
  }
}

// Draw 90 degree rotated text
export function drawRotatedText (ctx, text, textSize, posx, posy, rot, color = 'black') {
  ctx.save()
  ctx.fillStyle = color
  ctx.font = ''.concat(textSize, 'px Arial')
  ctx.translate(posx, posy) // Position for text
  ctx.rotate(rot) // Rotate rot degrees
  ctx.textAlign = 'center'
  ctx.fillText(text, 0, 9)
  ctx.restore()
}

// Draw aligned text at (x, y)
export function drawText ({ctx, x, y, text, fontProp, align = 'center'}) {
  ctx.save()
  ctx.font = ''.concat(fontProp, 'px Arial')
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'black'
  ctx.fillText(text, x, y)
  const textBbox = ctx.measureText(text)
  ctx.restore()
  return {
    x: x - textBbox.width / 2,
    y: y - textBbox.actualBoundingBoxAscent,
    width: textBbox.width,
    height: textBbox.actualBoundingBoxAscent + textBbox.actualBoundingBoxDescent
  }
}

// Draws a line between point (x, y) and (x2, y2)
export function drawLine ({ctx, x, y, x2, y2, lineWidth = 1, color = 'black'}) {
  // transpose coordinates .5 px to become sharper
  x = Math.floor(x) + 0.5
  x2 = Math.floor(x2) + 0.5
  y = Math.floor(y) + 0.5
  y2 = Math.floor(y2) + 0.5
  // draw path
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.restore()
}

// Draws a box from top left corner with a top and bottom margin
export function drawRect ({ctx, x, y, width, height, lineWidth, color=null,
                           fillColor = null, open = false}) {
  x = Math.floor(x) + 0.5
  y = Math.floor(y) + 0.5
  width = Math.floor(width)

  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth

  // Draw box without left part, to allow stacking boxes
  // horizontally without getting double lines between them.
  if (open === true) {
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + width, y)
    ctx.lineTo(x + width, y + height)
    ctx.lineTo(x, y + height)
    ctx.stroke()
  // Draw normal 4-sided box
  } else if ( fillColor ) {
    ctx.fillStyle = fillColor
    ctx.fillRect(x, y, width, height)
  } else {
    ctx.strokeRect(x, y, width, height)
  }
}

// Makes large numbers more readable with commas
function numberWithCommas (x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// Reloads page to printable size
function loadPrintPage (region) {
  let location = window.location.href.replace(/region=.*&/, 'region=' + region + '&')
  location = location.includes('?') ? `${location}&print_page=true` : `${location}?print_page=true`
  window.location.replace(location)
}

// Show print prompt and reloads page after print
export function printPage () {
  document.querySelector('.no-print').toggleAttribute('hidden')
  window.addEventListener('afterprint', function () {
    window.location.replace(window.location.href.replace('&print_page=true', ''))
  }, { once: true })
  print()
}

// Make hard link and copy link to clipboard
export function copyPermalink (hgType, region) {
  // create element and add url to it
  const tempElement = document.createElement('input')
  tempElement.value = `${window.location.host}?hg_type=${hgType}&region=${region}`
  // add element to DOM
  document.body.append(tempElement)
  tempElement.select()
  document.execCommand('copy')
  tempElement.remove() // remove temp node
}

// Draw an arrow in desired direction
// Forward arrow: direction = 1
// Reverse arrow: direction = -1
export async function drawArrow ({ctx, x, y, dir, height, lineWidth = 2, color = 'black'}) {
  const width = dir * lineWidth
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  ctx.moveTo(x - width / 2, y - height / 2)
  ctx.lineTo(x + width / 2, y)
  ctx.moveTo(x + width / 2, y)
  ctx.lineTo(x - width / 2, y + height / 2)
  ctx.stroke()
  ctx.restore()
}

// Draw a wave line from xStart to xStop at yPos where yPos is top left of the line.
// Pattern is drawn by incrementing pointer by a half wave length and plot either
// upward (/) or downward (\) line.
// if the end is trunctated a partial wave is plotted.
export function drawWaveLine ({ctx, x, y, x2, height, color = 'black', lineWidth = 2}) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  ctx.moveTo(x, y) // begin at bottom left
  const waveLength = 2 * (height / Math.tan(45))
  const lineLength = x2 - x + 1
  // plot whole wave pattern
  const midline = y - height / 2 // middle of line
  let lastXpos = x
  for (let i = 0; i < Math.floor(lineLength / (waveLength / 2)); i++) {
    lastXpos += waveLength / 2
    height *= -1 // reverse sign
    ctx.lineTo(lastXpos, midline + height / 2) // move up
  }
  // plot partial wave patterns
  const partialWaveLength = lineLength % (waveLength / 2)
  if (partialWaveLength !== 0) {
    height *= -1 // reverse sign
    const partialWaveHeight = partialWaveLength * Math.tan(45)
    ctx.lineTo(x2, y - Math.sign(height) * partialWaveHeight)
  }
  ctx.stroke()
  ctx.restore()
}
