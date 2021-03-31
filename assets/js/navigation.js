import { get } from './fetch.js'
import { CHROMOSOMES } from './constants.js'

function cacheChromSizes (hgType = '38') {
  const cache = {}
  return async hgType => {
    if (!cache[hgType]) {
      const result = await get('get-overview-chrom-dim',
        {
          hg_type: hgType,
          x_pos: 1,
          y_pos: 1,
          plot_width: 1
        })
      const sizes = {}
      for (const chrom in result.chrom_dims) {
        sizes[chrom] = result.chrom_dims[chrom].size
      }
      cache[hgType] = sizes
    }
    return cache[hgType]
  }
}

function redrawEvent (region, exclude = [], force) {
  return new CustomEvent(
    'draw', { detail: { region: region, exclude: exclude, force: force } }
  )
}

function drawEventManager ({ target, throttleTime }) {
  const tracks = target.querySelectorAll('.track-container')
  let lastEventTime = 0
  return (event) => {
    const now = Date.now()
    console.log(`Test event times ${lastEventTime} ? ${now}, diff: ${now - lastEventTime}`)
    if (throttleTime < Date.now() - lastEventTime ||
         event.detail.force
    ) {
      console.log('===> fire event')
      lastEventTime = Date.now()
      for (const track of tracks) {
        if (!event.detail.exclude.includes(track.id)) {
          console.log('redirected event to ', target)
          track.dispatchEvent(redrawEvent(event.detail.region))
        }
      }
    }
  }
}

export function setupDrawEventManager ({ target, throttleTime = 20 }) {
  const manager = drawEventManager({ target, throttleTime })
  target.addEventListener('draw', (event) => {
    manager(event)
  })
}

function updateInputField ({ chrom, start, end }) {
  const field = document.getElementById('region-field')
  field.value = `${chrom}:${start}-${end}`
  field.placeholder = field.value
  field.blur()
}

export function readInputField () {
  const field = document.getElementById('region-field')
  return parseRegionDesignation(field.value)
}

export async function limitRegionToChromosome ({ chrom, start, end, hgType = '38' }) {
  // assert that start/stop are within start and end of chromosome
  const sizes = await chromSizes(hgType)
  start = start === null ? 1 : start
  end = end === null ? sizes[chrom] : end
  //  ensure the window size stay the same
  const windowSize = end - start
  let updStart, updEnd
  if (start < 1) {
    updStart = 1
    updEnd = windowSize
  } else if (end > sizes[chrom]) {
    updStart = sizes[chrom] - windowSize
    updEnd = sizes[chrom]
  } else {
    updStart = start
    updEnd = end
  }
  return { chrom: chrom, start: Math.round(updStart), end: Math.round(updEnd) }
}

export async function drawTrack ({
  chrom, start, end, hgType = '38',
  exclude = [], force = false
}) {
  // update input field
  const region = await limitRegionToChromosome({ chrom, start, end })
  updateInputField({ ...region })
  const trackContainer = document.getElementById('visualization-container')
  trackContainer.dispatchEvent(
    redrawEvent(region, exclude, force)
  )
  // make overview update its region marking
  document.getElementById('overview-container').dispatchEvent(
    new CustomEvent('mark-region', { detail: { region: region } })
  )
}

// If query is a regionString draw the relevant region
// If input is a chromosome display entire chromosome
// Else query api for genes with that name and draw that region
export function queryRegionOrGene (query, hgType = 38) {
  if (query.includes(':')) {
    drawTrack(parseRegionDesignation(query))
  } else if (CHROMOSOMES.includes(query)) {
    drawTrack({ chrom: query, start: 1, end: null })
  } else {
    get('search-annotation', { query: query, hg_type: hgType })
      .then(result => {
        if (result.status === 200) {
          drawTrack({
            chrom: result.chromosome,
            start: result.start_pos,
            end: result.end_pos
          })
        }
      })
  }
}

// parse chromosomal region designation string
// return chromosome, start and end position
// eg 1:12-220 --> 1, 12 220
// 1: --> 1, null, null
// 1 --> 1, null, null
export function parseRegionDesignation (regionString) {
  if (regionString.includes(':')) {
    const [chromosome, position] = regionString.split(':')
    // verify chromosome
    if (!CHROMOSOMES.includes(chromosome)) {
      throw new Error(`${chromosome} is not a valid chromosome`)
    }
    let [start, end] = position.split('-')
    start = parseInt(start)
    end = parseInt(end)
    return { chrom: chromosome, start: start, end: end }
  }
}

export function readInput () {
  const inputField = document.getElementById('region-field')
  return parseRegionDesignation(inputField.value)
}

