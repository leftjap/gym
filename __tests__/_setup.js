/**
 * gym 테스트 환경 셋업
 * - localStorage mock
 * - 최소 DOM/window mock
 * - storage.js, data.js 로드
 */

// ── localStorage mock ──
const _store = {};
global.localStorage = {
  getItem(k) { return _store[k] !== undefined ? _store[k] : null; },
  setItem(k, v) { _store[k] = String(v); },
  removeItem(k) { delete _store[k]; },
  clear() { for (const k in _store) delete _store[k]; }
};

// ── 최소 window/document mock ──
global.window = global.window || {};
global.window._quotaWarned = false;
global.document = global.document || { getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; } };
global.navigator = global.navigator || { onLine: true };
global.alert = function() {};
global.console = global.console || { log() {}, error() {}, warn() {} };
global.fetch = function() { return Promise.resolve({ json() { return Promise.resolve({}); } }); };

// ── sync 함수 스텁 (data.js의 deleteSession 등에서 호출) ──
global.syncToServer = function() {};
global.saveLastSyncTime = function() {};
global.showSyncToast = function() {};

// ── _currentSession 전역 (workout.js 참조) ──
global._currentSession = null;

// ── vm으로 파일 로드 (keep과 동일 패턴) ──
const fs = require('fs');
const vm = require('vm');
const path = require('path');

function loadGymFile(filename) {
  const filePath = path.join(__dirname, '..', filename);
  const code = fs.readFileSync(filePath, 'utf-8');
  vm.runInThisContext(code, { filename: filePath });
}

loadGymFile('js/storage.js');
loadGymFile('js/data.js');

// ── 리셋 헬퍼 ──
function resetStorage() {
  for (const k in _store) delete _store[k];
}

module.exports = { resetStorage };
