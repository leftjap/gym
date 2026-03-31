/**
 * 영역 3: 동기화 병합 — Golden Path 테스트
 * syncFromServer의 세션 병합 로직을 순수 함수로 추출하여 검증
 */
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { resetStorage } = require('./_setup');

require('../js/storage');
require('../js/data');

/**
 * syncFromServer의 세션 병합 로직 재현 (sync.js에서 추출)
 * 실제 fetch 없이 로컬·서버 배열만으로 병합 결과 반환
 */
function mergeSessionsLogic(localSessions, serverSessions) {
  var localMap = {};
  for (var i = 0; i < localSessions.length; i++) {
    localMap[localSessions[i].id] = localSessions[i];
  }

  var merged = [];
  var usedIds = {};

  for (var j = 0; j < serverSessions.length; j++) {
    var ss = serverSessions[j];
    if (!ss.id) continue;
    var ls = localMap[ss.id];
    if (ls) {
      var sEnd = ss.endTime || 0;
      var lEnd = ls.endTime || 0;
      merged.push(sEnd > lEnd ? ss : ls);
    } else {
      // L-05: 빈/더미 세션 필터링
      if (ss.totalVolume > 0 || ss.durationMin > 0 || ss.totalCalories > 5) {
        merged.push(ss);
      }
    }
    usedIds[ss.id] = true;
  }

  for (var k = 0; k < localSessions.length; k++) {
    if (!usedIds[localSessions[k].id]) {
      merged.push(localSessions[k]);
    }
  }

  merged.sort(function(a, b) {
    var dc = (b.date || '').localeCompare(a.date || '');
    if (dc !== 0) return dc;
    return (b.startTime || 0) - (a.startTime || 0);
  });

  return merged;
}

/**
 * PR 병합 로직 재현 (sync.js syncFromServer에서 추출)
 */
function mergePRsLogic(localPrs, serverPrs) {
  var mergedPrs = {};
  var prKeys = Object.keys(localPrs);
  for (var pi = 0; pi < prKeys.length; pi++) {
    mergedPrs[prKeys[pi]] = localPrs[prKeys[pi]].slice();
  }
  var sPrKeys = Object.keys(serverPrs);
  for (var si = 0; si < sPrKeys.length; si++) {
    var exId = sPrKeys[si];
    if (!mergedPrs[exId]) {
      mergedPrs[exId] = serverPrs[exId];
    } else {
      var localArr = mergedPrs[exId];
      var serverArr = serverPrs[exId];
      if (Array.isArray(serverArr) && Array.isArray(localArr)) {
        var localSessIds = {};
        for (var li = 0; li < localArr.length; li++) {
          localSessIds[localArr[li].sessionId || ''] = true;
        }
        for (var sj = 0; sj < serverArr.length; sj++) {
          if (!localSessIds[serverArr[sj].sessionId || '']) {
            localArr.push(serverArr[sj]);
          }
        }
        mergedPrs[exId] = localArr;
      }
    }
  }
  return mergedPrs;
}

function makeSession(id, date, startTime, endTime, totalVolume, durationMin) {
  return {
    id: id, date: date, startTime: startTime, endTime: endTime || null,
    tags: ['chest'], exercises: [], totalVolume: totalVolume || 100,
    totalVolumeExWarmup: totalVolume || 100, totalCalories: 50, durationMin: durationMin || 30, memo: ''
  };
}

describe('영역 3: 동기화 병합 — 세션', function() {

  beforeEach(function() {
    resetStorage();
  });

  it('3-1 서버에만 있는 세션 → 로컬에 추가', function() {
    var local = [makeSession('L1', '2026-03-30', 1000, 2000, 100, 30)];
    var server = [
      makeSession('L1', '2026-03-30', 1000, 2000, 100, 30),
      makeSession('S1', '2026-03-31', 3000, 4000, 200, 45)
    ];
    var merged = mergeSessionsLogic(local, server);
    assert.equal(merged.length, 2);
    assert.ok(merged.some(function(s) { return s.id === 'S1'; }));
  });

  it('3-2 같은 ID, 서버 endTime 더 최근 → 서버 데이터 채택', function() {
    var local = [makeSession('X1', '2026-03-31', 1000, 2000, 100, 30)];
    var server = [makeSession('X1', '2026-03-31', 1000, 5000, 300, 60)];
    var merged = mergeSessionsLogic(local, server);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].endTime, 5000);
    assert.equal(merged[0].totalVolume, 300);
  });

  it('3-3 같은 ID, 로컬 endTime 더 최근 → 로컬 데이터 유지', function() {
    var local = [makeSession('X1', '2026-03-31', 1000, 9000, 500, 90)];
    var server = [makeSession('X1', '2026-03-31', 1000, 5000, 300, 60)];
    var merged = mergeSessionsLogic(local, server);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].endTime, 9000);
    assert.equal(merged[0].totalVolume, 500);
  });

  it('3-4 L-05: 서버 빈 세션(totalVolume=0, durationMin=0, calories≤5) 필터링', function() {
    var local = [];
    var dummySession = {
      id: 'DUMMY', date: '2026-03-31', startTime: 1000, endTime: 2000,
      tags: [], exercises: [], totalVolume: 0, totalVolumeExWarmup: 0,
      totalCalories: 0, durationMin: 0, memo: ''
    };
    var server = [dummySession];
    var merged = mergeSessionsLogic(local, server);
    assert.equal(merged.length, 0); // 빈 세션 필터링됨
  });

  it('3-5 로컬에만 있는 세션 → 보존', function() {
    var local = [makeSession('L1', '2026-03-31', 1000, 2000, 100, 30)];
    var server = [];
    var merged = mergeSessionsLogic(local, server);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].id, 'L1');
  });

  it('3-6 결과가 날짜 내림차순 정렬', function() {
    var local = [makeSession('A', '2026-03-29', 1000, 2000, 100, 30)];
    var server = [
      makeSession('B', '2026-03-31', 3000, 4000, 200, 45),
      makeSession('C', '2026-03-30', 5000, 6000, 150, 35)
    ];
    var merged = mergeSessionsLogic(local, server);
    assert.equal(merged[0].id, 'B');
    assert.equal(merged[1].id, 'C');
    assert.equal(merged[2].id, 'A');
  });
});

describe('영역 3: 동기화 병합 — PR', function() {

  it('3-7 서버에만 있는 종목 PR → 추가', function() {
    var local = { 'flat_bench': [{ weight: 60, reps: 5, estimated1RM: 70, sessionId: 's1' }] };
    var server = { 'barbell_squat': [{ weight: 100, reps: 5, estimated1RM: 117, sessionId: 's2' }] };
    var merged = mergePRsLogic(local, server);
    assert.ok(merged['flat_bench']);
    assert.ok(merged['barbell_squat']);
  });

  it('3-8 같은 종목, 서버에 추가 PR → sessionId 기준 중복 제거 후 병합', function() {
    var local = { 'flat_bench': [{ weight: 60, reps: 5, estimated1RM: 70, sessionId: 's1' }] };
    var server = { 'flat_bench': [
      { weight: 60, reps: 5, estimated1RM: 70, sessionId: 's1' },  // 중복
      { weight: 80, reps: 5, estimated1RM: 93, sessionId: 's3' }   // 새 PR
    ]};
    var merged = mergePRsLogic(local, server);
    assert.equal(merged['flat_bench'].length, 2); // s1 + s3
  });
});
