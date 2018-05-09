// Copyright 2013 Mark Cavage, Inc.  All rights reserved.

var dgram = require('dgram');
var util = require('util');

var assert = require('assert-plus');

var BaseStream = require('./base');

function UDPStream (opts) {
  assert.object(opts, 'options');
  assert.optionalString(opts.host, 'options.host');
  assert.optionalFinite(opts.port, 'options.port');

  BaseStream.call(this, opts);

  this.host = opts.host || '127.0.0.1';
  this.port = opts.port || 514;

  this.socket = dgram.createSocket('udp4');
  this.socket.on('close', this.emit.bind(this, 'close'));
  this.socket.on('error', this.emit.bind(this, 'error'));

  this._pending = 0;
}
util.inherits(UDPStream, BaseStream);
module.exports = UDPStream;

UDPStream.prototype.close = function close () {
  this.writable = false;

  this.socket.unref();
  if (this._pending === 0) {
    this.socket.close();
  } else {
    setTimeout(this.close.bind(this), 10);
  }
};

UDPStream.prototype._send = function _send (msg) {
  var buffer = Buffer.from(msg, 'utf-8');
  var socket = this.socket;
  var self = this;

  this._pending++;
  socket.send(buffer, 0, buffer.length, this.port, this.host, function (err) {
    if (err) {
      self.emit('error', err);
    }

    self._pending--;
  });
};
