import { isElementOverlapping, isWithinElementBbox, getVisibleXCoordinates, getVisibleYCoordinates } from './utils.js'

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

// test if point is within element
describe('Test if point is within element', () => {
  const element = {x1: 10, x2: 90, y1: -10, y2: 10}
  test('test point within element bbox, xy', () => {
    expect(isWithinElementBbox({element, point: {x: 20, y: 5}})).toBeTruthy()
  })
  test('test point is outside element bbox', () =>{
    expect(isWithinElementBbox({element, point: {x: 20, y: 15}})).toBeFalsy()
  })
  test('test point is on element bbox edge', () => {
    expect(isWithinElementBbox({element, point: {x: 10, y: 10}})).toBeFalsy()
    expect(isWithinElementBbox({element, point: {x: 50, y: 10}})).toBeFalsy()
  })
})

// test getVisibleYCoordinates function
describe('Test getVisibleYCoordinates', () => {
  test('test element higher than minHeight', () => {
    const element = {y1: 10, y2: 40}
    const resp = getVisibleYCoordinates({ element, minHeight: 4 })
    expect(resp).toEqual({ y1: 10, y2: 40 })
  })

  test('test element shorter than minHeight', () => {
    const element = {y1: 10, y2: 20}
    const resp = getVisibleYCoordinates({ element, minHeight: 20 })
    expect(resp).toEqual({ y1: 5, y2: 25 })
  })
})

// test getVisibleXCoordinates function
describe('Test getVisibleXCoordinates', () => {
  const canvas = {start: 100, end: 200}
  const scale = 0.1

  test('test feature inside visable canvas', () => {
    const feature = {start: 120, end: 150}
    const resp = getVisibleXCoordinates({ 
      canvas, feature, scale, minWidth: 1
    })
    expect(resp).toEqual({ x1: 2, x2: 5 })
  })

  test('test feature inside visable canvas, no scale', () => {
    const feature = {start: 120, end: 150}
    const resp = getVisibleXCoordinates({ 
      canvas, feature, scale: 1, minWidth: 1
    })
    expect(resp).toEqual({ x1: 20, x2: 50 })
  })

  test('test feature partly inside visable canvas, caped at begining', () => {
    const feature = {start: 90, end: 150}
    const resp = getVisibleXCoordinates({ 
      canvas, feature, scale: 1, minWidth: 1
    })
    expect(resp).toEqual({ x1: 0, x2: 50 })
  })

  test('test feature partly inside visable canvas, caped at end', () => {
    const feature = {start: 120, end: 600}
    const resp = getVisibleXCoordinates({ 
      canvas, feature, scale: 1, minWidth: 1
    })
    expect(resp).toEqual({ x1: 20, x2: 200 })
  })
})
