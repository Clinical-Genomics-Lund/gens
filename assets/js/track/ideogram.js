import { get } from '../fetch.js'
import { drawRect } from '../draw.js'
import { lightenColor } from './base.js'
import { createPopper } from '@popperjs/core'

// Cytogenetic ideogram

export async function cytogeneticIdeogram(targetId, chromosomeName, genomeBuild, x, width) {
  // create canvas and append to target section of dom
  const targetElement = document.getElementById(targetId)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = 200
  targetElement.appendChild(canvas)
  const ctx = canvas.getContext('2d')

  const chromInfo = await getChromosomeInfo(chromosomeName, genomeBuild)
  // recalculate genomic coordinates to screen coordinates
  const scale = width / chromInfo.size
  const centromere = chromInfo.centromere !== null ? 
    {start: Math.round(chromInfo.centromere.start * scale), end: Math.round(chromInfo.centromere.end * scale) } : null
  const drawPaths = drawChromosome({
    ctx: ctx, x: 3, y: 5,
    width: width - 5,
    height: 60,
    centromere,
    color: 'white',
    bands: chromInfo.bands.map((band) => {
      band.start = Math.round(band.start * scale)
      band.end = Math.round(band.end * scale)
      return band
    })
  })
}

async function getChromosomeInfo(chromosomeName, genomeBuild) {
  const result = await get('get-chromosome-info', { chromosome: chromosomeName, genome_build: genomeBuild })
  return result
}

function drawChromosome({ ctx, x, y, width, height,centromere, bands, color, lineColor }) {
  const basePosColor = '#480ca8' // dark green
  const bandColors = {
    acen: '#b5179e',
    gvar: '#f72585',
    gpos25: lightenColor(basePosColor, 75),
    gpos50: lightenColor(basePosColor, 50),
    gpos75: lightenColor(basePosColor, 25),
    gpos100: basePosColor,
  }
  const chromPath = drawChromosomeShape({ ctx, x, y, width, height ,centromere, color, lineColor })
  ctx.clip(chromPath)
  const bandPaths = bands.map((band) => {
    if (band.stain !== 'gneg' ) {
      band.path = drawRect({ 
        ctx, 
        x: x + band.start, 
        y: y - 5, 
        width: band.end - band.start, 
        height: height + 5, 
        color: bandColors[band.stain],
        fillColor: bandColors[band.stain],
        })
      band.x = x + band.start
      band.y = y - 5
      band.width = band.end - band.start
      band.height = height + 5
    } else {
      band.path = null
    }
    return band
  }).filter((band) => {return band.path !== null})
  ctx.restore()
  return {chromosome: chromPath, bands: bandPaths}
}

function drawChromosomeShape({ ctx, x, y, width, height, centromere, color, lineColor = '#000' }) {
  // draw shape of chromosome
  // define proportions of shape
  const heightProportion = 0.1
  const endBevelProportion = 0.05
  const centromereIndentProportion = 0.3
  // compute basic meassurement
  //const height = Math.round(width * heightProportion)
  const bevelWidth = Math.round(width * endBevelProportion)

  // cacluate dimensions of the centromere
  const centromereLenght = centromere.end - centromere.start
  const centromereIndent = Math.round(height * centromereIndentProportion)
  const centromereIndentRadius = centromereIndent * 2.5 < centromereLenght / 3 ? Math.round(centromereIndent * 2.5) : centromereLenght / 3
  const centromereCenter = centromere.start + Math.round((centromere.end - centromere.start) / 2)

  const chromEndRadius = Math.round(height * .7 / 2)

  // path object
  const path = new Path2D()
  // draw shape
  path.moveTo(x + bevelWidth, y) // move to start
  // handle centromere
  if (centromere) {
    path.lineTo(centromere.start, y)
    // indent for centromere
    path.arcTo(centromereCenter, y + centromereIndent, centromere.end, y, centromereIndentRadius)
    path.lineTo(centromere.end, y)
  }
  path.lineTo(x + width - bevelWidth, y) // line to end cap
  // right end cap
  path.arcTo(x + width, y, x + width, y + (height / 2), chromEndRadius)
  path.arcTo(x + width, y + height, x + width - bevelWidth, y + height, chromEndRadius)
  // bottom line
  if (centromere) {
    path.lineTo(centromere.end, y + height)
    path.arcTo(centromereCenter, (y + height) - centromereIndent, centromere.start, y + height, centromereIndentRadius)
    path.lineTo(centromere.start, y + height)
  }
  path.lineTo(x + bevelWidth, y + height)
  // left end cap
  path.arcTo(x, y + height, x, y + (height / 2), chromEndRadius)
  path.arcTo(x, y, x + bevelWidth, y, chromEndRadius)
  // finish figure
  path.closePath()
  // setup coloring
  ctx.strokeStyle = lineColor
  ctx.stroke(path)
  if (color !== undefined) {
    ctx.fillStyle = color
    ctx.fill(path)
  }
  return path
}