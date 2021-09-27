// Test tracks
import { calculateOffscreenWindowPos } from './base.js'
import "regenerator-runtime/runtime";


// test that offscreen window position
describe('Test calculateOffscreenWindowPos', () => {
  test('test no padding', () => {
    const region = calculateOffscreenWindowPos({start: 100, end: 200, multiplier: 1})
    expect(region).toEqual({start: 100, end: 200})
  })
  test('test padding to region', () => {
    const region = calculateOffscreenWindowPos({start: 100, end: 200, multiplier: 2})
    expect(region).toEqual({start: 50, end: 250})
  })
})
