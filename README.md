# zipkin-instrumentation-wreck

Adds Zipkin tracing to the [Wreck](https://github.com/hapijs/wreck) library.

## Requirements
- Node 8
- Wreck 12

## Usage

```sh
npm install --save zipkin-instrumentation-wreck
```

```javascript
const { wrapWreck } = require('zipkin-instrumentation-wreck')

const Wreck = require('wreck')

const wreck = wrapWreck(Wreck, { tracer, serviceName, remoteServiceName })

await wreck.get(....)

await wreck.request(....)
```

