/**
 * 영역 2: PR 판정 — Golden Path 테스트
 */
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { resetStorage } = require('./_setup');

require('../js/storage');
require('../js/data');

describe('영역 2: PR 판정', function() {

  beforeEach(function() {
    resetStorage();
  });

  it('2-1 estimate1RM Epley 공식 정확도', function() {
    // 60kg × 5reps → 60 × (1 + 5/30) = 60 × 1.1667 = 70
    assert.equal(estimate1RM(60, 5), 70);
    // 1rep → 무게 그대로
    assert.equal(estimate1RM(100, 1), 100);
    // 0 이하 → 0
    assert.equal(estimate1RM(0, 5), 0);
    assert.equal(estimate1RM(60, 0), 0);
  });

  it('2-2 첫 기록 → PR', function() {
    const result = checkPR('flat_bench', 60, 5, 'sess1');
    assert.equal(result.isPR, true);
    assert.equal(result.type, '1rm');
    assert.equal(result.prevBest, null);
  });

  it('2-3 같은 1RM → PR 아님', function() {
    checkPR('flat_bench', 60, 5, 'sess1'); // e1rm = 70
    const result = checkPR('flat_bench', 60, 5, 'sess2'); // e1rm = 70, best = 70
    assert.equal(result.isPR, false);
  });

  it('2-4 더 높은 1RM → PR', function() {
    checkPR('flat_bench', 60, 5, 'sess1'); // e1rm = 70
    const result = checkPR('flat_bench', 80, 5, 'sess2'); // e1rm = 80 × 1.1667 = 93
    assert.equal(result.isPR, true);
    assert.equal(result.prevBest.estimated1RM, 70);
  });

  it('2-5 다른 종목 PR은 독립', function() {
    checkPR('flat_bench', 100, 1, 'sess1'); // bench 1RM=100
    const result = checkPR('barbell_squat', 60, 5, 'sess2'); // squat 1RM=70
    assert.equal(result.isPR, true); // 스쿼트 첫 기록
  });

  it('2-6 recalcAllPRs → 전체 재계산', function() {
    // 세션 2개 저장 (날짜순: sess1 먼저)
    saveSession({
      id: 'sess1', date: '2026-03-30', startTime: 1000, endTime: 2000, tags: ['chest'],
      exercises: [{ exerciseId: 'flat_bench', sets: [
        { weight: 60, reps: 5, done: true, isPR: false },
        { weight: 70, reps: 3, done: true, isPR: false }
      ]}],
      totalVolume: 510, totalVolumeExWarmup: 510, totalCalories: 50, durationMin: 30, memo: ''
    });
    saveSession({
      id: 'sess2', date: '2026-03-31', startTime: 3000, endTime: 4000, tags: ['chest'],
      exercises: [{ exerciseId: 'flat_bench', sets: [
        { weight: 80, reps: 5, done: true, isPR: false }
      ]}],
      totalVolume: 400, totalVolumeExWarmup: 400, totalCalories: 40, durationMin: 20, memo: ''
    });

    recalcAllPRs();

    // sess1 set0: 60×5=e1rm70 → 첫 PR
    // sess1 set1: 70×3=e1rm77 → 70<77 → PR
    // sess2 set0: 80×5=e1rm93 → 77<93 → PR
    const sessions = getSessions();
    // 날짜 내림차순이므로 sess2가 먼저
    const sess2 = sessions.find(function(s) { return s.id === 'sess2'; });
    const sess1 = sessions.find(function(s) { return s.id === 'sess1'; });
    assert.equal(sess1.exercises[0].sets[0].isPR, true);  // 60×5, 1RM=70
    assert.equal(sess1.exercises[0].sets[1].isPR, true);  // 70×3, 1RM=77
    assert.equal(sess2.exercises[0].sets[0].isPR, true);   // 80×5, 1RM=93

    const prs = getPRs();
    assert.equal(prs['flat_bench'].length, 3);
  });

  it('2-7 getExercisePRs → 종목별 PR 목록', function() {
    checkPR('flat_bench', 60, 5, 'sess1');
    checkPR('flat_bench', 80, 5, 'sess2');
    const records = getExercisePRs('flat_bench');
    assert.equal(records.length, 2);
  });
});
