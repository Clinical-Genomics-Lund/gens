// Various helper functions
import { get } from './fetch.js'

function cacheChromSizes (genomeBuild = '38') {
  const cache = {}
  return async genomeBuild => {
    if (!cache[genomeBuild]) {
      const result = await get('get-overview-chrom-dim',
        {
          genome_build: genomeBuild,
          x_pos: 1,
          y_pos: 1,
          plot_width: 1
        })
      const sizes = {}
      for (const chrom in result.chrom_dims) {
        sizes[chrom] = result.chrom_dims[chrom].size
      }
      cache[genomeBuild] = sizes
    }
    return cache[genomeBuild]
  }
}

export const chromSizes = cacheChromSizes()
