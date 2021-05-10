// Utility functions

export function getVisibleYCoordinates ({ canvas, element, minWidth = 4 }) {
  const bbox = canvas.getBoundingClientRect()
  let y1 = Math.round(element.y1 + bbox.y)
  let y2 = Math.round(element.y2 + bbox.y)
  if (y2 - y1 < minWidth) {
    y1 = Math.round(y1 - (minWidth - (y2 - y1) / 2))
    y2 = Math.round(y2 + (minWidth - (y2 - y1) / 2))
  }
  return { y1, y2 }
}

export function getVisibleXCoordinates ({ canvas, feature, scale, minWidth = 4 }) {
  let x1 = Math.round((Math.max(0, feature.start - canvas.start)) * scale)
  let x2 = Math.round((Math.min(canvas.end, feature.end - canvas.start)) * scale)
  if (x2 - x1 < minWidth) {
    x1 = Math.round(x1 - (minWidth - (x2 - x1) / 2))
    x2 = Math.round(x2 + (minWidth - (x2 - x1) / 2))
  }
  return { x1, x2 }
}

// Check if two geometries are overlapping
// each input is an object with start/ end coordinates
// f          >----------------<
// s   >---------<
export function isElementOverlapping (first, second) {
  if ((first.start > second.start && first.start < second.end) || //
       (first.end > second.start && first.end < second.end) ||
       (second.start > first.start && second.start < first.end) ||
       (second.end > first.start && second.end < first.end)) {
    return true
  }
  return false
}

// check if point is within an element
export function isWithinElementBbox ({ element, point }) {
  return (element.x1 < point.x && point.x < element.x2) && (element.y1 < point.y && point.y < element.y2)
}
