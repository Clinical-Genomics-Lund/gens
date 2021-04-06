import { parseRegionDesignation, limitRegionToChromosome, readInputField } from './navigation.js'
import * as helper from './helper.js'

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

describe('test limitRegionToChromosome ', () => {
  // setup mocks
  const mockRes = {1: 5000, 2: 10000}

  test('test position within chromosome', () => {
    const chromSizeMock = jest.spyOn(helper, 'chromSizes')
          .mockReturnValueOnce(mockRes)
          .mockName('chromSizes')

    limitRegionToChromosome({chrom: 1, start: 1000, end: 2000})
      .then( region => {
        expect(region).toEqual({chrom: 1, start: 1000, end: 2000})
    })
    expect(chromSizeMock.mock.calls.length).toBe(1)  // assert mock works
  })

  test('test end pos outside chromosome', () => {
    const chromSizeMock = jest.spyOn(helper, 'chromSizes')
          .mockReturnValueOnce(mockRes)
          .mockName('chromSizes')

    limitRegionToChromosome({chrom: 1, start: 4000, end: 6000})
      .then( region => {
        expect(region).toEqual({chrom: 1, start: 3000, end: 5000})
      })
  })

  test('test start pos outside chromosome', () => {
    const chromSizeMock = jest.spyOn(helper, 'chromSizes')
          .mockReturnValueOnce(mockRes)
          .mockName('chromSizes')

    limitRegionToChromosome({chrom: 1, start: -1000, end: 2000})
      .then( region => {
        expect(region).toEqual({chrom: 1, start: 1, end: 3000})
      })
  })


  test('test start pos is null', () => {
    const chromSizeMock = jest.spyOn(helper, 'chromSizes')
          .mockReturnValueOnce(mockRes)
          .mockName('chromSizes')

    limitRegionToChromosome({chrom: 1, start: null, end: 2000})
      .then( region => {
        expect(region).toEqual({chrom: 1, start: 1, end: 2000})
      })
  })

  test('test end pos is null', () => {
    const chromSizeMock = jest.spyOn(helper, 'chromSizes')
          .mockReturnValueOnce(mockRes)
          .mockName('chromSizes')

    limitRegionToChromosome({chrom: 1, start: 1000, end: null})
      .then( region => {
        expect(region).toEqual({chrom: 1, start: 1000, end: 5000})
      })
  })

  test('test start and end pos is outsize chrom', () => {
    const chromSizeMock = jest.spyOn(helper, 'chromSizes')
          .mockReturnValueOnce(mockRes)
          .mockName('chromSizes')

    limitRegionToChromosome({chrom: 1, start: -2000, end: 10000})
      .then( region => {
        expect(region).toEqual({chrom: 1, start: 1, end: 5000})
      })
  })

  test('test if start and end are retained', () => {
    const chromSizeMock = jest.spyOn(helper, 'chromSizes')
          .mockReturnValueOnce(mockRes)
          .mockName('chromSizes')

    limitRegionToChromosome({chrom: 1, start: 1, end: 5000})
      .then( region => {
        expect(region).toEqual({chrom: 1, start: 1, end: 5000})
      })
  })
})

test('test readInputField', () => {
  document.body.innerHTML = `
<body><input id='region-field' type='text' value='1:100-1000'></body>`
  const region = readInputField()
  expect(region).toEqual({chrom: '1', start: 100, end: 1000})
})
