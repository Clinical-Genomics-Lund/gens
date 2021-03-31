import { parseRegionDesignation } from './navigation.js'

// Test Track class
describe('Test parseRegionDesignation', () => {
  test('Parse <chromosome>:<start>-<end>', () => {
    let region = parseRegionDesignation('12:11-100')
    expect(region).toEqual({chrom: '12', start: 11, end: 100})

    region = parseRegionDesignation('X:11-100')
    expect(region).toEqual({chrom: 'X', start: 11, end: 100})
  })

  test('Parse <chromosome>:<start>-None', () => {
    const region = parseRegionDesignation('12:11-None')
    expect(region).toEqual({chrom: '12', start: 11, end: NaN})
  })

  test('Parse <chromosome>:<start>', () => {
    const region = parseRegionDesignation('12:11')
    expect(region).toEqual({chrom: '12', start: 11, end: NaN})
  })

  test('Parse <chromosome>:', () => {
    const region = parseRegionDesignation('12:')
    expect(region).toEqual({chrom: '12', start: NaN, end: NaN})
  })

  test('Input only the chromosome returns null', () => {
    const region = parseRegionDesignation('12')
    expect(region).toBeFalsy()
  })

  test('Invalid chromosome throws an error', () => {
    expect(() => parseRegionDesignation('30:')).toThrow()
    expect(() => parseRegionDesignation('Z:')).toThrow()
  })
})
