/**
 * 영역 1: 세션 CRUD — Golden Path 테스트
 */
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { resetStorage } = require('./_setup');

// ── storage.js & data.js 로드 (전역 함수 등록) ──
require('../js/storage');
require('../js/data');

describe('영역 1: 세션 CRUD', function() {

  beforeEach(function() {
    resetStorage();
  });

  it('1-1 saveSession → getSessions 에 포함', function() {
    const session = {
      id: 'test1', date: '2026-03-31', startTime: Date.now(),
      endTime: null, tags: ['chest'], exercises: [],
      totalVolume: 0, totalVolumeExWarmup: 0, totalCalories: 0, durationMin: 0, memo: ''
    };
    saveSession(session);
    const all = getSessions();
    assert.equal(all.length, 1);
    assert.equal(all[0].id, 'test1');
  });

  it('1-2 saveSession 중복 ID → 업데이트 (덮어쓰기)', function() {
    const s1 = { id: 's1', date: '2026-03-31', startTime: 1000, endTime: null, tags: ['chest'], exercises: [], totalVolume: 100, totalVolumeExWarmup: 100, totalCalories: 0, durationMin: 30, memo: '' };
    saveSession(s1);
    const s1Updated = Object.assign({}, s1, { totalVolume: 200 });
    saveSession(s1Updated);
    const all = getSessions();
    assert.equal(all.length, 1);
    assert.equal(all[0].totalVolume, 200);
  });

  it('1-3 세션 날짜 내림차순 정렬', function() {
    saveSession({ id: 'a', date: '2026-03-29', startTime: 1000, endTime: null, tags: [], exercises: [], totalVolume: 0, totalVolumeExWarmup: 0, totalCalories: 0, durationMin: 0, memo: '' });
    saveSession({ id: 'b', date: '2026-03-31', startTime: 2000, endTime: null, tags: [], exercises: [], totalVolume: 0, totalVolumeExWarmup: 0, totalCalories: 0, durationMin: 0, memo: '' });
    saveSession({ id: 'c', date: '2026-03-30', startTime: 3000, endTime: null, tags: [], exercises: [], totalVolume: 0, totalVolumeExWarmup: 0, totalCalories: 0, durationMin: 0, memo: '' });
    const all = getSessions();
    assert.equal(all[0].id, 'b'); // 3-31
    assert.equal(all[1].id, 'c'); // 3-30
    assert.equal(all[2].id, 'a'); // 3-29
  });

  it('1-4 getSession(id) → 단일 조회', function() {
    saveSession({ id: 'x1', date: '2026-03-31', startTime: 1000, endTime: null, tags: [], exercises: [], totalVolume: 0, totalVolumeExWarmup: 0, totalCalories: 0, durationMin: 0, memo: '' });
    const found = getSession('x1');
    assert.equal(found.id, 'x1');
    const notFound = getSession('nonexistent');
    assert.equal(notFound, undefined);
  });

  it('1-5 deleteSession → 해당 ID 제거', function() {
    saveSession({ id: 'd1', date: '2026-03-31', startTime: 1000, endTime: null, tags: [], exercises: [], totalVolume: 0, totalVolumeExWarmup: 0, totalCalories: 0, durationMin: 0, memo: '' });
    saveSession({ id: 'd2', date: '2026-03-30', startTime: 2000, endTime: null, tags: [], exercises: [], totalVolume: 0, totalVolumeExWarmup: 0, totalCalories: 0, durationMin: 0, memo: '' });
    deleteSession('d1');
    const all = getSessions();
    assert.equal(all.length, 1);
    assert.equal(all[0].id, 'd2');
  });

  it('1-6 빈 상태에서 getSessions → 빈 배열', function() {
    const all = getSessions();
    assert.ok(Array.isArray(all));
    assert.equal(all.length, 0);
  });
});
