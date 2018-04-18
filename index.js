'use strict'

const { Instrumentation } = require('zipkin')

const wrappedFunctions = ['request', 'get', 'post', 'put', 'delete', 'patch']

/**
 * Wraps the specified Wreck instance with HttpClient instrumentation
 */
function wrapWreck (wreck, { tracer, serviceName, remoteServiceName }) {
  const instrumentation = new Instrumentation.HttpClient({ tracer, serviceName, remoteServiceName })
  return new Proxy(wreck, {
    get: (target, name) => {
      const targetProperty = target[name]
      if (wrappedFunctions.indexOf(name) >= 0) {
        return function wreckFunctionWrapper () {
          const args = [...arguments]
          let method, uri, options, callback
          if (name === 'request') {
            [method, uri, options, callback] = args
            if (callback) {
              args.pop()
            }
          } else {
            [uri, options] = args
          }
          if (options) {
            args.pop()
          } else {
            options = {}
          }

          options = options || {}
          method = method || options.method || name
          return tracer.scoped(function traceScopedWreck () {
            const handleSuccess = response => instrumentation.recordResponse(traceId, `${response ? response.statusCode : ''}`)
            const handleError = err => instrumentation.recordError(traceId, err)
            let wrappedCallback
            if (callback) {
              wrappedCallback = function (err, response) {
                if (err) {
                  handleError(err)
                } else {
                  handleSuccess(response)
                }
                callback.apply(this, arguments)
              }
            }
            const traceId = tracer.id
            const wrappedOptions = instrumentation.recordRequest(options, uri, method)

            const result = targetProperty.apply(wreck, [...args, wrappedOptions, wrappedCallback])
            if (!callback) {
              if (result.then) {
                return result.then(response => {
                  handleSuccess(response)
                  return response
                })
                .catch(err => {
                  handleError(err)
                  throw err
                })
              } else {
                handleSuccess()
              }
            }
            return result
          })
        }
      }
      return targetProperty
    }
  })
}

module.exports = {
  wrapWreck
}
