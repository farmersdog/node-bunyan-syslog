bunyan-syslog is a stream for [bunyan](https://github.com/trentm/node-bunyan)
that consumes `raw` records from bunyan and sends them to a remote syslog server.

# Installation

    npm install -S @farmersdog/bunyan-syslog

# About

This fork is compliant with [RFC 5424](https://tools.ietf.org/html/rfc5424). It
supports Structured Data component in messages as well as TLS over TCP.

Local syslog bindings have been removed.

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
      data: '[structured data]'
      facility: bsyslog.local0,
      host: '192.168.0.1',
      port: 514
    })
  }]
});

log.debug({ foo: 'bar' }, 'hello %s', 'world');
```

That's pretty much it. You create a syslog stream, and point it at a syslog
server (UDP by default; you can use TCP by setting `type: tcp` in the
constructor).

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
