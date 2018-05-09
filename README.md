bunyan-syslog is a stream for [bunyan](https://github.com/trentm/node-bunyan)
that consumes `raw` records from bunyan and sends them to a remote syslog server.

# Installation

    npm install bunyan-syslog

# Usage

```javascript
var bunyan = require('bunyan');
var bsyslog = require('bunyan-syslog');

var log = bunyan.createLogger({
  name: 'foo',
  streams: [{
    level: 'debug',
    type: 'raw',
    stream: bsyslog.createBunyanStream({
      type: 'tcp',
      tls: true,
      facility: bsyslog.local0,
      host: '192.168.0.1',
      port: 514
    })
  }]
});

log.debug({foo: 'bar'}, 'hello %s', 'world');
```
That's pretty much it. You create a syslog stream, and point it at a syslog
server (UDP by default; you can use TCP by setting `type: tcp` in the
constructor).

Local syslog bindings have been removed.

Note you *must* pass `type: 'raw'` to bunyan in the top-level
stream object or this won't work.


## Mappings

This module maps bunyan levels to syslog levels as follows:

```
+--------+--------+
| Bunyan | Syslog |
+--------+--------+
| fatal  | emerg  |
+--------+--------+
| error  | error  |
+--------+--------+
| warn   | warn   |
+--------+--------+
| info   | info   |
+--------+--------+
| *      | debug  |
+--------+--------+
```

# License

MIT.
