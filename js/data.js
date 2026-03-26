/* ═══ data.js — 세션/PR/인바디 CRUD, 통계 ═══ */

// ══ 세션 CRUD ══
function getSessions() {
  return L(K.sessions) || [];
}

function saveSessions(arr) {
  S(K.sessions, arr);
}

function getSession(id) {
  return getSessions().find(function(s) { return s.id === id; });
}

function saveSession(session) {
  var arr = getSessions();
  var idx = arr.findIndex(function(s) { return s.id === session.id; });
  if (idx >= 0) arr[idx] = session;
  else arr.push(session);
  // 날짜 내림차순 정렬
  arr.sort(function(a, b) { return b.date.localeCompare(a.date) || b.startTime - a.startTime; });
  saveSessions(arr);
}

function deleteSession(id) {
  var arr = getSessions().filter(function(s) { return s.id !== id; });
  saveSessions(arr);
  saveLastSyncTime();
  syncToServer(null, true);
}

// ══ PR 관리 ══
function getPRs() {
  return L(K.prs) || {};
}

function savePRs(obj) {
  S(K.prs, obj);
}

// estimated 1RM (Epley formula): weight × (1 + reps/30)
function estimate1RM(weight, reps) {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

/**
 * PR 여부 판정 + 갱신
 * @returns {isPR: boolean, type: string|null, prevBest: object|null}
 * type: 'weight' (같은 횟수 대비 최고 무게) | 'volume' (최고 세트 볼륨) | '1rm' (최고 추정 1RM)
 */
function checkPR(exerciseId, weight, reps, sessionId) {
  if (weight <= 0 || reps <= 0) return { isPR: false, type: null, prevBest: null };

  var prs = getPRs();
  if (!prs[exerciseId]) prs[exerciseId] = [];

  var records = prs[exerciseId];
  var vol = weight * reps;
  var e1rm = estimate1RM(weight, reps);
  var dateStr = today();

  // 최고 추정 1RM 기준으로 PR 판정
  var bestRecord = null;
  var best1RM = 0;
  for (var i = 0; i < records.length; i++) {
    if (records[i].estimated1RM > best1RM) {
      best1RM = records[i].estimated1RM;
      bestRecord = records[i];
    }
  }

  if (e1rm > best1RM) {
    // 새 PR 기록 추가
    records.push({
      weight: weight,
      reps: reps,
      volume: vol,
      estimated1RM: e1rm,
      date: dateStr,
      sessionId: sessionId || null
    });
    prs[exerciseId] = records;
    savePRs(prs);
    return { isPR: true, type: '1rm', prevBest: bestRecord };
  }

  return { isPR: false, type: null, prevBest: bestRecord };
}

function getExercisePRs(exerciseId) {
  var prs = getPRs();
  return prs[exerciseId] || [];
}

function getRecentPRs(count) {
  var prs = getPRs();
  var all = [];
  var keys = Object.keys(prs);
  for (var i = 0; i < keys.length; i++) {
    var exId = keys[i];
    var records = prs[exId];
    for (var j = 0; j < records.length; j++) {
      all.push(Object.assign({ exerciseId: exId }, records[j]));
    }
  }
  all.sort(function(a, b) { return b.date.localeCompare(a.date); });
  return all.slice(0, count || 5);
}

// ══ 인바디 ══
function getInbodyRecords() {
  return L(K.inbody) || [];
}

function saveInbodyRecords(arr) {
  S(K.inbody, arr);
}

function addInbodyRecord(record) {
  var arr = getInbodyRecords();
  record.id = record.id || genId();
  arr.push(record);
  arr.sort(function(a, b) { return a.date.localeCompare(b.date); });
  saveInbodyRecords(arr);
}

function getLatestWeight() {
  var arr = getInbodyRecords();
  if (arr.length === 0) return 70; // 기본값
  return arr[arr.length - 1].weight || 70;
}

// ══ 통계 ══
function getWeekSummary() {
  var weekStart = getWeekStartDate();
  var sessions = getSessions().filter(function(s) { return s.date >= weekStart; });
  var count = sessions.length;
  var volume = 0, duration = 0, calories = 0;
  for (var i = 0; i < sessions.length; i++) {
    volume += sessions[i].totalVolumeExWarmup || 0;
    duration += sessions[i].durationMin || 0;
    calories += sessions[i].totalCalories || 0;
  }
  return { count: count, volume: volume, duration: duration, calories: calories };
}

function getMonthSummary(ym) {
  var target = ym || getYM();
  var sessions = getSessions().filter(function(s) { return getYM(s.date) === target; });
  var count = sessions.length;
  var volume = 0, duration = 0, calories = 0;
  for (var i = 0; i < sessions.length; i++) {
    volume += sessions[i].totalVolumeExWarmup || 0;
    duration += sessions[i].durationMin || 0;
    calories += sessions[i].totalCalories || 0;
  }
  return { count: count, volume: volume, duration: duration, calories: calories };
}

function getStreak() {
  var sessions = getSessions();
  if (sessions.length === 0) return 0;

  // 운동한 날짜 집합 (중복 제거)
  var dates = {};
  for (var i = 0; i < sessions.length; i++) {
    dates[sessions[i].date] = true;
  }

  var streak = 0;
  var d = new Date();

  // 오늘 운동 안 했으면 어제부터 시작
  if (!dates[getLocalYMD(d)]) {
    d.setDate(d.getDate() - 1);
  }

  while (dates[getLocalYMD(d)]) {
    streak++;
    d.setDate(d.getDate() - 1);
  }

  return streak;
}

function getSessionsByMonth(ym) {
  var target = ym || getYM();
  return getSessions().filter(function(s) { return getYM(s.date) === target; });
}

function getSessionsByDate(dateStr) {
  return getSessions().filter(function(s) { return s.date === dateStr; });
}

/**
 * MET 기반 칼로리 추정
 * 칼로리(kcal) = MET × 체중(kg) × 시간(시간) × 1.05
 */
function estimateCalories(session) {
  var weight = getLatestWeight();
  var totalCal = 0;

  for (var i = 0; i < session.exercises.length; i++) {
    var ex = session.exercises[i];
    var meta = getExercise(ex.exerciseId);
    if (!meta) continue;

    var met = meta.met || 4;
    // 해당 종목의 세트 수행 시간 추정: 세트당 약 1분 (세트 수행 + 쉬는 시간 포함)
    var doneSets = 0;
    for (var j = 0; j < ex.sets.length; j++) {
      if (ex.sets[j].done) doneSets++;
    }
    var hours = (doneSets * 1.5) / 60; // 세트당 약 1.5분
    totalCal += met * weight * hours * 1.05;
  }

  return Math.round(totalCal);
}

/**
 * 세션의 지난번 같은 부위 조합 세션 찾기
 * (같은 tags 조합의 가장 최근 세션)
 */
function getLastSimilarSession(tags) {
  var sessions = getSessions();
  var tagKey = tags.slice().sort().join(',');

  for (var i = 0; i < sessions.length; i++) {
    var sKey = sessions[i].tags.slice().sort().join(',');
    if (sKey === tagKey) return sessions[i];
  }
  return null;
}

/**
 * 특정 종목의 마지막 세션에서의 세트 데이터 가져오기
 */
function getLastExerciseSets(exerciseId) {
  var sessions = getSessions();
  for (var i = 0; i < sessions.length; i++) {
    var exs = sessions[i].exercises;
    for (var j = 0; j < exs.length; j++) {
      if (exs[j].exerciseId === exerciseId) {
        return exs[j].sets;
      }
    }
  }
  return null;
}

/**
 * 가장 최근 세션 반환 (오늘 포함)
 */
function getLastSession() {
  var sessions = getSessions();
  return sessions.length > 0 ? sessions[0] : null;
}

/**
 * 특정 날짜의 총 볼륨 반환
 */
function getDayVolume(dateStr) {
  var sessions = getSessionsByDate(dateStr);
  var vol = 0;
  for (var i = 0; i < sessions.length; i++) {
    vol += sessions[i].totalVolume || 0;
  }
  return vol;
}

/**
 * 이번 주 총 볼륨 (월요일~오늘)
 */
function getThisWeekVolume() {
  var weekStart = getWeekStartDate();
  var todayStr = today();
  var sessions = getSessions().filter(function(s) {
    return s.date >= weekStart && s.date <= todayStr;
  });
  var vol = 0;
  for (var i = 0; i < sessions.length; i++) {
    vol += sessions[i].totalVolume || 0;
  }
  return vol;
}

/**
 * 지난주 같은 시점까지의 볼륨 (지난 월요일~지난 오늘 요일)
 * 예: 오늘이 수요일이면 지난주 월~수 볼륨 반환
 */
function getLastWeekVolumeAtSamePoint() {
  var now = new Date();
  var dayOfWeek = now.getDay(); // 0=일, 1=월, ...
  var daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 월=0, 화=1, ...

  // 지난주 월요일
  var lastWeekMon = new Date(now);
  lastWeekMon.setDate(now.getDate() - 7 - daysSinceMonday);
  var lastWeekStart = getLocalYMD(lastWeekMon);

  // 지난주 같은 요일
  var lastWeekSameDay = new Date(now);
  lastWeekSameDay.setDate(now.getDate() - 7);
  var lastWeekEnd = getLocalYMD(lastWeekSameDay);

  var sessions = getSessions().filter(function(s) {
    return s.date >= lastWeekStart && s.date <= lastWeekEnd;
  });
  var vol = 0;
  for (var i = 0; i < sessions.length; i++) {
    vol += sessions[i].totalVolume || 0;
  }
  return vol;
}

/**
 * 지난주 전체 볼륨 (월~일)
 */
function getLastWeekTotalVolume() {
  var now = new Date();
  var dayOfWeek = now.getDay();
  var daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  var lastWeekMon = new Date(now);
  lastWeekMon.setDate(now.getDate() - 7 - daysSinceMonday);
  var lastWeekStart = getLocalYMD(lastWeekMon);

  var lastWeekSun = new Date(lastWeekMon);
  lastWeekSun.setDate(lastWeekMon.getDate() + 6);
  var lastWeekEnd = getLocalYMD(lastWeekSun);

  var sessions = getSessions().filter(function(s) {
    return s.date >= lastWeekStart && s.date <= lastWeekEnd;
  });
  var vol = 0;
  for (var i = 0; i < sessions.length; i++) {
    vol += sessions[i].totalVolume || 0;
  }
  return vol;
}

/**
 * 특정 날짜에 PR이 있었는지 확인
 */
function hasPROnDate(dateStr) {
  var sessions = getSessionsByDate(dateStr);
  for (var i = 0; i < sessions.length; i++) {
    var exs = sessions[i].exercises;
    for (var j = 0; j < exs.length; j++) {
      for (var k = 0; k < exs[j].sets.length; k++) {
        if (exs[j].sets[k].isPR) return true;
      }
    }
  }
  return false;
}

/**
 * 특정 월의 날짜별 볼륨 맵 반환
 * @returns { '2026-03-01': 1200, '2026-03-03': 3400, ... }
 */
function getMonthDayVolumes(ym) {
  var target = ym || getYM();
  var sessions = getSessions().filter(function(s) { return getYM(s.date) === target; });
  var map = {};
  for (var i = 0; i < sessions.length; i++) {
    var d = sessions[i].date;
    if (!map[d]) map[d] = 0;
    map[d] += sessions[i].totalVolume || 0;
  }
  return map;
}

/**
 * 특정 월의 부위별 총 볼륨 랭킹 반환
 * @returns [{ partId, partName, volume, percentage, color }, ...] (볼륨 내림차순)
 */
function getMonthPartVolumes(ym) {
  var target = ym || getYM();
  var sessions = getSessions().filter(function(s) { return getYM(s.date) === target; });

  var partMap = {}; // { partId: volume }
  var totalVol = 0;

  for (var i = 0; i < sessions.length; i++) {
    var s = sessions[i];
    for (var j = 0; j < s.exercises.length; j++) {
      var ex = s.exercises[j];
      var meta = getExercise(ex.exerciseId);
      if (!meta) continue;
      if (meta.equipment === 'cardio') continue; // 유산소 제외

      var partId = meta.bodyPart;
      if (!partMap[partId]) partMap[partId] = 0;

      for (var k = 0; k < ex.sets.length; k++) {
        var set = ex.sets[k];
        if (set.done) {
          var v = (set.weight || 0) * (set.reps || 0);
          partMap[partId] += v;
          totalVol += v;
        }
      }
    }
  }

  // 배열로 변환 + 정렬
  var result = [];
  var partIds = Object.keys(partMap);
  for (var i = 0; i < partIds.length; i++) {
    var pid = partIds[i];
    var part = getBodyPart(pid);
    if (partMap[pid] <= 0) continue;
    result.push({
      partId: pid,
      partName: part ? part.name : pid,
      volume: partMap[pid],
      percentage: totalVol > 0 ? Math.round((partMap[pid] / totalVol) * 1000) / 10 : 0,
      color: part ? part.color : '#999'
    });
  }

  result.sort(function(a, b) { return b.volume - a.volume; });
  return result;
}

/**
 * 최근 N개월의 월별 총 볼륨 반환 (현재 월 포함)
 * @param {number} count — 몇 개월 (기본 6)
 * @param {string} baseYM — 기준 월 (기본 현재 월)
 * @returns [{ ym: '2026-03', month: 3, volume: 12000, isCurrent: true }, ...]
 */
function getRecentMonthlyVolumes(count, baseYM) {
  count = count || 6;
  var base = baseYM || getYM();
  var parts = base.split('-').map(Number);
  var baseY = parts[0];
  var baseM = parts[1];

  var result = [];

  for (var i = count - 1; i >= 0; i--) {
    var m = baseM - i;
    var y = baseY;
    while (m < 1) { m += 12; y -= 1; }
    while (m > 12) { m -= 12; y += 1; }

    var ym = y + '-' + String(m).padStart(2, '0');
    var summary = getMonthSummary(ym);

    result.push({
      ym: ym,
      month: m,
      volume: summary.volume || 0,
      isCurrent: ym === base
    });
  }

  return result;
}

/**
 * 특정 월의 운동종목별 총 볼륨 랭킹 반환
 * @returns [{ exerciseId, name, volume, percentage }, ...] (볼륨 내림차순)
 */
function getMonthExerciseVolumes(ym) {
  var target = ym || getYM();
  var sessions = getSessions().filter(function(s) { return getYM(s.date) === target; });

  var exMap = {}; // { exerciseId: volume }
  var totalVol = 0;

  for (var i = 0; i < sessions.length; i++) {
    var s = sessions[i];
    for (var j = 0; j < s.exercises.length; j++) {
      var ex = s.exercises[j];
      var meta = getExercise(ex.exerciseId);
      if (!meta) continue;
      if (meta.equipment === 'cardio' || meta.equipment === 'bodyweight') continue;

      if (!exMap[ex.exerciseId]) exMap[ex.exerciseId] = 0;

      for (var k = 0; k < ex.sets.length; k++) {
        var set = ex.sets[k];
        if (set.done) {
          var v = (set.weight || 0) * (set.reps || 0);
          exMap[ex.exerciseId] += v;
          totalVol += v;
        }
      }
    }
  }

  var result = [];
  var exIds = Object.keys(exMap);
  for (var i = 0; i < exIds.length; i++) {
    var eid = exIds[i];
    var meta = getExercise(eid);
    if (exMap[eid] <= 0) continue;
    result.push({
      exerciseId: eid,
      name: meta ? meta.name : eid,
      volume: exMap[eid],
      percentage: totalVol > 0 ? Math.round((exMap[eid] / totalVol) * 1000) / 10 : 0
    });
  }

  result.sort(function(a, b) { return b.volume - a.volume; });
  return result;
}

/**
 * 특정 월의 날짜별 PR 여부 맵 반환
 * @returns { '2026-03-05': true, ... }
 */
function getMonthPRDates(ym) {
  var target = ym || getYM();
  var sessions = getSessions().filter(function(s) { return getYM(s.date) === target; });
  var map = {};
  for (var i = 0; i < sessions.length; i++) {
    var s = sessions[i];
    for (var j = 0; j < s.exercises.length; j++) {
      for (var k = 0; k < s.exercises[j].sets.length; k++) {
        if (s.exercises[j].sets[k].isPR) {
          map[s.date] = true;
          break;
        }
      }
      if (map[s.date]) break;
    }
  }
  return map;
}

// ══ 날짜 전체 삭제 ══
function deleteSessionsByDate(dateStr) {
  var sessions = getSessions().filter(function(s) { return s.date !== dateStr; });
  saveSessions(sessions);
  recalcAllPRs();
  saveLastSyncTime();
  syncToServer(null, true);
}

// ══ 특정 세션에서 특정 종목만 삭제 ══
function deleteExerciseFromSession(sessionId, exerciseId) {
  var sessions = getSessions();
  for (var i = 0; i < sessions.length; i++) {
    if (sessions[i].id !== sessionId) continue;

    var sess = sessions[i];
    sess.exercises = sess.exercises.filter(function(ex) {
      return ex.exerciseId !== exerciseId;
    });

    // 종목이 0개가 되면 세션 자체를 삭제
    if (sess.exercises.length === 0) {
      sessions.splice(i, 1);
    } else {
      // 볼륨/칼로리 재계산
      var vol = 0;
      for (var j = 0; j < sess.exercises.length; j++) {
        var ex = sess.exercises[j];
        var meta = getExercise(ex.exerciseId);
        if (meta && meta.equipment === 'cardio') continue;
        for (var k = 0; k < ex.sets.length; k++) {
          if (ex.sets[k].done) {
            vol += (ex.sets[k].weight || 0) * (ex.sets[k].reps || 0);
          }
        }
      }
      sess.totalVolume = vol;
      sess.totalVolumeExWarmup = vol;
      sess.totalCalories = estimateCalories(sess);

      // 태그 재계산
      var tagSet = {};
      var newTags = [];
      for (var j = 0; j < sess.exercises.length; j++) {
        var meta = getExercise(sess.exercises[j].exerciseId);
        if (meta && !tagSet[meta.bodyPart]) {
          tagSet[meta.bodyPart] = true;
          newTags.push(meta.bodyPart);
        }
      }
      sess.tags = newTags;
    }

    saveSessions(sessions);
    break;
  }

  recalcAllPRs();
  saveLastSyncTime();
  syncToServer(null, true);
}

// ══ PR 전체 재계산 ══
function recalcAllPRs() {
  var sessions = getSessions();

  // 날짜 오름차순 (오래된 순서대로 PR 재판정)
  var sorted = sessions.slice().sort(function(a, b) {
    return a.date.localeCompare(b.date) || a.startTime - b.startTime;
  });

  var newPRs = {};
  var bestMap = {}; // { exerciseId: best1RM }

  for (var si = 0; si < sorted.length; si++) {
    var sess = sorted[si];
    for (var ei = 0; ei < sess.exercises.length; ei++) {
      var ex = sess.exercises[ei];
      for (var ki = 0; ki < ex.sets.length; ki++) {
        var set = ex.sets[ki];
        if (!set.done || set.weight <= 0 || set.reps <= 0) {
          set.isPR = false;
          continue;
        }

        var e1rm = estimate1RM(set.weight, set.reps);
        var currentBest = bestMap[ex.exerciseId] || 0;

        if (e1rm > currentBest) {
          set.isPR = true;
          bestMap[ex.exerciseId] = e1rm;

          if (!newPRs[ex.exerciseId]) newPRs[ex.exerciseId] = [];
          newPRs[ex.exerciseId].push({
            weight: set.weight,
            reps: set.reps,
            volume: set.weight * set.reps,
            estimated1RM: e1rm,
            date: sess.date,
            sessionId: sess.id
          });
        } else {
          set.isPR = false;
        }
      }
    }
  }

  // 날짜 내림차순 복원 후 저장
  sorted.sort(function(a, b) {
    return b.date.localeCompare(a.date) || b.startTime - a.startTime;
  });
  saveSessions(sorted);
  savePRs(newPRs);
}
