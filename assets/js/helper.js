// Various helper functions
import { get } from './fetch.js'

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

export const chromSizes = cacheChromSizes()
