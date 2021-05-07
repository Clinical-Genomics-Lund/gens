// functions for handling tooltips
import { isWithinElementBbox } from './base.js'

function showTooltip ({ tooltip, feature }) {
  tooltip.tooltip.setAttribute('data-show', '')
  if (feature !== undefined) {
    const featureElement = tooltip.tooltip.querySelector(`#feature-${feature.id}`)
    featureElement.setAttribute('data-show', '')
    feature.isDisplayed = true
  }
  tooltip.isDisplayed = true
}

function hideFeatureInTooltip ({tooltip, feature}) {
  const selectedFeature = tooltip.tooltip.querySelector(`#feature-${feature.id}`)
  selectedFeature.removeAttribute('data-show')
  feature.isDisplayed = false
}

function hideTooltip (tooltip) {
  tooltip.tooltip.removeAttribute('data-show')
  for (const feature of tooltip.tooltip.querySelectorAll('.feature')) {
    feature.removeAttribute('data-show')
  }
  tooltip.isDisplayed = false
}

// create popover html element with message
export function createTooltipElement (message, id) {
  // create popover base class
  const popover = document.createElement('div')
  popover.setAttribute('role', 'popover')
  if (id !== undefined) {
    popover.id = id
  }
  popover.classList.add('tooltip')
  popover.setAttribute('role', 'popover')
  // add message to div
  popover.innerHTML = message
  return popover
}


// function for handeling apperance and content of tooltips
// element == a the main rendered element, a gene for instance
// features == genetic sub components of the parent elements, for instance a exome
function tooltipHandler (event, track) {
  event.preventDefault()
  event.stopPropagation()
  for (const element of track.geneticElements) {
    const point = { x: event.offsetX, y: event.offsetY }
    const isInElement = isWithinElementBbox({
      element: {
        x1: element.visibleX1,
        x2: element.visibleX2,
        y1: element.y1,
        y2: element.y2
      },
      point
    })
    if (isInElement) {
      // check if pointer is in a feature of element
      let selectedFeature
      for (const feature of element.features) {
        const isInFeature = isWithinElementBbox({
          element: {
            x1: feature.visibleX1,
            x2: feature.visibleX2,
            y1: feature.y1,
            y2: feature.y2
          },
          point
        })
        if (isInFeature && !feature.isDisplayed) {
          // show feature
          selectedFeature = feature
        } else if (!isInFeature && feature.isDisplayed) {
          hideFeatureInTooltip({ tooltip: element.tooltip, feature })
        }
      }
      showTooltip({ tooltip: element.tooltip, feature: selectedFeature })
    } else {
      hideTooltip(element.tooltip)
    }
  }
}


// initialize event listeners for hover function
export function initTrackTooltips(track) { 
  // when mouse is leaving track
  track.trackContainer.addEventListener('mouseleave', 
    () => { 
      for (const element of track.geneticElements) 
      { hideTooltip(element.tooltip) } 
    }) 
  // when mouse is leaving track
  track.trackContainer.addEventListener('mousemove', (e) => { tooltipHandler(e, track) }) 
}
