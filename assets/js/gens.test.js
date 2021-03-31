// Test functions for drawing the genecanvas
import { copyPermalink } from './gens.js'

test('Test copyPermalink', () => {
  // setup mocks
  document.execCommand = jest.fn()
  delete window.location
  window.location = new URL('https://www.example.com?foo=bar&doo=moo')
  copyPermalink('38', '1:10-100')
  expect(document.execCommand).toHaveBeenCalledWith('copy')
})
