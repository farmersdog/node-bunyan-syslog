// Copyright 2013 Mark Cavage, Inc.  All rights reserved.

var net = require('net');
var bunyan = require('bunyan');
var test = require('tap').test;

var bsyslog = require('../lib');

var I = 0;
var LOG;
var STREAM;
var HOST = process.env.LOG_HOST;
var PORT = parseInt(process.env.TCP_LOG_PORT, 10) || 10514;
var SERVER;

test('setup', t => {
  if (!HOST) {
    SERVER = net.createServer(c => {
      c.on('data', data => (
        SERVER._messages = SERVER._messages.concat(data.toString().split('\n')))
      );
    });
    SERVER._messages = [];
    SERVER.listen(PORT);
  }
  t.end();
});

test('create a logger', function (t) {
  STREAM = bsyslog.createBunyanStream({
    host: HOST,
    port: PORT,
    facility: bsyslog.facility.local0,
    type: 'tcp'
  });
  t.ok(STREAM);
  console.error(STREAM.toString());
  STREAM.once('connect', t.end.bind(t));

  LOG = bunyan.createLogger({
    name: 'tcptest',
    streams: [{
      type: 'raw',
      level: 'trace',
      stream: STREAM
    }]
  });
  t.ok(LOG);
});

test('write a trace record', function (t) {
  LOG.trace({i: I++}, 'sample %s record', 'trace');
  t.end();
});

test('write a debug record', function (t) {
  LOG.debug({i: I++}, 'sample %s record', 'debug');
  t.end();
});

test('write a info record', function (t) {
  LOG.info({i: I++}, 'sample %s record', 'info');
  t.end();
});

test('write a warn record', function (t) {
  LOG.warn({i: I++}, 'sample %s record', 'warn');
  t.end();
});

test('write a error record', function (t) {
  LOG.error({i: I++}, 'sample %s record', 'error');
  t.end();
});

test('write a fatal record', function (t) {
  LOG.fatal({i: I++}, 'sample %s record', 'fatal');
  t.end();
});

test('teardown', function (t) {
  STREAM.close();
  SERVER.close(server => {
    // TODO better way to parse syslog messages
    var i = Math.max(...SERVER._messages
      .map(m => m.substr(m.indexOf('{'), m.length))
      .filter(Boolean)
      .map(m => JSON.parse(m))
      .map(m => m.i)
    );
    t.equals(i, --I);
    t.end();
  });
});
