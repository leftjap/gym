// ═══ PROJECT: gym ═══

/* ═══ storage.js — 상수, 유틸, 종목 마스터 ═══ */

// ── LocalStorage 키 ──
const K = {
  sessions: 'wk_sessions',
  prs: 'wk_prs',
  inbody: 'wk_inbody',
  settings: 'wk_settings',
  customExercises: 'wk_custom_exercises',
  hiddenExercises: 'wk_hidden_exercises',
  exerciseIcons: 'wk_exercise_icons',
  partOverrides: 'wk_exercise_part_override'
};

// ── LocalStorage 읽기/쓰기 ──
function L(key) {
  try { return JSON.parse(localStorage.getItem(key)); }
  catch { return null; }
}
function S(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    if (!window._quotaWarned) {
      window._quotaWarned = true;
      alert('저장 공간이 부족합니다. 오래된 기록을 정리해주세요.');
    }
    console.error('localStorage 저장 실패:', key, e);
  }
}

// ── 날짜 유틸 ──
function today() {
  return getLocalYMD(new Date());
}

function getLocalYMD(date) {
  const d = date || new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function getWeekStartDate() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(now);
  mon.setDate(diff);
  return getLocalYMD(mon);
}

function formatDuration(min) {
  if (min < 60) return min + '분';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? h + '시간 ' + m + '분' : h + '시간';
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return month + '월 ' + day + '일 (' + weekday + ')';
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return (d.getMonth() + 1) + '/' + d.getDate();
}

function getYM(dateStr) {
  return dateStr ? dateStr.slice(0, 7) : today().slice(0, 7);
}

function getDaysInMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function getFirstDayOfMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).getDay();
}

// ── 숫자 포맷 ──
function formatNum(n) {
  if (n == null) return '0';
  return Number(n).toLocaleString('ko-KR');
}

// ── ID 생성 ──
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── 부위 그룹 정의 ──
const BODY_PARTS = [
  { id: 'back',     name: '등',    color: '#4a90d9', bg: '#e8f0fe' },
  { id: 'chest',    name: '가슴',  color: '#e85040', bg: '#fdf0ee' },
  { id: 'shoulder', name: '어깨',  color: '#8b5cf6', bg: '#f0ebfe' },
  { id: 'lower',    name: '하체',  color: '#f0a848', bg: '#fef5e8' },
  { id: 'arms',     name: '팔',    color: '#34c759', bg: '#e8f8ee' },
  { id: 'etc',      name: '기타',  color: '#ff6b9d', bg: '#fee8f0' }
];

// ── 장비 타입 ──
const EQUIPMENT = {
  barbell: '바벨',
  dumbbell: '덤벨',
  machine: '머신',
  cable: '케이블',
  bodyweight: '맨몸',
  cardio: '유산소'
};

