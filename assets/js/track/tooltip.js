// functions for handling tooltips

export function showTooltip ({ tooltip, featureId }) {
  tooltip.tooltip.setAttribute('data-show', '')
  if (featureId !== undefined) {
    tooltip.tooltip.querySelector(`#feature-${featureId}`).setAttribute('data-show', '')
  }
  tooltip.isDisplayed = true
}

export function hideFeatureInTooltip ({tooltip, feature}) {
  const selectedFeature = tooltip.tooltip.querySelector(`#feature-${feature.id}`)
  selectedFeature.removeAttribute('data-show')
  feature.isDisplayed = false
}

export function hideTooltip (tooltip) {
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
