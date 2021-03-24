// Test tracks
import { isElementOverlapping, Track } from './track.js'
import "regenerator-runtime/runtime";

// Test overlapping elements
describe('Test isElementOverlapping', () => {
  test('first is within second', () => {
    const first = {start: 100, end: 600}, second = {start: 50, end: 1000}
    const resp = isElementOverlapping(first, second)
    expect(resp).toBeTruthy()
  })
  test('first end is overapping second', () => {
    const first = {start: 100, end: 600}, second = {start: 500, end: 1000}
    const resp = isElementOverlapping(first, second)
    expect(resp).toBeTruthy()
  })
  test('first start is overapping second', () => {
    const first = {start: 100, end: 600}, second = {start: 20, end: 120}
    const resp = isElementOverlapping(first, second)
    expect(resp).toBeTruthy()
  })
  test('first start and second does not overlapp', () => {
    const first = {start: 100, end: 200}, second = {start: 500, end: 900}
    const resp = isElementOverlapping(first, second)
    expect(resp).not.toBeTruthy()
  })
})

// Test Track class
describe('Test Track.parseRegionDesignation', () => {
  test('Parse <chromosome>:<start>-<end>', () => {
    let region = new Track().parseRegionDesignation('12:11-100')
    expect(region).toEqual(['12', 11,100])

    region = new Track().parseRegionDesignation('X:11-100')
    expect(region).toEqual(['X', 11,100])
  })

  test('Parse <chromosome>:<start>-None', () => {
    const region = new Track().parseRegionDesignation('12:11-None')
    expect(region).toEqual(['12', 11, NaN])
  })

  test('Parse <chromosome>:<start>', () => {
    const region = new Track().parseRegionDesignation('12:11')
    expect(region).toEqual(['12', 11, NaN])
  })

  test('Parse <chromosome>:', () => {
    const region = new Track().parseRegionDesignation('12:')
    expect(region).toEqual(['12', NaN, NaN])
  })

  test('Input only the chromosome returns null', () => {
    const region = new Track().parseRegionDesignation('12')
    expect(region).toBeFalsy()
  })

  test('Invalid chromosome throws an error', () => {
    expect(() => new Track().parseRegionDesignation('30:')).toThrow()
    expect(() => new Track().parseRegionDesignation('Z:')).toThrow()
  })
})
