// Test tracks
import { isElementOverlapping, isWithinElementBbox, calculateOffscreenWindowPos } from './base.js'
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


// test if point is within element
describe('Test if point is within element', () => {
  const element = {x1: 10, x2: 90, y1: -10, y2: 10}
  test('test point within element bbox, xy', {
    expect(isWithinElementBbox({element, point: {x: 20, y: 5}})).toBeTruthy()
  })
  test('test point is outside element bbox', {
    expect(isWithinElementBbox({element, point: {x: 20, y: 5}})).toBeFalsy()
  })
  test('test point is on element bbox edge', {
    expect(isWithinElementBbox({element, point: {x: 10, y: 10}})).toBeTruthy()
    expect(isWithinElementBbox({element, point: {x: 50, y: 10}})).toBeTruthy()
  })
})
