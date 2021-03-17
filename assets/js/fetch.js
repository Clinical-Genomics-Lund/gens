// Fetch.js
// functions for making api requests to Gens

async function request (url, params, method = 'GET') {
  // options passed to hte fetch request
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  }

  // handle params
  if (params) {
    if (method === 'GET') {
      url += '?' + objectToQueryString(params)
    } else {
      options.body = JSON.stringify(params)
    }
  }
  // fetch returns a promise
  const response = await fetch(_apiHost + url, options)

  if (response.status !== 200) {
    return generateErrorResponse('The server responded with an unexpected status.')
  }
  const result = await response.json()

  // returns a single Promise object
  return result
}

// converts an object into a query string
// ex {region: 8:12-55} --> &region=8:12-55
export function objectToQueryString (obj) {
  return Object.keys(obj).map(key => key + '=' + obj[key]).join('&')
}

//  A generic error handler that just returns an object with status=error and message
function generateErrorResponse (message) {
  return new Error({
    status: 'error',
    message
  })
}

export function get (url, params) {
  return request(url, params)
}

export function create (url, params) {
  return request(url, params, 'POST')
}

export function update (url, params) {
  return request(url, params, 'PUT')
}

export function remove (url, params) {
  return request(url, params, 'DELETE')
}
