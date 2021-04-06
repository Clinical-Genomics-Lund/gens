// GENS module

import { InteractiveCanvas } from './interactive.js'
import { OverviewCanvas } from './overview.js'
import { CHROMOSOMES, VariantTrack, AnnotationTrack, TranscriptTrack } from './track.js'
export {
  setupDrawEventManager, drawTrack, previousChromosome, nextChromosome,
  panTracks, zoomIn, zoomOut, parseRegionDesignation, queryRegionOrGene
} from './navigation.js'

export function initCanvases ({ sampleName, hgType, hgFileDir, uiColors, selectedVariant, annotationFile }) {
  // initialize and return the different canvases
  // WEBGL values
  const near = 0.1
  const far = 100
  const lineMargin = 2 // Margin for line thickness
  // Listener values
  const inputField = document.getElementById('region-field')
  // Initiate interactive canvas
  const ic = new InteractiveCanvas(inputField, lineMargin, near, far, sampleName, hgType, hgFileDir)
  // Initiate variant, annotation and transcript canvases
  const vc = new VariantTrack(ic.x, ic.plotWidth, near, far, hgType, uiColors.variants, selectedVariant)
  const tc = new TranscriptTrack(ic.x, ic.plotWidth, near, far, hgType, uiColors.transcripts)
  const ac = new AnnotationTrack(ic.x, ic.plotWidth, near, far, hgType, annotationFile)
  // Initiate and draw overview canvas
  const oc = new OverviewCanvas(ic.x, ic.plotWidth, lineMargin, near, far, sampleName, hgType, hgFileDir)
  return {
    ic: ic,
    vc: vc,
    tc: tc,
    ac: ac,
    oc: oc
  }
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

// Reloads page to printable size
export function loadPrintPage (region) {
  let location = window.location.href.replace(/region=.*&/, `region=${region}&`)
  location = location.includes('?') ? `${location}&print_page=true` : `${location}?print_page=true`
  window.location.replace(location)
}

// Show print prompt and reloads page after print
export function printPage () {
  document.querySelector('.no-print').toggleAttribute('hidden')
  window.addEventListener('afterprint', () => {
    window.location.replace(window.location.href.replace('&print_page=true', ''))
  }, { once: true })
  print()
}

export { CHROMOSOMES } from './track.js'
