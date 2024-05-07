import { objectToQueryString } from './fetch.js'

describe('Test objectToQueryString', () => {
  test('test objectToQueryString single args', () => {
    const paramString = objectToQueryString({region: '1:1-10'})
    expect(paramString).toBe('region=1:1-10')
  })

  test('test objectToQueryString multiple args', () => {
    const paramString = objectToQueryString({region: '1:1-10', page: 1})
    expect(paramString).toBe('region=1:1-10&page=1')
  })

  test('test objectToQueryString multiple args multiple types', () => {
    const paramString = objectToQueryString(
      {region: '1:1-10', page: 1, print: true}
    )
    expect(paramString).toBe('region=1:1-10&page=1&print=true')
  })
})
