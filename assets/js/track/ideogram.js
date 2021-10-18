// Cytogenetic ideogram
import { get } from '../fetch.js'
import { drawRect } from '../draw.js'
import { lightenColor } from './base.js'
import tippy, { followCursor } from 'tippy.js'
import 'tippy.js/dist/tippy.css';
import { thisExpression } from '@babel/types';

export class CytogeneticIdeogram {
  constructor({targetId, genomeBuild, x, y, width, height}) {
    // define core varialbes
    this.genomeBuild = genomeBuild
    this.x = x
    this.y = y
    this.plotWidth = width
    this.plotHeight = height
    // Setup cytogenetic ideogram image
    this.targetElement = document.getElementById(targetId)
    this.targetElement.style.height = `${height + 10}px`
    // create canvas and append to target section of dom
    const canvas = document.createElement('canvas')
    canvas.style.marginLeft = `${x}px`
    canvas.width = width
    canvas.height = height
    this.targetElement.appendChild(canvas)
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    // create region marker
    const markerElement = document.createElement('div')
    markerElement.id = "ideogram-marker"
    markerElement.classList = ["marker"]
    markerElement.style.height = `${height - 4}px`
    markerElement.style.width = 0
    markerElement.style.top = `-${height -4}px`
    markerElement.style.marginLeft = `${x}px`
    this.targetElement.appendChild(markerElement)
    // chromosomeImage
    this.drawPaths = null

    // define tooltip element
    const tooltip = createChromosomeTooltip({})
    tippy(canvas, {
      arrow: true,
      followCursor: 'horizontal',
      content: tooltip,
      plugins: [followCursor]
    })

    // register event handeler for updating popups
    canvas.addEventListener('mousemove', (event) => {
      this.drawPaths !== null && this.drawPaths.bands.map((bandPath) => {
        const ctx = canvas.getContext('2d')
        if (ctx.isPointInPath(bandPath.path, event.offsetX, event.offsetY)) {
          tooltip.querySelector('.ideogram-tooltip-value').innerHTML = bandPath.id
        }
      })
    })
    // register event for moving and zooming region marker
    this.targetElement.addEventListener('mark-region', (event) => {
      // if marking a subset of chromosome
      const { chrom, start, end } = event.detail.region
      if (this.drawPaths !== null && chrom === this.drawPaths.chromosome.chromInfo.chrom) {
        const { scale, x } = this.drawPaths.chromosome.chromInfo
        const markerElement = document.getElementById('ideogram-marker')
        markerElement.style.marginLeft = `${Math.round(x + (start * scale))}px`
        markerElement.style.width = `${Math.round((end - start + 1) * scale)}px`
        // dispatch event to update title
        const scaledStart = Math.round(start * scale)
        const scaledEnd = Math.round(end * scale)
        const bandsWithinMaredRegion = this.drawPaths.bands.filter((band) => {
          return (band.start < scaledStart) && (band.end < scaledEnd)
        })
        document.getElementById('visualization-container').dispatchEvent( 
          new CustomEvent('update-title', { 
            detail: { bands: bandsWithinMaredRegion, chrom: chrom } })
        )
      }
    })
    // register event for moving and zooming region marker
    this.targetElement.addEventListener('draw', (event) => {
      // check if this is supposed to be excluded
      if ( !event.detail.exclude.includes(this.targetElement.id) ) {
        // remove old figures
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        this.ctx.save()
        markerElement.style.width = 0
        // draw new figure
        cytogeneticIdeogram({
          ctx: this.ctx,
          chromosomeName: event.detail.region.chrom,
          x: this.x, 
          width: this.plotWidth, 
          height: this.plotHeight,
          genomeBuild: this.genomeBuild,
        }).then((paths) => { 
          this.drawPaths = paths
        })
      }
    })
  }
}

export function setupGenericEventManager({eventName, ownerElement, targetElementIds}) {
  // pass directed from owner element to taget elements
  ownerElement.addEventListener(eventName, (event) => {
    targetElementIds.map((id) => { 
      document.getElementById(id).dispatchEvent(
        new CustomEvent(eventName, {detail: event.detail})
      )
    })
  })
}

function createChromosomeTooltip({ bandId }) {
  const element = document.createElement('div')
  element.id = 'ideogram-tooltip'
  const name = document.createElement('span')
  name.innerHTML = 'ID:'
  name.classList = ["ideogram-tooltip-key"]
  element.appendChild(name)
  const value = document.createElement('span')
  value.classList = ["ideogram-tooltip-value"]
  element.appendChild(value)
  return element
}

export async function cytogeneticIdeogram({ctx, chromosomeName, genomeBuild, x, width, height}) {
  const chromInfo = await getChromosomeInfo(chromosomeName, genomeBuild)
  // recalculate genomic coordinates to screen coordinates
  const scale = width / chromInfo.size
  const centromere = chromInfo.centromere !== null ?
    { start: Math.round(chromInfo.centromere.start * scale), end: Math.round(chromInfo.centromere.end * scale) } : null
  const drawPaths = drawChromosome({
    ctx: ctx, x: 3, y: 5,
    width: width - 5,
    height: height - 6,
    centromere,
    color: 'white',
    bands: chromInfo.bands.map((band) => {
      band.start = Math.round(band.start * scale)
      band.end = Math.round(band.end * scale)
      return band
    })
  })
  drawPaths.chromosome.chromInfo = {
    chrom: chromosomeName,
    x: x,
    width: width,
    scale: scale,
    size: chromInfo.size,
  }
  return drawPaths
}

async function getChromosomeInfo(chromosomeName, genomeBuild) {
  const result = await get('get-chromosome-info', { chromosome: chromosomeName, genome_build: genomeBuild })
  return result
}

function drawChromosome({ ctx, x, y, width, height, centromere, bands, color, lineColor }) {
  const basePosColor = '#000' // dark green
  const bandColors = {
    gneg: '#FFFAF0',
    acen: '#673888',
    gvar: '#4C6D94',
    gpos25: lightenColor(basePosColor, 75),
    gpos50: lightenColor(basePosColor, 50),
    gpos75: lightenColor(basePosColor, 25),
    gpos100: basePosColor,
  }
  const chromPath = {
    path: drawChromosomeShape({ ctx, x, y, width, height, centromere, color, lineColor })
  }

  ctx.clip(chromPath.path)
  const bandPaths = bands.map((band) => {
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
    return band
  }).filter((band) => { return band.path !== null })
  ctx.restore()
  return { chromosome: chromPath, bands: bandPaths }
}

function drawChromosomeShape({ ctx, x, y, width, height, centromere, color, lineColor = '#000' }) {
  // draw shape of chromosome
  // define proportions of shape
  const endBevelProportion = 0.05
  const centromereIndentProportion = 0.3
  // compute basic meassurement
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