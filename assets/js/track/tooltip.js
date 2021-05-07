// functions for handling tooltips

export function showTooltip(tooltip) {
  tooltip.tooltip.setAttribute('data-show', '')
  tooltip.isDisplayed = true 
}

export function hideTooltip(tooltip) {
  tooltip.tooltip.removeAttribute('data-show')
  tooltip.isDisplayed = false 
}

// create popover html element with message
export function createTooltipElement(message, id) {
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
