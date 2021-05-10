// functions for handling tooltips
import { getVisibleXCoordinates, getVisibleYCoordinates, isWithinElementBbox } from './utils.js'


// make virtual DOM element that represents a annoatation element
export function makeVirtualDOMElement(x1, x2, y1, y2) {
  return { getBoundingClientRect: generateGetBoundingClientRect(x1, x2, y1, y2) }
}

// Make a virtual DOM element from a genetic element object
function generateGetBoundingClientRect (x1, x2, y1, y2) {
  return () => ({
    width: Math.round(x2 - x1),
    height: Math.round(y2 - y1),
    // width: 0,
    // height: 0,
    top: y1,
    left: x2,
    right: x1,
    bottom: y2,
  })
}

function generateGetBoundingClientRectTest (x1, x2, y1, y2) {
  return () => ({
    width: 0,
    height: 0,
    top: y1,
    bottom: y1,
    right: x1,
    left: x1
  })
}

export function updateVisableElementCoordinates ({element, canvas, screenPosition, scale}) {
  const {x1, x2} = getVisibleXCoordinates({canvas: screenPosition, feature: element, scale: scale})
  const {y1, y2} = getVisibleYCoordinates({canvas, element})
  // update coordinates
  element.visibleX1 = x1
  element.visibleX2 = x2
  element.visibleY1 = y1
  element.visibleY2 = y2
}

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
    element.tooltip.instance.update()
  }
}


// update tooltip position
function updateTooltipPos(track) {
  for (const element of track.geneticElements) {
    // update coordinates for the main element
    updateVisableElementCoordinates({
      element, 
      canvas: track.contentCanvas,
      screenPosition: track.onscreenPosition,
      scale: track.offscreenPosition.scale,
    })
    // update coordinates for features on element
    for (const feature of element.features) {
      updateVisableElementCoordinates({
        element: feature, 
        canvas: track.contentCanvas,
        screenPosition: track.onscreenPosition,
        scale: track.offscreenPosition.scale,
      })
    }
    // update the virtual DOM element that defines the tooltip hitbox
    const xPos = Math.round(track.contentCanvas.getBoundingClientRect().x)
    element.tooltip.virtualElement = makeVirtualDOMElement(
      element.visibleX1 + xPos, element.visibleX2 + xPos, element.visibleY1, element.visibleY2
    ) 
    // update tooltip instance
    element.tooltip.instance.update()
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
  // extend instance function to recalculate positions of virtual dom elements
  const oldBlit = track.blitCanvas
  track.blitCanvas = (start, end) => { updateTooltipPos(track); oldBlit.call(track, start, end)}
}
