import { get } from './fetch.js'

function redrawEvent(region) {
  return new CustomEvent('draw', { detail: {region: region}})
}

export function setupDrawEventManager (target) {
  const tracks = target.querySelectorAll('.track-container')
  target.addEventListener('draw', (event) => {
    for ( const track of tracks ) {
      console.log('redirected event to ', target)
      track.dispatchEvent(redrawEvent(event.detail.region))
    }
  })
}

function cacheChromSizes(hgType='38') {
  let cache = {}
  return async hgType => {
    if (!cache[hgType]) {
      let result = await get('get-overview-chrom-dim',
                             {hg_type: hgType, x_pos: 1,
                              y_pos: 1, plot_width: 1})
      let sizes = {}
      for ( const chrom in result.chrom_dims ) {
        sizes[chrom] = result.chrom_dims[chrom].size
      }
      cache[hgType] = sizes
    }
    return cache[hgType]
  }
}

const chromSizes = cacheChromSizes()

export async function drawTrack({chrom, start, end, hgType = '38'}) {
  // assert that start/stop are within start and end of chromosome
  const sizes = await chromSizes(hgType)
  const updStart = start < 1 ? 1 : start
  const updEnd = end > sizes[chrom] ? sizes[chrom] : end
  const trackContainer = document.getElementById('visualization-container')
  trackContainer.dispatchEvent(redrawEvent(`${chrom}:${updStart}-${updEnd}`))
}
