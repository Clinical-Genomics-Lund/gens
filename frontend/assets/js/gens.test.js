// Test functions for drawing the genecanvas
import { copyPermalink } from './gens.js'

test('Test copyPermalink', () => {
  // setup mocks
  document.execCommand = jest.fn()
  delete window.location
  const inputElem = document.createElement('input')
  document.createElement = jest.fn().mockReturnValueOnce(inputElem)
  delete window.createElement
  window.location = new URL('https://www.example.com/sampleId?foo=bar&doo=moo')
  // run function
  copyPermalink('38', '1:10-100')
  // expect copy to clipboard has been called
  expect(document.execCommand).toHaveBeenCalledWith('copy')
  // assert the content copied
  expect(inputElem.value).toEqual('www.example.com/sampleId?genome_build=38&region=1:10-100')
})
