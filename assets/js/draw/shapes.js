// draw basic objects and shapes

//  Draw data points
export function drawPoints ({ ctx, data, color = 'black' }) {
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
export function drawText ({ ctx, x, y, text, fontProp, align = 'center' }) {
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
export function drawLine ({ ctx, x, y, x2, y2, lineWidth = 1, color = 'black' }) {
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
export function drawRect ({
  ctx, x, y, width, height, lineWidth, color = null,
  fillColor = null, open = false
}) {
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
  } else if (fillColor) {
    ctx.fillStyle = fillColor
    ctx.fillRect(x, y, width, height)
  } else {
    ctx.strokeRect(x, y, width, height)
  }
}

// Draw an arrow in desired direction
// Forward arrow: direction = 1
// Reverse arrow: direction = -1
export async function drawArrow ({ ctx, x, y, dir, height, lineWidth = 2, color = 'black' }) {
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
export function drawWaveLine ({ ctx, x, y, x2, height, color = 'black', lineWidth = 2 }) {
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
