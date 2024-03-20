// functions for handling tooltips
import { getVisibleXCoordinates, getVisibleYCoordinates, isWithinElementBbox } from './utils.js'

// make virtual DOM element that represents a annotation element
export function makeVirtualDOMElement ({ x1, x2, y1, y2, canvas }) {
  return { getBoundingClientRect: generateGetBoundingClientRect(x1, x2, y1, y2, canvas) }
}

// Make a virtual DOM element from a genetic element object
export function generateGetBoundingClientRect (x1, x2, y1, y2, canvas) {
  const track = canvas
  return () => ({
    width: Math.round(x2 - x1),
    height: Math.round(y2 - y1),
    top: y1 + Math.round(track.getBoundingClientRect().y),
    left: x1 + Math.round(track.getBoundingClientRect().x),
    right: x2 + Math.round(track.getBoundingClientRect().x),
    bottom: y2 + Math.round(track.getBoundingClientRect().y)
  })
}

export function updateVisibleElementCoordinates ({ element, screenPosition, scale }) {
  const { x1, x2 } = getVisibleXCoordinates({ canvas: screenPosition, feature: element, scale: scale })
  const { y1, y2 } = getVisibleYCoordinates({ element })
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

function hideFeatureInTooltip ({ tooltip, feature }) {
  const selectedFeature = tooltip.tooltip.querySelector(`#feature-${feature.id}`)
  selectedFeature.removeAttribute('data-show')
  feature.isDisplayed = false
}

export function hideTooltip (tooltip) {
  // skip if tooltip has not been rendered
  tooltip.tooltip.removeAttribute('data-show')
  for (const feature of tooltip.tooltip.querySelectorAll('.feature')) {
    feature.removeAttribute('data-show')
  }
  tooltip.isDisplayed = false
}

export function createHtmlList (information) {
  const list = document.createElement('ul')
  for (const info of information) {
    const li = document.createElement('li')
    const bold = document.createElement('strong')
    bold.innerText = info.title
    li.innerText = bold.innerHTML += `: ${info.value}`
    list.appendChild(li)
  }
  return list
}

// create popover html element with message
export function createTooltipElement ({ id, title, information = [] }) {
  // create popover base class
  const popover = document.createElement('div')
  popover.setAttribute('role', 'popover')
  if (id !== undefined) {
    popover.id = id
  }
  popover.classList.add('tooltip')
  popover.setAttribute('role', 'popover')
  // create information in container element
  const container = document.createElement('div')
  container.classList.add('tooltip-content')
  // create title
  const titleElem = document.createElement('h4')
  titleElem.innerText = title
  container.appendChild(titleElem)
  // create information list
  const body = createHtmlList(information)
  container.appendChild(body)
  popover.appendChild(container)
  // return tooltip element
  return popover
}

// function for handeling apperance and content of tooltips
// element == a the main rendered element, a gene for instance
// features == genetic sub components of the parent elements, for instance a exome
function tooltipHandler (event, track) {
  event.preventDefault()
  event.stopPropagation()
  const point = { x: event.offsetX, y: event.offsetY }
  for (const element of track.geneticElements) {
    if ( !element.tooltip) {
      continue
    }
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
function updateTooltipPos (track) {
  for (const element of track.geneticElements) {
    // skip if tooltip has not been rendered
    if ( !element.tooltip ) {
      continue
    }
    // update coordinates for the main element
    updateVisibleElementCoordinates({
      element,
      canvas: track.contentCanvas,
      screenPosition: track.onscreenPosition,
      scale: track.offscreenPosition.scale
    })
    // update coordinates for features on element
    for (const feature of element.features) {
      updateVisibleElementCoordinates({
        element: feature,
        canvas: track.contentCanvas,
        screenPosition: track.onscreenPosition,
        scale: track.offscreenPosition.scale
      })
    }
    // update the virtual DOM element that defines the tooltip hitbox
    const xPos = track.contentCanvas.getBoundingClientRect().x
    element.tooltip.virtualElement = makeVirtualDOMElement({
      x1: Math.round(element.visibleX1 + xPos),
      x2: Math.round(element.visibleX2 + xPos),
      y1: element.visibleY1,
      y2: element.visibleY2
    })
    // update tooltip instance
    element.tooltip.instance.update()
  }
}

// teardown tooltips generated for a track
function teardownTooltips (track) {
  while (track.geneticElements.length) {
    const element = track.geneticElements.shift()
    // skip if tooltip has not been rendered
    if ( !element.tooltip ) {
      continue
    }
    element.tooltip.instance.destroy() // kill popper
    track.trackContainer.querySelector(`#${element.tooltip.tooltip.id}`).remove()
  }
}


// initialize event listeners for hover function
export function initTrackTooltips (track) {
  // when mouse is leaving track
  track.trackContainer.addEventListener('mouseleave',
    () => {
      for (const element of track.geneticElements) { 
        if (element.tooltip) hideTooltip(element.tooltip)
      }
    })
  // when mouse is leaving track
  track.trackContainer.addEventListener('mousemove', (e) => { tooltipHandler(e, track) })
  // extend drawOffScreenTrack to teardown old tooltips prior to drawing new
  const oldDrawOffscreenTrack = track.drawOffScreenTrack
  track.drawOffScreenTrack = async ({ startPos, endPos, maxHeightOrder, data }) => {
    teardownTooltips(track)
    await oldDrawOffscreenTrack.call(track, { startPos, endPos, maxHeightOrder, data })
  }
  // extend instance function to recalculate positions of virtual dom elements
  const oldBlit = track.blitCanvas
  track.blitCanvas = (start, end) => {
    updateTooltipPos(track)
    oldBlit.call(track, start, end)
  }
}
