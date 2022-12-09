// GENS module

import { InteractiveCanvas } from './interactive.js'
import { OverviewCanvas } from './overview.js'
import { VariantTrack, AnnotationTrack, TranscriptTrack, CytogeneticIdeogram } from './track.js'
export {
  setupDrawEventManager, drawTrack, previousChromosome, nextChromosome,
  panTracks, zoomIn, zoomOut, parseRegionDesignation, queryRegionOrGene
} from './navigation.js'

export function initCanvases({ sampleName, caseId, genomeBuild, hgFileDir, uiColors, selectedVariant, annotationFile }) {
  // initialize and return the different canvases
  // WEBGL values
  const near = 0.1
  const far = 100
  const lineMargin = 2 // Margin for line thickness
  // Listener values
  const inputField = document.getElementById('region-field')
  // Initiate interactive canvas
  const ic = new InteractiveCanvas(inputField, lineMargin, near, far, caseId, sampleName, genomeBuild, hgFileDir)
  // Initiate variant, annotation and transcript canvases
  const vc = new VariantTrack(ic.x, ic.plotWidth, near, far, caseId, genomeBuild, uiColors.variants, selectedVariant)
  const tc = new TranscriptTrack(ic.x, ic.plotWidth, near, far, genomeBuild, uiColors.transcripts)
  const ac = new AnnotationTrack(ic.x, ic.plotWidth, near, far, genomeBuild, annotationFile)
  // Initiate and draw overview canvas
  const oc = new OverviewCanvas(ic.x, ic.plotWidth, lineMargin, near, far, caseId, sampleName, genomeBuild, hgFileDir)
  // Draw cytogenetic ideogram figure
  const cg = new CytogeneticIdeogram({
    targetId: 'cytogenetic-ideogram',
    genomeBuild,
    x: ic.x,
    y: ic.y,
    width: ic.plotWidth,
    height: 40
  })
  return {
    ic: ic,
    vc: vc,
    tc: tc,
    ac: ac,
    oc: oc,
    cg: cg,
  }
}

// Make hard link and copy link to clipboard
export function copyPermalink(genomeBuild, region) {
  // create element and add url to it
  const tempElement = document.createElement('input')
  const loc = window.location
  tempElement.value = `${loc.host}${loc.pathname}?genome_build=${genomeBuild}&region=${region}`
  // add element to DOM
  document.body.append(tempElement)
  tempElement.select()
  document.execCommand('copy')
  tempElement.remove() // remove temp node
}

// Reloads page to printable size
export function loadPrintPage(region) {
  let location = window.location.href.replace(/region=.*&/, `region=${region}&`)
  location = location.includes('?') ? `${location}&print_page=true` : `${location}?print_page=true`
  window.location.replace(location)
}

// Show print prompt and reloads page after print
export function printPage() {
  document.querySelector('.no-print').toggleAttribute('hidden')
  window.addEventListener('afterprint', () => {
    window.location.replace(window.location.href.replace('&print_page=true', ''))
  }, { once: true })
  print()
}

export { CHROMOSOMES, setupGenericEventManager } from './track.js'