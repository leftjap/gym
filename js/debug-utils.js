// PROJECT: gym
// debug-utils.js — 인앱 로그 버퍼 + 클립보드 복사 유틸리티
'use strict';

window.DebugLog = (function() {
  var MAX_BUFFER = 100;
  var _buffer = [];

  function _timestamp() {
    return new Date().toISOString().slice(11, 23);
  }

  function log(level, msg, data) {
    var entry = { t: _timestamp(), l: level, m: msg };
    if (data !== undefined) {
      try {
        entry.d = typeof data === 'string' ? data : JSON.stringify(data).slice(0, 500);
      } catch (e) {
        entry.d = '[unserializable]';
      }
    }
    _buffer.push(entry);
    if (_buffer.length > MAX_BUFFER) _buffer.shift();
  }

  function info(msg, data)  { log('INFO', msg, data); }
  function warn(msg, data)  { log('WARN', msg, data); }
  function error(msg, data) { log('ERR', msg, data); }

  function format() {
    return _buffer.map(function(e) {
      var line = e.t + ' [' + e.l + '] ' + e.m;
      if (e.d) line += ' | ' + e.d;
      return line;
    }).join('\n');
  }

  async function copy() {
    var text = '=== Gym Debug Log ===\n'
      + 'Time: ' + new Date().toISOString() + '\n'
      + 'UA: ' + navigator.userAgent + '\n'
      + 'URL: ' + location.href + '\n'
      + '---\n'
      + format();
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    }
  }

  function getBuffer() { return _buffer.slice(); }

  return { info: info, warn: warn, error: error, copy: copy, format: format, getBuffer: getBuffer };
})();