// goto the next chromosome
export function nextChromosome () {
  const position = readInput()
  const chrom = CHROMOSOMES[CHROMOSOMES.indexOf(position.chrom) - 1]
  drawTrack({ chrom: chrom, start: 1, end: null })
}

// goto the previous chromosome
export function previousChromosome () {
  const position = readInput()
  const chrom = CHROMOSOMES[CHROMOSOMES.indexOf(position.chrom) + 1]
  drawTrack({ chrom: chrom, start: 1, end: null })
}

// Pan whole canvas and tracks to the left
export function panTracks (direction = 'left') {
  const pos = readInput()
  let distance = Math.floor(0.1 * (pos.end - pos.start))
  // Don't allow negative values
  distance = (pos.start < distance) ? distance + (pos.start - distance) : distance
  // todo keep distance constant
  if (direction === 'left') {
    pos.start -= distance
    pos.end -= distance
  } else {
    pos.start += distance
    pos.end += distance
  }
  drawTrack({ chrom: pos.chrom, start: pos.start, end: pos.end })
}

// Handle zoom in button click
export function zoomIn () {
  const pos = readInput()
  const factor = Math.floor((pos.end - pos.start) * 0.2)
  pos.start += factor
  pos.end -= factor
  drawTrack({ chrom: pos.chrom, start: pos.start, end: pos.end })
}

// Handle zoom out button click
export function zoomOut () {
  const pos = readInput()
  const factor = Math.floor((pos.end - pos.start) / 3)
  pos.start = (pos.start - factor) < 1 ? 1 : pos.start - factor
  pos.end += factor
  drawTrack({ chrom: pos.chrom, start: pos.start, end: pos.end })
}

// Dispatch dispatch an event to draw a given region
// Redraw events can be limited to certain tracks or include all tracks
class KeyLogger {
  // Records keypress combinations
  constructor (bufferSize = 10) {
    // Setup variables
    this.bufferSize = bufferSize
    this.lastKeyTime = Date.now()
    this.heldKeys = {} // store held keys
    this.keyBuffer = [] // store recent keys
    //  Setup event listending functions
    document.addEventListener('keydown', event => {
      // store event
      const eventData = {
        key: event.key,
        target: window.event.target.nodeName,
        time: Date.now()
      }
      const keyEvent = new CustomEvent('keyevent', { detail: eventData })
      this.heldKeys[event.key] = true // recored pressed keys
      this.keyBuffer.push(eventData)
      // empty buffer
      while (this.keyBuffer.length > this.bufferSize) { this.keyBuffer.shift() }
      document.dispatchEvent(keyEvent) // event information
    })
    document.addEventListener('keyup', event => {
      delete this.heldKeys[event.key]
    })
  }

  recentKeys (timeWindow) {
    // get keys pressed within a window of time.
    const currentTime = Date.now()
    return this.keyBuffer.filter(keyEvent =>
      timeWindow > currentTime - keyEvent.time)
  }

  lastKeypressTime () {
    return this.keyBuffer[this.keyBuffer.length - 1] - Date.now()
  }
}

const chromSizes = cacheChromSizes()
export const keyLogger = new KeyLogger()

// Setup handling of keydown events
const keystrokeDelay = 2000
document.addEventListener('keyevent', event => {
  const key = event.detail.key

  // dont act on key presses in input fields
  const excludeFileds = ['input', 'select', 'textarea']
  if (!excludeFileds.includes(event.detail.target.toLowerCase())) {
    if (key === 'Enter') {
      // Enter was pressed, process previous key presses.
      const recentKeys = keyLogger.recentKeys(keystrokeDelay)
      recentKeys.pop() // skip Enter key
      const lastKey = recentKeys[recentKeys.length - 1]
      const numKeys = parseInt((recentKeys
        .slice(lastKey.length - 2)
        .filter(val => parseInt(val.key))
        .map(val => val.key)
        .join('')))
      // process keys
      if (lastKey.key === 'x' || lastKey.key === 'y') {
        drawTrack({ region: lastKey.key })
      } else if (numKeys && numKeys > 0 < 23) {
        drawTrack({ region: numKeys })
      } else {
        return
      }
    }
    switch (key) {
      case 'ArrowLeft':
        nextChromosome()
        break
      case 'ArrowRight':
        previousChromosome()
        break
      case 'a':
        panTracks('left')
        break
      case 'd':
        panTracks('right')
        break
      case 'ArrowUp':
      case 'w':
      case '+':
        zoomIn()
        break
      case 'ArrowDown':
      case 's':
      case '-':
        zoomOut()
        break
      default:
    }
  }
})
