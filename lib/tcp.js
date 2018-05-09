// Copyright 2013 Mark Cavage, Inc.  All rights reserved.

var net = require('net');
var tls = require('tls');
var util = require('util');

var assert = require('assert-plus');

var BaseStream = require('./base');

var PROXY_EVENTS = [
  'connect',
  'data',
  'drain',
  'end',
  'timeout'
];

function createSocket (opts) {
  assert.object(opts, 'options');
  assert.string(opts.host, 'options.host');
  assert.finite(opts.port, 'options.port');
  assert.object(opts.proxy, 'options.proxy');
  assert.optionalBool(opts.tls, 'options.tls');

  var transport = opts.tls ? tls : net;
  var socket = transport.connect({
    host: opts.host,
    port: opts.port
  });

  PROXY_EVENTS.forEach(function (event) {
    socket.on(event, opts.proxy.emit.bind(opts.proxy, event));
  });

  return (socket);
}

function TCPStream (opts) {
  assert.object(opts, 'options');
  assert.optionalString(opts.host, 'options.host');
  assert.optionalFinite(opts.port, 'options.port');

  var self = this;

  BaseStream.call(this, opts);

  this.host = opts.host || '127.0.0.1';
  this.port = opts.port || 514;
  this.tls = opts.tls || false;

  this.queue = [];

  (function connect (event) {
    if (self.socket) {
      if (self.listeners(event).length > 1) {
        self.emit.apply(self, arguments);
        return;
      }

      PROXY_EVENTS.forEach(function (e) {
        self.socket.removeAllListeners(e);
      });
      self.socket.removeAllListeners('close');
      self.socket.removeAllListeners('error');
      if (self.socket.destroy) {
        self.socket.destroy();
      }
    }

    self.socket = createSocket({
      host: self.host,
      port: self.port,
      proxy: self,
      tls: self.tls
    });
    self.socket.on('close', setTimeout.bind(null, connect, 1000));
    self.socket.on('error', setTimeout.bind(null, connect, 1000));
    self.socket.once('connect', function () {
      self.queue.forEach(function (buf) {
        self.socket.write(buf);
      });
    });
  }());
}
util.inherits(TCPStream, BaseStream);
module.exports = TCPStream;

TCPStream.prototype.close = function close () {
  var self = this;

  this.writable = false;
  this.socket.end();
  this.socket.unref();

  PROXY_EVENTS.forEach(function (e) {
    self.socket.removeAllListeners(e);
  });
  self.socket.removeAllListeners('close');
  self.socket.removeAllListeners('error');
};

TCPStream.prototype._send = function _send (msg) {
  this.socket.write(Buffer.from(msg + '\n', 'utf-8'));
};