// ── 종목 마스터 데이터 ──
const EXERCISES = [
  // ── 가슴 (chest) ──
  { id: 'flat_bench', name: '플랫 벤치프레스', bodyPart: 'chest', equipment: 'barbell', defaultSets: 5, defaultReps: 8, defaultWeight: 40, defaultRestSec: 120, met: 5, sortOrder: 0, icon: 'https://burnfit.io/wp-content/uploads/BB_BP.gif' },
  { id: 'incline_bench', name: '인클라인 벤치프레스', bodyPart: 'chest', equipment: 'barbell', defaultSets: 4, defaultReps: 10, defaultWeight: 30, defaultRestSec: 90, met: 5, sortOrder: 1, icon: 'https://burnfit.io/wp-content/uploads/BB_INC_PRESS.gif' },
  { id: 'db_bench', name: '덤벨 벤치프레스', bodyPart: 'chest', equipment: 'dumbbell', defaultSets: 4, defaultReps: 10, defaultWeight: 16, defaultRestSec: 90, met: 5, sortOrder: 2, icon: 'https://burnfit.io/wp-content/uploads/DB_BP.gif' },
  { id: 'chest_press', name: '체스트 프레스 머신', bodyPart: 'chest', equipment: 'machine', defaultSets: 4, defaultReps: 12, defaultWeight: 30, defaultRestSec: 60, met: 4, sortOrder: 3, icon: 'https://burnfit.io/wp-content/uploads/CHEST_PRESS_MC.gif' },
  { id: 'cable_fly', name: '케이블 플라이', bodyPart: 'chest', equipment: 'cable', defaultSets: 4, defaultReps: 12, defaultWeight: 10, defaultRestSec: 60, met: 3, sortOrder: 4, icon: 'https://burnfit.io/wp-content/uploads/STD_CABLE_FLY.gif' },

  // ── 등 (back) ──
  { id: 'deadlift', name: '데드리프트', bodyPart: 'back', equipment: 'barbell', defaultSets: 4, defaultReps: 5, defaultWeight: 60, defaultRestSec: 150, met: 6, sortOrder: 0, icon: 'https://burnfit.io/wp-content/uploads/RM_BB_DL.gif' },
  { id: 'lat_pulldown', name: '랫풀다운', bodyPart: 'back', equipment: 'cable', defaultSets: 4, defaultReps: 10, defaultWeight: 35, defaultRestSec: 90, met: 4, sortOrder: 1, icon: 'https://burnfit.io/wp-content/uploads/LAT_PULL_DOWN.gif' },
  { id: 'seated_row', name: '시티드 로우', bodyPart: 'back', equipment: 'cable', defaultSets: 4, defaultReps: 10, defaultWeight: 35, defaultRestSec: 90, met: 4, sortOrder: 2, icon: 'https://burnfit.io/wp-content/uploads/SEATED_CABLE_ROW.gif' },
  { id: 'barbell_row', name: '바벨 로우', bodyPart: 'back', equipment: 'barbell', defaultSets: 4, defaultReps: 8, defaultWeight: 40, defaultRestSec: 90, met: 5, sortOrder: 3, icon: 'https://burnfit.io/wp-content/uploads/PAUSE_BB_ROW.gif' },
  { id: 'pullup', name: '풀업', bodyPart: 'back', equipment: 'bodyweight', defaultSets: 4, defaultReps: 8, defaultWeight: 0, defaultRestSec: 90, met: 5, sortOrder: 4, icon: 'https://burnfit.io/wp-content/uploads/PULL_UP.gif' },
  { id: 'one_arm_row', name: '원암 덤벨 로우', bodyPart: 'back', equipment: 'dumbbell', defaultSets: 4, defaultReps: 10, defaultWeight: 20, defaultRestSec: 60, met: 4, sortOrder: 5, icon: 'https://burnfit.io/wp-content/uploads/OA_DB_ROW.gif' },
  { id: 'low_row_machine', name: '로우 로우 머신', bodyPart: 'back', equipment: 'machine', defaultSets: 4, defaultReps: 10, defaultWeight: 30, defaultRestSec: 60, met: 4, sortOrder: 6, icon: 'https://burnfit.io/wp-content/uploads/LOW_ROW_MC.gif' },
  { id: 'high_row_machine', name: '하이 로우 머신', bodyPart: 'back', equipment: 'machine', defaultSets: 4, defaultReps: 10, defaultWeight: 30, defaultRestSec: 60, met: 4, sortOrder: 7, icon: 'https://burnfit.io/wp-content/uploads/HIGH_ROW_MC.gif' },

  // ── 하체 (lower) ──
  { id: 'barbell_squat', name: '바벨 백 스쿼트', bodyPart: 'lower', equipment: 'barbell', defaultSets: 5, defaultReps: 5, defaultWeight: 50, defaultRestSec: 150, met: 6, sortOrder: 0, icon: 'https://burnfit.io/wp-content/uploads/BB_BSQT.gif' },
  { id: 'leg_press', name: '레그 프레스', bodyPart: 'lower', equipment: 'machine', defaultSets: 4, defaultReps: 10, defaultWeight: 80, defaultRestSec: 90, met: 5, sortOrder: 1, icon: 'https://burnfit.io/wp-content/uploads/LEG_PRESS-1.gif' },
  { id: 'horizontal_leg_press', name: '수평 레그 프레스', bodyPart: 'lower', equipment: 'machine', defaultSets: 4, defaultReps: 10, defaultWeight: 60, defaultRestSec: 90, met: 5, sortOrder: 2, icon: 'https://burnfit.io/wp-content/uploads/HZ_LEG_PRESS.gif' },
  { id: 'leg_extension', name: '레그 익스텐션', bodyPart: 'lower', equipment: 'machine', defaultSets: 4, defaultReps: 12, defaultWeight: 25, defaultRestSec: 60, met: 4, sortOrder: 3, icon: 'https://burnfit.io/wp-content/uploads/LGE_EXT-1.gif' },
  { id: 'leg_curl', name: '레그 컬', bodyPart: 'lower', equipment: 'machine', defaultSets: 4, defaultReps: 12, defaultWeight: 20, defaultRestSec: 60, met: 4, sortOrder: 4, icon: 'https://burnfit.io/wp-content/uploads/LEG_CURL.gif' },
  { id: 'hack_squat', name: '핵 스쿼트', bodyPart: 'lower', equipment: 'machine', defaultSets: 4, defaultReps: 10, defaultWeight: 40, defaultRestSec: 90, met: 5, sortOrder: 5, icon: 'https://burnfit.io/wp-content/uploads/HACK_SQT.gif' },
  { id: 'hip_abduction', name: '힙 어브덕션', bodyPart: 'lower', equipment: 'machine', defaultSets: 4, defaultReps: 15, defaultWeight: 30, defaultRestSec: 45, met: 3, sortOrder: 6, icon: 'https://burnfit.io/wp-content/uploads/HIP_ABD_MC.gif' },
  { id: 'inner_thigh', name: '이너 싸이', bodyPart: 'lower', equipment: 'machine', defaultSets: 4, defaultReps: 15, defaultWeight: 30, defaultRestSec: 45, met: 3, sortOrder: 7, icon: 'https://burnfit.io/wp-content/uploads/INN_THIGH_MC.gif' },
  { id: 'calf_raise', name: '카프 레이즈', bodyPart: 'lower', equipment: 'machine', defaultSets: 4, defaultReps: 15, defaultWeight: 40, defaultRestSec: 45, met: 3, sortOrder: 8, icon: 'https://burnfit.io/wp-content/uploads/STD_CALF_RAISE-1.gif' },

  // ── 어깨 (shoulder) ──
  { id: 'ohp', name: '오버헤드 프레스', bodyPart: 'shoulder', equipment: 'barbell', defaultSets: 4, defaultReps: 8, defaultWeight: 25, defaultRestSec: 120, met: 5, sortOrder: 0, icon: 'https://burnfit.io/wp-content/uploads/BB_PRESS-1.gif' },
  { id: 'db_shoulder_press', name: '덤벨 숄더 프레스', bodyPart: 'shoulder', equipment: 'dumbbell', defaultSets: 4, defaultReps: 10, defaultWeight: 12, defaultRestSec: 90, met: 4, sortOrder: 1, icon: 'https://burnfit.io/wp-content/uploads/DB_SHD_PRESS-1.gif' },
  { id: 'shoulder_press_machine', name: '숄더 프레스 머신', bodyPart: 'shoulder', equipment: 'machine', defaultSets: 4, defaultReps: 10, defaultWeight: 20, defaultRestSec: 60, met: 4, sortOrder: 2, icon: 'https://burnfit.io/wp-content/uploads/SHD_PRESS_MAC-1.gif' },
  { id: 'side_lateral', name: '사이드 레터럴 레이즈', bodyPart: 'shoulder', equipment: 'dumbbell', defaultSets: 4, defaultReps: 15, defaultWeight: 6, defaultRestSec: 45, met: 3, sortOrder: 3, icon: 'https://burnfit.io/wp-content/uploads/DB_LAT_RAISE.gif' },
  { id: 'face_pull', name: '페이스 풀', bodyPart: 'shoulder', equipment: 'cable', defaultSets: 4, defaultReps: 15, defaultWeight: 15, defaultRestSec: 45, met: 3, sortOrder: 4, icon: 'https://burnfit.io/wp-content/uploads/FACE_PULL-1.gif' },
  { id: 'rear_delt_fly', name: '리어 델트 플라이', bodyPart: 'shoulder', equipment: 'dumbbell', defaultSets: 4, defaultReps: 12, defaultWeight: 6, defaultRestSec: 45, met: 3, sortOrder: 5, icon: 'https://burnfit.io/wp-content/uploads/REV_PEC_DECK_MC.gif' },
  { id: 'rear_delt_machine', name: '리어 델토이드 머신', bodyPart: 'shoulder', equipment: 'machine', defaultSets: 4, defaultReps: 12, defaultWeight: 20, defaultRestSec: 45, met: 3, sortOrder: 6, icon: 'https://burnfit.io/wp-content/uploads/REV_PEC_DECK_MC.gif' },

  // ── 팔 (arms) ──
  { id: 'barbell_curl', name: '바벨 컬', bodyPart: 'arms', equipment: 'barbell', defaultSets: 4, defaultReps: 10, defaultWeight: 20, defaultRestSec: 60, met: 3, sortOrder: 0, icon: 'https://burnfit.io/wp-content/uploads/BB_BC_CURL.gif' },
  { id: 'db_curl', name: '덤벨 컬', bodyPart: 'arms', equipment: 'dumbbell', defaultSets: 4, defaultReps: 12, defaultWeight: 10, defaultRestSec: 45, met: 3, sortOrder: 1, icon: 'https://burnfit.io/wp-content/uploads/INC_DB_CURL.gif' },
  { id: 'hammer_curl', name: '해머 컬', bodyPart: 'arms', equipment: 'dumbbell', defaultSets: 4, defaultReps: 12, defaultWeight: 10, defaultRestSec: 45, met: 3, sortOrder: 2, icon: 'https://burnfit.io/wp-content/uploads/DB_HAM_CURL-1.gif' },
  { id: 'cable_pushdown', name: '케이블 푸시다운', bodyPart: 'arms', equipment: 'cable', defaultSets: 4, defaultReps: 12, defaultWeight: 20, defaultRestSec: 45, met: 3, sortOrder: 3, icon: 'https://burnfit.io/wp-content/uploads/CABLE_PUSH_DOWN.gif' },
  { id: 'bench_dips', name: '벤치 딥스', bodyPart: 'arms', equipment: 'bodyweight', defaultSets: 4, defaultReps: 12, defaultWeight: 0, defaultRestSec: 45, met: 4, sortOrder: 4, icon: 'https://burnfit.io/wp-content/uploads/BENCH_DIPS.gif' },
  { id: 'overhead_ext', name: '오버헤드 익스텐션', bodyPart: 'arms', equipment: 'cable', defaultSets: 4, defaultReps: 12, defaultWeight: 15, defaultRestSec: 45, met: 3, sortOrder: 5, icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRg5xeizeECr4uraPByTw6oT1QZhhUr2kv4dQ&s' },
  { id: 'wrist_curl', name: '리스트 컬', bodyPart: 'arms', equipment: 'barbell', defaultSets: 4, defaultReps: 15, defaultWeight: 15, defaultRestSec: 30, met: 2, sortOrder: 6, icon: 'https://burnfit.io/wp-content/uploads/BB_WRIST_CURL.gif' },

  // ── 기타 (etc) ──
  { id: 'decline_situp', name: '디클라인 싯업', bodyPart: 'etc', equipment: 'bodyweight', defaultSets: 4, defaultReps: 20, defaultWeight: 0, defaultRestSec: 30, met: 4, sortOrder: 0, icon: 'https://burnfit.io/wp-content/uploads/DEC_SIT_UP.gif' },
  { id: 'treadmill', name: '트레드밀', bodyPart: 'etc', equipment: 'cardio', defaultSets: 1, defaultReps: 0, defaultWeight: 0, defaultRestSec: 0, met: 9, sortOrder: 1, icon: 'https://burnfit.io/wp-content/uploads/TREADMIL-1.gif' },
  { id: 'bike', name: '실내 자전거', bodyPart: 'etc', equipment: 'cardio', defaultSets: 1, defaultReps: 0, defaultWeight: 0, defaultRestSec: 0, met: 7, sortOrder: 2, icon: 'https://burnfit.io/wp-content/uploads/CYCLE.gif' },
  { id: 'stepmill', name: '스텝밀', bodyPart: 'etc', equipment: 'cardio', defaultSets: 1, defaultReps: 0, defaultWeight: 0, defaultRestSec: 0, met: 8, sortOrder: 3, icon: 'https://burnfit.io/wp-content/uploads/STEPMILL_MAC.gif' }
];

// ── 종목 조회 헬퍼 ──
function getExercise(id) {
  var found = EXERCISES.find(function(e) { return e.id === id; });
  if (found) {
    var overrides = getPartOverrides();
    if (overrides[id]) {
      var copy = {};
      for (var key in found) { copy[key] = found[key]; }
      copy.bodyPart = overrides[id];
      return copy;
    }
    return found;
  }
  var custom = L(K.customExercises) || [];
  return custom.find(function(e) { return e.id === id; }) || null;
}

// ── 종목 순서 관리 ──
function getExerciseOrder() {
  return L('wk_exercise_order') || {};
}

function saveExerciseOrder(orderMap) {
  S('wk_exercise_order', orderMap);
}

function getExercisesByPart(partId) {
  var hidden = L(K.hiddenExercises) || [];
  var overrides = getPartOverrides();

  var base = EXERCISES.filter(function(e) {
    var effectivePart = overrides[e.id] || e.bodyPart;
    return effectivePart === partId && hidden.indexOf(e.id) < 0;
  });

  // 오버라이드된 기본 종목은 복사본을 반환 (bodyPart 반영)
  base = base.map(function(e) {
    if (overrides[e.id]) {
      var copy = {};
      for (var key in e) { copy[key] = e[key]; }
      copy.bodyPart = overrides[e.id];
      return copy;
    }
    return e;
  });

  var custom = (L(K.customExercises) || []).filter(function(e) {
    return e.bodyPart === partId;
  });
  var all = base.concat(custom);

  // 커스텀 순서 맵 확인
  var orderMap = getExerciseOrder();
  var order = orderMap[partId];

  if (order && order.length > 0) {
    // 순서 맵에 있는 종목은 맵 순서대로, 없는 종목은 뒤에 추가
    var orderIndex = {};
    for (var i = 0; i < order.length; i++) {
      orderIndex[order[i]] = i;
    }
    all.sort(function(a, b) {
      var ai = orderIndex[a.id] !== undefined ? orderIndex[a.id] : 9999;
      var bi = orderIndex[b.id] !== undefined ? orderIndex[b.id] : 9999;
      if (ai !== bi) return ai - bi;
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });
  } else {
    all.sort(function(a, b) {
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });
  }

  return all;
}

function getBodyPart(id) {
  return BODY_PARTS.find(function(p) { return p.id === id; });
}

// ── 커스텀 종목 CRUD ──
function getCustomExercises() {
  return L(K.customExercises) || [];
}

function addCustomExercise(exercise) {
  var arr = getCustomExercises();
  exercise.id = exercise.id || ('custom_' + genId());
  exercise.sortOrder = arr.length + 100;
  arr.push(exercise);
  S(K.customExercises, arr);
  return exercise;
}

function deleteCustomExercise(id) {
  var arr = getCustomExercises().filter(function(e) { return e.id !== id; });
  S(K.customExercises, arr);
}

// ── 기본 종목 숨김 ──
function getHiddenExercises() {
  return L(K.hiddenExercises) || [];
}

function toggleHideExercise(id) {
  var arr = getHiddenExercises();
  var idx = arr.indexOf(id);
  if (idx >= 0) {
    arr.splice(idx, 1);
  } else {
    arr.push(id);
  }
  S(K.hiddenExercises, arr);
}

function isExerciseHidden(id) {
  return getHiddenExercises().indexOf(id) >= 0;
}

function isCustomExercise(id) {
  return id && id.indexOf('custom_') === 0;
}

// ── 더미 데이터 (비활성화) ──
function initDummyData() {
  // 비활성화됨
}

// ── 데이터 마이그레이션 ──
function migrateData() {
  var migrated = L('wk_migrated_v2');
  if (migrated) return;

  // 부위 태그 변환 맵
  var tagMap = { daily: 'arms', interval: 'etc' };
  // 종목 ID 변환 맵
  var idMap = { situp: 'decline_situp', running: 'treadmill' };

  var sessions = L(K.sessions);
  if (sessions && sessions.length > 0) {
    var changed = false;
    for (var i = 0; i < sessions.length; i++) {
      var s = sessions[i];
      // 태그 변환
      for (var t = 0; t < s.tags.length; t++) {
        if (tagMap[s.tags[t]]) {
          s.tags[t] = tagMap[s.tags[t]];
          changed = true;
        }
      }
      // 종목 ID 변환
      for (var e = 0; e < s.exercises.length; e++) {
        var oldId = s.exercises[e].exerciseId;
        if (idMap[oldId]) {
          s.exercises[e].exerciseId = idMap[oldId];
          changed = true;
        }
      }
    }
    if (changed) {
      S(K.sessions, sessions);
    }
  }

  // PR 데이터의 종목 ID 변환
  var prs = L(K.prs);
  if (prs) {
    var prChanged = false;
    var idMapKeys = Object.keys(idMap);
    for (var k = 0; k < idMapKeys.length; k++) {
      var oldKey = idMapKeys[k];
      var newKey = idMap[oldKey];
      if (prs[oldKey]) {
        prs[newKey] = (prs[newKey] || []).concat(prs[oldKey]);
        delete prs[oldKey];
        prChanged = true;
      }
    }
    if (prChanged) {
      S(K.prs, prs);
    }
  }

  S('wk_migrated_v2', true);
}

// ── 종목 아이콘 관리 ──
function getExerciseIcons() {
  return L(K.exerciseIcons) || {};
}

function setExerciseIcon(exerciseId, url) {
  var icons = getExerciseIcons();
  if (url && url.trim()) {
    icons[exerciseId] = url.trim();
  } else {
    delete icons[exerciseId];
  }
  S(K.exerciseIcons, icons);
}

function getExerciseIcon(exerciseId) {
  var icons = getExerciseIcons();
  if (icons[exerciseId]) return icons[exerciseId];
  // 기본 아이콘 폴백: EXERCISES 마스터의 icon 필드
  var ex = EXERCISES.find(function(e) { return e.id === exerciseId; });
  return (ex && ex.icon) ? ex.icon : '';
}

// ── 종목 부위 오버라이드 ──
function getPartOverrides() {
  return L(K.partOverrides) || {};
}

function setPartOverride(exerciseId, newPartId) {
  var map = getPartOverrides();
  var original = EXERCISES.find(function(e) { return e.id === exerciseId; });
  if (original && original.bodyPart === newPartId) {
    delete map[exerciseId];
  } else {
    map[exerciseId] = newPartId;
  }
  S(K.partOverrides, map);
}

function removePartOverride(exerciseId) {
  var map = getPartOverrides();
  delete map[exerciseId];
  S(K.partOverrides, map);
}
