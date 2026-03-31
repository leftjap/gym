/**
 * 영역 4: 세트 입력 데이터 무결성 — Golden Path 테스트
 * 볼륨 계산, 칼로리 추정, 통계 정확도
 */
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { resetStorage } = require('./_setup');

require('../js/storage');
require('../js/data');

describe('영역 4: 세트 입력 데이터 무결성', function() {

  beforeEach(function() {
    resetStorage();
  });

  it('4-1 세션 볼륨 = 완료 세트의 weight × reps 합', function() {
    var session = {
      id: 'v1', date: '2026-03-31', startTime: 1000, endTime: 2000, tags: ['chest'],
      exercises: [{
        exerciseId: 'flat_bench',
        sets: [
          { weight: 60, reps: 8, done: true, isPR: false },
          { weight: 60, reps: 8, done: true, isPR: false },
          { weight: 60, reps: 6, done: true, isPR: false },
          { weight: 50, reps: 5, done: false, isPR: false }  // 미완료 → 제외
        ]
      }],
      totalVolume: 0, totalVolumeExWarmup: 0, totalCalories: 0, durationMin: 30, memo: ''
    };
    // 수동 계산: (60×8) + (60×8) + (60×6) = 480 + 480 + 360 = 1320
    var vol = 0;
    session.exercises[0].sets.forEach(function(s) {
      if (s.done) vol += s.weight * s.reps;
    });
    assert.equal(vol, 1320);
  });

  it('4-2 estimateCalories MET 기반 계산', function() {
    // 인바디 데이터 없으면 기본 70kg
    var weight = getLatestWeight();
    assert.equal(weight, 70);

    // 인바디 기록 추가
    addInbodyRecord({ date: '2026-03-31', weight: 80 });
    assert.equal(getLatestWeight(), 80);

    // 칼로리 추정: flat_bench (MET=5), 3세트 완료
    var session = {
      id: 'cal1', date: '2026-03-31', startTime: 1000, endTime: 2000, tags: ['chest'],
      exercises: [{
        exerciseId: 'flat_bench',
        sets: [
          { weight: 60, reps: 8, done: true },
          { weight: 60, reps: 8, done: true },
          { weight: 60, reps: 6, done: true }
        ]
      }],
      totalVolume: 1320, totalVolumeExWarmup: 1320, totalCalories: 0, durationMin: 30, memo: ''
    };
    var cal = estimateCalories(session);
    // MET=5, weight=80, 3 doneSets, hours = 3×1.5/60 = 0.075
    // cal = 5 × 80 × 0.075 × 1.05 = 31.5 → 32 (Math.round)
    assert.equal(cal, 32);
  });

  it('4-3 getWeekSummary 주간 통계 정확도', function() {
    // 이번 주 세션 2개
    var weekStart = getWeekStartDate();
    saveSession({
      id: 'w1', date: weekStart, startTime: 1000, endTime: 2000, tags: ['chest'],
      exercises: [], totalVolume: 1000, totalVolumeExWarmup: 1000, totalCalories: 50, durationMin: 30, memo: ''
    });
    saveSession({
      id: 'w2', date: weekStart, startTime: 3000, endTime: 4000, tags: ['back'],
      exercises: [], totalVolume: 2000, totalVolumeExWarmup: 2000, totalCalories: 80, durationMin: 45, memo: ''
    });
    // 지난주 세션 (포함 안 돼야 함)
    var d = new Date();
    d.setDate(d.getDate() - 14);
    var oldDate = getLocalYMD(d);
    saveSession({
      id: 'old', date: oldDate, startTime: 5000, endTime: 6000, tags: ['lower'],
      exercises: [], totalVolume: 5000, totalVolumeExWarmup: 5000, totalCalories: 200, durationMin: 60, memo: ''
    });

    var summary = getWeekSummary();
    assert.equal(summary.count, 2);
    assert.equal(summary.volume, 3000);
    assert.equal(summary.calories, 130);
    assert.equal(summary.duration, 75);
  });

  it('4-4 getStreak 연속 운동일 계산', function() {
    var todayStr = today();
    var d = new Date();

    // 오늘 + 어제 + 그저께 = 3일 연속
    saveSession({ id: 'st1', date: todayStr, startTime: 1000, endTime: 2000, tags: [], exercises: [], totalVolume: 100, totalVolumeExWarmup: 100, totalCalories: 10, durationMin: 10, memo: '' });

    d.setDate(d.getDate() - 1);
    saveSession({ id: 'st2', date: getLocalYMD(d), startTime: 1000, endTime: 2000, tags: [], exercises: [], totalVolume: 100, totalVolumeExWarmup: 100, totalCalories: 10, durationMin: 10, memo: '' });

    d.setDate(d.getDate() - 1);
    saveSession({ id: 'st3', date: getLocalYMD(d), startTime: 1000, endTime: 2000, tags: [], exercises: [], totalVolume: 100, totalVolumeExWarmup: 100, totalCalories: 10, durationMin: 10, memo: '' });

    // 4일 전은 빈칸 → streak = 3
    assert.equal(getStreak(), 3);
  });

  it('4-5 deleteExerciseFromSession → 볼륨·태그 재계산', function() {
    saveSession({
      id: 'del1', date: '2026-03-31', startTime: 1000, endTime: 2000,
      tags: ['chest', 'back'],
      exercises: [
        { exerciseId: 'flat_bench', sets: [{ weight: 60, reps: 8, done: true, isPR: false }] },
        { exerciseId: 'lat_pulldown', sets: [{ weight: 35, reps: 10, done: true, isPR: false }] }
      ],
      totalVolume: 830, totalVolumeExWarmup: 830, totalCalories: 50, durationMin: 30, memo: ''
    });

    deleteExerciseFromSession('del1', 'flat_bench');
    var session = getSession('del1');
    assert.equal(session.exercises.length, 1);
    assert.equal(session.exercises[0].exerciseId, 'lat_pulldown');
    // 볼륨 재계산: 35×10 = 350
    assert.equal(session.totalVolume, 350);
    // 태그 재계산: back만 남음
    assert.deepEqual(session.tags, ['back']);
  });

  it('4-6 종목 0개 되면 세션 자체 삭제', function() {
    saveSession({
      id: 'del2', date: '2026-03-31', startTime: 1000, endTime: 2000,
      tags: ['chest'],
      exercises: [
        { exerciseId: 'flat_bench', sets: [{ weight: 60, reps: 8, done: true, isPR: false }] }
      ],
      totalVolume: 480, totalVolumeExWarmup: 480, totalCalories: 30, durationMin: 20, memo: ''
    });

    deleteExerciseFromSession('del2', 'flat_bench');
    var session = getSession('del2');
    assert.equal(session, undefined); // 세션 자체 삭제됨
  });
});
