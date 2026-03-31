'use strict';
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { resetStorage } = require('./_setup');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

// sync.js 로드를 위한 전역 스텁
global._isFinishing = false;
global.autoSaveSession = function() {};
global.showSyncFailBanner = function() {};

const syncCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'sync.js'), 'utf-8');
vm.runInThisContext(syncCode, { filename: 'sync.js' });

describe('gym sendBeacon 페이로드 보호', function() {

  beforeEach(function() {
    resetStorage();
    window._beaconFlushed = false;
    global._currentSession = null;
    global._isFinishing = false;
  });

  it('7-1: 정상 페이로드 — 64KB 이하면 sendBeacon 호출', function() {
    let beaconCalled = false;
    let beaconPayload = '';
    global.navigator.sendBeacon = function(url, body) {
      beaconCalled = true;
      beaconPayload = body;
    };

    S(K.sessions, [{ id: 'test1', date: '2026-03-31', exercises: [], tags: ['chest'], totalVolume: 1000, startTime: Date.now(), endTime: Date.now() }]);
    localStorage.setItem('wk_id_token', 'test-token');

    _flushBeforeUnload();

    assert.ok(beaconCalled, 'sendBeacon이 호출되어야 함');
    assert.ok(beaconPayload.length <= 65536, '페이로드 64KB 이하');
  });

  it('7-2: 초과 페이로드 — 64KB 초과면 sendBeacon 미호출', function() {
    let beaconCalled = false;
    global.navigator.sendBeacon = function() { beaconCalled = true; };

    // 대량 세션 데이터 생성
    var bigSessions = [];
    for (var i = 0; i < 500; i++) {
      bigSessions.push({
        id: 'sess_' + i,
        date: '2026-03-31',
        exercises: [{ exerciseId: 'flat_bench', sets: new Array(50).fill({ weight: 100, reps: 10, done: true }) }],
        tags: ['chest'],
        totalVolume: 50000,
        startTime: Date.now(),
        endTime: Date.now(),
        notes: 'x'.repeat(100)
      });
    }
    S(K.sessions, bigSessions);
    localStorage.setItem('wk_id_token', 'test-token');

    _flushBeforeUnload();

    assert.ok(!beaconCalled, '64KB 초과 시 sendBeacon 미호출');
  });

  it('7-3: 토큰 없으면 sendBeacon 미호출', function() {
    let beaconCalled = false;
    global.navigator.sendBeacon = function() { beaconCalled = true; };

    S(K.sessions, [{ id: 'test1', date: '2026-03-31', exercises: [], tags: ['chest'], totalVolume: 1000, startTime: Date.now(), endTime: Date.now() }]);
    // 토큰 미설정

    _flushBeforeUnload();

    assert.ok(!beaconCalled, '토큰 없으면 sendBeacon 미호출');
  });

  it('7-4: 세션 없으면 sendBeacon 미호출', function() {
    let beaconCalled = false;
    global.navigator.sendBeacon = function() { beaconCalled = true; };

    localStorage.setItem('wk_id_token', 'test-token');
    // 세션 없음

    _flushBeforeUnload();

    assert.ok(!beaconCalled, '세션 없으면 sendBeacon 미호출');
  });

  it('7-5: 중복 호출 방어 — 두 번째 호출은 무시', function() {
    let callCount = 0;
    global.navigator.sendBeacon = function() { callCount++; };

    S(K.sessions, [{ id: 'test1', date: '2026-03-31', exercises: [], tags: ['chest'], totalVolume: 1000, startTime: Date.now(), endTime: Date.now() }]);
    localStorage.setItem('wk_id_token', 'test-token');

    _flushBeforeUnload();
    _flushBeforeUnload();

    assert.equal(callCount, 1, '두 번째 호출은 _beaconFlushed로 차단');
  });
});
