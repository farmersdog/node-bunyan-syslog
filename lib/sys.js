// Copyright 2013 Mark Cavage, Inc.  All rights reserved.

var os = require('os');
var Stream = require('stream').Stream;
var util = require('util');

var assert = require('assert-plus');

var binding = require('../build/Release/syslog');

var HOSTNAME = os.hostname();

// Harcoded from https://github.com/trentm/node-bunyan so this module
// can have minimal dependencies
var bunyan = {
  FATAL: 60,
  ERROR: 50,
  WARN: 40,
  INFO: 30,
  DEBUG: 20,
  TRACE: 10,

  safeCycles: function safeCycles () {
    var seen = [];
    function bunyanCycles (k, v) {
      if (!v || typeof (v) !== 'object') {
        return (v);
      }
      if (seen.indexOf(v) !== -1) {
        return ('[Circular]');
      }
      seen.push(v);
      return (v);
    }

    return (bunyanCycles);
  }
};

// Syslog Levels
var LOG_EMERG = 0;
var LOG_ERR = 3;
var LOG_WARNING = 4;
var LOG_INFO = 6;
var LOG_DEBUG = 7;

// Translates a Bunyan level into a syslog level
function level (l) {
  var sysl;

  switch (l) {
    case bunyan.FATAL:
      sysl = LOG_EMERG;
      break;

    case bunyan.ERROR:
      sysl = LOG_ERR;
      break;

    case bunyan.WARN:
      sysl = LOG_WARNING;
      break;

    case bunyan.INFO:
      sysl = LOG_INFO;
      break;

    default:
      sysl = LOG_DEBUG;
      break;
  }

  return (sysl);
}

function time (t) {
  return (new Date(t).toJSON());
}

function SyslogStream (opts) {
  assert.object(opts, 'options');
  assert.optionalNumber(opts.facility, 'options.facility');
  assert.optionalString(opts.name, 'options.name');
  assert.optionalString(opts.data, 'options.data');

  Stream.call(this);

  this.facility = opts.facility || 1;
  this.name = opts.name || process.title || process.argv[0];
  if (opts.data) {
    this.data = '[' + opts.data + ']';
  } else {
    this.data = '-';
  }
  this.writable = true;

  if (this.constructor.name === 'SyslogStream') {
    binding.openlog(this.name, binding.LOG_CONS, 0);
    process.nextTick(this.emit.bind(this, 'connect'));
  }
}
util.inherits(SyslogStream, Stream);
module.exports = SyslogStream;

// Overriden by TCP/UDP
SyslogStream.prototype.close = function close () {
  binding.closelog();
};

SyslogStream.prototype.destroy = function destroy () {
  this.writable = false;
  this.close();
};

SyslogStream.prototype.end = function end () {
  if (arguments.length > 0) {
    this.write.apply(this, Array.prototype.slice.call(arguments));
  }

  this.writable = false;
  this.close();
};

SyslogStream.prototype.write = function write (rawMessage) {
  if (!this.writable) {
    throw new Error('SyslogStream has been ended already');
  }

  var hostname = HOSTNAME;
  var messageVersion = 1;
  var messageLevel;
  var messageId = '-';
  var message;
  var messageTime = time();

  if (Buffer.isBuffer(rawMessage)) {
    // expensive, but not unexpected
    message = rawMessage.toString('utf8');
  } else if (typeof (rawMessage) === 'object') {
    message = JSON.stringify(rawMessage, bunyan.safeCycles());
    hostname = rawMessage.hostname || hostname;
    messageLevel = level(rawMessage.level);
    messageTime = time(rawMessage.time) || messageTime;
    messageId = rawMessage.id || messageId;
    messageVersion = rawMessage.version || messageVersion;
  } else if (typeof (rawMessage) === 'string') {
    message = rawMessage;
  } else {
    throw new TypeError('record (Object) required');
  }

  messageLevel = (this.facility * 8) + (messageLevel !== undefined ? messageLevel : level(bunyan.INFO));

  if (this._send) {
    // Format defined in https://tools.ietf.org/html/rfc5424
    var header = `<${messageLevel}>${messageVersion} ${messageTime} ${hostname} ${this.name} ${process.pid} ${messageId} ${this.data}`;

    this._send(header + ' ' + message);
  } else {
    binding.syslog(messageLevel, message);
  }
};

SyslogStream.prototype.toString = function toString () {
  var str = '[object SyslogStream<facility=' + this.facility;
  if (this.host) {
    str += ', host=' + this.host;
  }
  if (this.port) {
    str += ', port=' + this.port;
  }
  if (!/^Sys/.test(this.constructor.name)) {
    str += ', proto=' + (/UDP/.test(this.constructor.name) ? 'udp' : 'tcp');
  }
  str += '>]';

  return (str);
};
