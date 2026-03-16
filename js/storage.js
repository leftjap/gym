/* ═══ storage.js — 상수, 유틸, 종목 마스터 ═══ */

// ── LocalStorage 키 ──
const K = {
  sessions: 'wk_sessions',
  prs: 'wk_prs',
  inbody: 'wk_inbody',
  settings: 'wk_settings',
  customExercises: 'wk_custom_exercises',
  hiddenExercises: 'wk_hidden_exercises'
};

// ── LocalStorage 읽기/쓰기 ──
function L(key) {
  try { return JSON.parse(localStorage.getItem(key)); }
  catch { return null; }
}
function S(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
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
  { id: 'chest',    name: '가슴',    color: '#e85040', bg: '#fdf0ee' },
  { id: 'back',     name: '등',      color: '#4a90d9', bg: '#e8f0fe' },
  { id: 'lower',    name: '하체',    color: '#f0a848', bg: '#fef5e8' },
  { id: 'shoulder', name: '어깨',    color: '#8b5cf6', bg: '#f0ebfe' },
  { id: 'daily',    name: '데일리',  color: '#34c759', bg: '#e8f8ee' },
  { id: 'interval', name: '인터벌',  color: '#ff6b9d', bg: '#fee8f0' }
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
  // 가슴
  { id: 'incline_bench', name: '인클라인 벤치프레스', bodyPart: 'chest', equipment: 'barbell', defaultSets: 4, defaultReps: 8, defaultWeight: 30, defaultRestSec: 90, met: 5, sortOrder: 0 },

  // 등
  { id: 'lat_pulldown', name: '랫풀다운', bodyPart: 'back', equipment: 'cable', defaultSets: 3, defaultReps: 12, defaultWeight: 30, defaultRestSec: 90, met: 4, sortOrder: 0 },
  { id: 'seated_row', name: '시티드 로우', bodyPart: 'back', equipment: 'cable', defaultSets: 3, defaultReps: 12, defaultWeight: 30, defaultRestSec: 90, met: 4, sortOrder: 1 },
  { id: 'face_pull', name: '페이스 풀', bodyPart: 'back', equipment: 'cable', defaultSets: 3, defaultReps: 15, defaultWeight: 15, defaultRestSec: 60, met: 3, sortOrder: 2 },
  { id: 'barbell_row', name: '바벨 로우', bodyPart: 'back', equipment: 'barbell', defaultSets: 3, defaultReps: 10, defaultWeight: 30, defaultRestSec: 90, met: 5, sortOrder: 3 },
  { id: 'deadlift', name: '데드리프트', bodyPart: 'back', equipment: 'barbell', defaultSets: 3, defaultReps: 5, defaultWeight: 50, defaultRestSec: 120, met: 6, sortOrder: 4 },

  // 하체
  { id: 'leg_extension', name: '레그 익스텐션', bodyPart: 'lower', equipment: 'machine', defaultSets: 4, defaultReps: 12, defaultWeight: 25, defaultRestSec: 60, met: 4, sortOrder: 0 },
  { id: 'leg_curl', name: '레그 컬', bodyPart: 'lower', equipment: 'machine', defaultSets: 3, defaultReps: 12, defaultWeight: 20, defaultRestSec: 60, met: 4, sortOrder: 1 },
  { id: 'barbell_squat', name: '바벨 백 스쿼트', bodyPart: 'lower', equipment: 'barbell', defaultSets: 4, defaultReps: 5, defaultWeight: 40, defaultRestSec: 120, met: 6, sortOrder: 2 },
  { id: 'leg_press', name: '레그 프레스', bodyPart: 'lower', equipment: 'machine', defaultSets: 4, defaultReps: 10, defaultWeight: 80, defaultRestSec: 90, met: 5, sortOrder: 3 },

  // 어깨
  { id: 'ohp', name: '오버헤드 프레스', bodyPart: 'shoulder', equipment: 'barbell', defaultSets: 4, defaultReps: 8, defaultWeight: 20, defaultRestSec: 90, met: 5, sortOrder: 0 },
  { id: 'side_lateral', name: '사이드 레터럴 레이즈', bodyPart: 'shoulder', equipment: 'dumbbell', defaultSets: 3, defaultReps: 15, defaultWeight: 5, defaultRestSec: 60, met: 3, sortOrder: 1 },

  // 데일리
  { id: 'wrist_curl', name: '바벨 리스트 컬', bodyPart: 'daily', equipment: 'barbell', defaultSets: 3, defaultReps: 15, defaultWeight: 15, defaultRestSec: 45, met: 3, sortOrder: 0 },
  { id: 'situp', name: '싯업', bodyPart: 'daily', equipment: 'bodyweight', defaultSets: 3, defaultReps: 20, defaultWeight: 0, defaultRestSec: 45, met: 4, sortOrder: 1 },

  // 인터벌 (유산소 — reps 사용하지 않음, durationMin 별도 입력)
  { id: 'running', name: '러닝', bodyPart: 'interval', equipment: 'cardio', defaultSets: 1, defaultReps: 0, defaultWeight: 0, defaultRestSec: 0, met: 9, sortOrder: 0 },

  // 데일리 추가 종목
  { id: 'barbell_curl', name: '바벨 컬', bodyPart: 'daily', equipment: 'barbell', defaultSets: 3, defaultReps: 12, defaultWeight: 15, defaultRestSec: 60, met: 3, sortOrder: 3 }
];

// ── 종목 조회 헬퍼 ──
function getExercise(id) {
  var found = EXERCISES.find(function(e) { return e.id === id; });
  if (found) return found;
  var custom = L(K.customExercises) || [];
  return custom.find(function(e) { return e.id === id; }) || null;
}

function getExercisesByPart(partId) {
  var hidden = L(K.hiddenExercises) || [];
  var base = EXERCISES.filter(function(e) {
    return e.bodyPart === partId && hidden.indexOf(e.id) < 0;
  });
  var custom = (L(K.customExercises) || []).filter(function(e) {
    return e.bodyPart === partId;
  });
  return base.concat(custom).sort(function(a, b) {
    return (a.sortOrder || 0) - (b.sortOrder || 0);
  });
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

// ── 더미 데이터 (개발용) ──
function initDummyData() {
  if (L(K.sessions) && L(K.sessions).length > 0) return;

  var sessions = [
    {
      id: 'demo_1',
      date: '2026-03-03',
      startTime: new Date('2026-03-03T18:00:00').getTime(),
      endTime: new Date('2026-03-03T19:05:00').getTime(),
      tags: ['lower', 'daily', 'interval'],
      exercises: [
        { exerciseId: 'leg_extension', sortOrder: 0, sets: [
          { weight: 20, reps: 15, done: true, isPR: false, restSec: 90 },
          { weight: 30, reps: 12, done: true, isPR: false, restSec: 90 },
          { weight: 40, reps: 10, done: true, isPR: false, restSec: 90 },
          { weight: 40, reps: 10, done: true, isPR: false, restSec: 90 }
        ]},
        { exerciseId: 'leg_curl', sortOrder: 1, sets: [
          { weight: 20, reps: 12, done: true, isPR: false, restSec: 90 },
          { weight: 25, reps: 12, done: true, isPR: false, restSec: 90 },
          { weight: 30, reps: 10, done: true, isPR: false, restSec: 90 }
        ]},
        { exerciseId: 'barbell_squat', sortOrder: 2, sets: [
          { weight: 40, reps: 10, done: true, isPR: false, restSec: 120 },
          { weight: 50, reps: 8, done: true, isPR: false, restSec: 120 },
          { weight: 60, reps: 6, done: true, isPR: true, restSec: 120 },
          { weight: 60, reps: 6, done: true, isPR: false, restSec: 120 }
        ]},
        { exerciseId: 'barbell_curl', sortOrder: 3, sets: [
          { weight: 15, reps: 12, done: true, isPR: false, restSec: 60 },
          { weight: 20, reps: 10, done: true, isPR: false, restSec: 60 },
          { weight: 20, reps: 10, done: true, isPR: false, restSec: 60 }
        ]},
        { exerciseId: 'situp', sortOrder: 4, sets: [
          { weight: 0, reps: 20, done: true, isPR: false, restSec: 60 },
          { weight: 0, reps: 20, done: true, isPR: false, restSec: 60 },
          { weight: 0, reps: 20, done: true, isPR: false, restSec: 60 }
        ]},
        { exerciseId: 'running', sortOrder: 5, sets: [
          { weight: 0, reps: 15, done: true, isPR: false, restSec: 0 }
        ]}
      ],
      totalVolume: 3540,
      totalCalories: 320,
      durationMin: 65,
      memo: ''
    },
    {
      id: 'demo_2',
      date: '2026-03-05',
      startTime: new Date('2026-03-05T18:30:00').getTime(),
      endTime: new Date('2026-03-05T19:40:00').getTime(),
      tags: ['chest', 'back', 'daily', 'interval'],
      exercises: [
        { exerciseId: 'incline_bench', sortOrder: 0, sets: [
          { weight: 30, reps: 10, done: true, isPR: false, restSec: 90 },
          { weight: 40, reps: 8, done: true, isPR: false, restSec: 90 },
          { weight: 50, reps: 6, done: true, isPR: true, restSec: 90 },
          { weight: 50, reps: 6, done: true, isPR: false, restSec: 90 }
        ]},
        { exerciseId: 'lat_pulldown', sortOrder: 1, sets: [
          { weight: 30, reps: 12, done: true, isPR: false, restSec: 90 },
          { weight: 40, reps: 10, done: true, isPR: false, restSec: 90 },
          { weight: 40, reps: 10, done: true, isPR: false, restSec: 90 }
        ]},
        { exerciseId: 'seated_row', sortOrder: 2, sets: [
          { weight: 30, reps: 12, done: true, isPR: false, restSec: 90 },
          { weight: 35, reps: 10, done: true, isPR: false, restSec: 90 },
          { weight: 40, reps: 10, done: true, isPR: true, restSec: 90 }
        ]},
        { exerciseId: 'face_pull', sortOrder: 3, sets: [
          { weight: 15, reps: 15, done: true, isPR: false, restSec: 60 },
          { weight: 15, reps: 15, done: true, isPR: false, restSec: 60 },
          { weight: 20, reps: 12, done: true, isPR: true, restSec: 60 }
        ]},
        { exerciseId: 'barbell_curl', sortOrder: 4, sets: [
          { weight: 20, reps: 12, done: true, isPR: false, restSec: 60 },
          { weight: 20, reps: 12, done: true, isPR: false, restSec: 60 },
          { weight: 25, reps: 10, done: true, isPR: true, restSec: 60 }
        ]},
        { exerciseId: 'situp', sortOrder: 5, sets: [
          { weight: 0, reps: 25, done: true, isPR: false, restSec: 60 },
          { weight: 0, reps: 25, done: true, isPR: false, restSec: 60 },
          { weight: 0, reps: 25, done: true, isPR: false, restSec: 60 }
        ]},
        { exerciseId: 'running', sortOrder: 6, sets: [
          { weight: 0, reps: 15, done: true, isPR: false, restSec: 0 }
        ]}
      ],
      totalVolume: 3755,
      totalCalories: 345,
      durationMin: 70,
      memo: ''
    },
    {
      id: 'demo_3',
      date: '2026-03-08',
      startTime: new Date('2026-03-08T10:00:00').getTime(),
      endTime: new Date('2026-03-08T11:10:00').getTime(),
      tags: ['lower', 'shoulder', 'daily', 'interval'],
      exercises: [
        { exerciseId: 'leg_extension', sortOrder: 0, sets: [
          { weight: 25, reps: 15, done: true, isPR: false, restSec: 90 },
          { weight: 35, reps: 12, done: true, isPR: false, restSec: 90 },
          { weight: 45, reps: 10, done: true, isPR: true, restSec: 90 },
          { weight: 45, reps: 10, done: true, isPR: false, restSec: 90 }
        ]},
        { exerciseId: 'leg_curl', sortOrder: 1, sets: [
          { weight: 25, reps: 12, done: true, isPR: false, restSec: 90 },
          { weight: 30, reps: 12, done: true, isPR: true, restSec: 90 },
          { weight: 30, reps: 10, done: true, isPR: false, restSec: 90 }
        ]},
        { exerciseId: 'leg_press', sortOrder: 2, sets: [
          { weight: 80, reps: 10, done: true, isPR: false, restSec: 120 },
          { weight: 100, reps: 8, done: true, isPR: false, restSec: 120 },
          { weight: 120, reps: 8, done: true, isPR: true, restSec: 120 },
          { weight: 120, reps: 6, done: true, isPR: false, restSec: 120 }
        ]},
        { exerciseId: 'ohp', sortOrder: 3, sets: [
          { weight: 20, reps: 10, done: true, isPR: false, restSec: 90 },
          { weight: 25, reps: 8, done: true, isPR: false, restSec: 90 },
          { weight: 30, reps: 6, done: true, isPR: true, restSec: 90 },
          { weight: 30, reps: 6, done: true, isPR: false, restSec: 90 }
        ]},
        { exerciseId: 'side_lateral', sortOrder: 4, sets: [
          { weight: 5, reps: 15, done: true, isPR: false, restSec: 60 },
          { weight: 7, reps: 12, done: true, isPR: false, restSec: 60 },
          { weight: 7, reps: 12, done: true, isPR: false, restSec: 60 }
        ]},
        { exerciseId: 'barbell_curl', sortOrder: 5, sets: [
          { weight: 20, reps: 12, done: true, isPR: false, restSec: 60 },
          { weight: 25, reps: 10, done: true, isPR: false, restSec: 60 },
          { weight: 25, reps: 10, done: true, isPR: false, restSec: 60 }
        ]},
        { exerciseId: 'situp', sortOrder: 6, sets: [
          { weight: 0, reps: 25, done: true, isPR: false, restSec: 60 },
          { weight: 0, reps: 25, done: true, isPR: false, restSec: 60 },
          { weight: 0, reps: 30, done: true, isPR: true, restSec: 60 }
        ]},
        { exerciseId: 'running', sortOrder: 7, sets: [
          { weight: 0, reps: 15, done: true, isPR: false, restSec: 0 }
        ]}
      ],
      totalVolume: 5765,
      totalCalories: 390,
      durationMin: 70,
      memo: ''
    },
    {
      id: 'demo_4',
      date: '2026-03-10',
      startTime: new Date('2026-03-10T18:00:00').getTime(),
      endTime: new Date('2026-03-10T19:15:00').getTime(),
      tags: ['chest', 'back', 'daily', 'interval'],
      exercises: [
        { exerciseId: 'incline_bench', sortOrder: 0, sets: [
          { weight: 30, reps: 10, done: true, isPR: false, restSec: 90 },
          { weight: 40, reps: 8, done: true, isPR: false, restSec: 90 },
          { weight: 50, reps: 7, done: true, isPR: true, restSec: 90 },
          { weight: 50, reps: 6, done: true, isPR: false, restSec: 90 }
        ]},
        { exerciseId: 'barbell_row', sortOrder: 1, sets: [
          { weight: 30, reps: 10, done: true, isPR: false, restSec: 90 },
          { weight: 40, reps: 8, done: true, isPR: false, restSec: 90 },
          { weight: 40, reps: 8, done: true, isPR: false, restSec: 90 }
        ]},
        { exerciseId: 'deadlift', sortOrder: 2, sets: [
          { weight: 50, reps: 8, done: true, isPR: false, restSec: 120 },
          { weight: 60, reps: 6, done: true, isPR: false, restSec: 120 },
          { weight: 70, reps: 5, done: true, isPR: true, restSec: 120 }
        ]},
        { exerciseId: 'lat_pulldown', sortOrder: 3, sets: [
          { weight: 35, reps: 12, done: true, isPR: false, restSec: 90 },
          { weight: 45, reps: 10, done: true, isPR: true, restSec: 90 },
          { weight: 45, reps: 10, done: true, isPR: false, restSec: 90 }
        ]},
        { exerciseId: 'barbell_curl', sortOrder: 4, sets: [
          { weight: 25, reps: 12, done: true, isPR: true, restSec: 60 },
          { weight: 25, reps: 10, done: true, isPR: false, restSec: 60 },
          { weight: 25, reps: 10, done: true, isPR: false, restSec: 60 }
        ]},
        { exerciseId: 'situp', sortOrder: 5, sets: [
          { weight: 0, reps: 30, done: true, isPR: false, restSec: 60 },
          { weight: 0, reps: 30, done: true, isPR: false, restSec: 60 },
          { weight: 0, reps: 30, done: true, isPR: false, restSec: 60 }
        ]},
        { exerciseId: 'running', sortOrder: 6, sets: [
          { weight: 0, reps: 15, done: true, isPR: false, restSec: 0 }
        ]}
      ],
      totalVolume: 4385,
      totalCalories: 360,
      durationMin: 75,
      memo: ''
    },
    {
      id: 'demo_5',
      date: '2026-03-12',
      startTime: new Date('2026-03-12T18:00:00').getTime(),
      endTime: new Date('2026-03-12T19:00:00').getTime(),
      tags: ['lower', 'daily', 'interval'],
      exercises: [
        { exerciseId: 'leg_extension', sortOrder: 0, sets: [
          { weight: 25, reps: 15, done: true, isPR: false, restSec: 90 },
          { weight: 35, reps: 12, done: true, isPR: false, restSec: 90 },
          { weight: 45, reps: 10, done: true, isPR: false, restSec: 90 },
          { weight: 50, reps: 8, done: true, isPR: true, restSec: 90 }
        ]},
        { exerciseId: 'leg_curl', sortOrder: 1, sets: [
          { weight: 25, reps: 12, done: true, isPR: false, restSec: 90 },
          { weight: 30, reps: 12, done: true, isPR: false, restSec: 90 },
          { weight: 35, reps: 10, done: true, isPR: true, restSec: 90 }
        ]},
        { exerciseId: 'barbell_squat', sortOrder: 2, sets: [
          { weight: 40, reps: 10, done: true, isPR: false, restSec: 120 },
          { weight: 60, reps: 8, done: true, isPR: true, restSec: 120 },
          { weight: 60, reps: 8, done: true, isPR: false, restSec: 120 },
          { weight: 60, reps: 6, done: true, isPR: false, restSec: 120 }
        ]},
        { exerciseId: 'barbell_curl', sortOrder: 3, sets: [
          { weight: 25, reps: 12, done: true, isPR: false, restSec: 60 },
          { weight: 25, reps: 12, done: true, isPR: false, restSec: 60 },
          { weight: 25, reps: 10, done: true, isPR: false, restSec: 60 }
        ]},
        { exerciseId: 'situp', sortOrder: 4, sets: [
          { weight: 0, reps: 30, done: true, isPR: false, restSec: 60 },
          { weight: 0, reps: 30, done: true, isPR: false, restSec: 60 },
          { weight: 0, reps: 30, done: true, isPR: false, restSec: 60 }
        ]},
        { exerciseId: 'running', sortOrder: 5, sets: [
          { weight: 0, reps: 15, done: true, isPR: false, restSec: 0 }
        ]}
      ],
      totalVolume: 4475,
      totalCalories: 340,
      durationMin: 60,
      memo: ''
    },
    {
      id: 'demo_6',
      date: '2026-03-14',
      startTime: new Date('2026-03-14T18:30:00').getTime(),
      endTime: new Date('2026-03-14T19:45:00').getTime(),
      tags: ['chest', 'back', 'daily', 'interval'],
      exercises: [
        { exerciseId: 'incline_bench', sortOrder: 0, sets: [
          { weight: 35, reps: 10, done: true, isPR: true, restSec: 90 },
          { weight: 45, reps: 8, done: true, isPR: true, restSec: 90 },
          { weight: 55, reps: 5, done: true, isPR: true, restSec: 90 },
          { weight: 50, reps: 7, done: true, isPR: false, restSec: 90 }
        ]},
        { exerciseId: 'seated_row', sortOrder: 1, sets: [
          { weight: 35, reps: 12, done: true, isPR: false, restSec: 90 },
          { weight: 40, reps: 10, done: true, isPR: false, restSec: 90 },
          { weight: 45, reps: 10, done: true, isPR: true, restSec: 90 }
        ]},
        { exerciseId: 'face_pull', sortOrder: 2, sets: [
          { weight: 20, reps: 15, done: true, isPR: true, restSec: 60 },
          { weight: 20, reps: 15, done: true, isPR: false, restSec: 60 },
          { weight: 20, reps: 12, done: true, isPR: false, restSec: 60 }
        ]},
        { exerciseId: 'deadlift', sortOrder: 3, sets: [
          { weight: 60, reps: 6, done: true, isPR: false, restSec: 120 },
          { weight: 70, reps: 5, done: true, isPR: false, restSec: 120 },
          { weight: 80, reps: 4, done: true, isPR: true, restSec: 120 }
        ]},
        { exerciseId: 'barbell_curl', sortOrder: 4, sets: [
          { weight: 25, reps: 12, done: true, isPR: false, restSec: 60 },
          { weight: 30, reps: 8, done: true, isPR: true, restSec: 60 },
          { weight: 25, reps: 10, done: true, isPR: false, restSec: 60 }
        ]},
        { exerciseId: 'situp', sortOrder: 5, sets: [
          { weight: 0, reps: 30, done: true, isPR: false, restSec: 60 },
          { weight: 0, reps: 30, done: true, isPR: false, restSec: 60 },
          { weight: 5, reps: 20, done: true, isPR: true, restSec: 60 }
        ]},
        { exerciseId: 'running', sortOrder: 6, sets: [
          { weight: 0, reps: 15, done: true, isPR: false, restSec: 0 }
        ]}
      ],
      totalVolume: 4910,
      totalCalories: 375,
      durationMin: 75,
      memo: ''
    }
  ];

  // PR 기록 생성
  var prs = {};
  for (var i = 0; i < sessions.length; i++) {
    var sess = sessions[i];
    for (var j = 0; j < sess.exercises.length; j++) {
      var ex = sess.exercises[j];
      for (var k = 0; k < ex.sets.length; k++) {
        var set = ex.sets[k];
        if (set.isPR && set.weight > 0) {
          if (!prs[ex.exerciseId]) prs[ex.exerciseId] = { exerciseId: ex.exerciseId, records: [] };
          prs[ex.exerciseId].records.push({
            weight: set.weight,
            reps: set.reps,
            volume: set.weight * set.reps,
            estimated1RM: Math.round(set.weight * (1 + set.reps / 30) * 10) / 10,
            date: sess.date,
            sessionId: sess.id
          });
        }
      }
    }
  }

  // 인바디 기록
  var inbody = [
    { id: 'ib_demo_1', date: '2026-02-15', weight: 76.2, bodyFatPct: 19.5, muscleMass: 32.8, memo: '' },
    { id: 'ib_demo_2', date: '2026-03-01', weight: 75.5, bodyFatPct: 18.8, muscleMass: 33.1, memo: '' },
    { id: 'ib_demo_3', date: '2026-03-15', weight: 75.0, bodyFatPct: 18.2, muscleMass: 33.4, memo: '' }
  ];

  S(K.sessions, sessions);
  var prData = {};
  var prKeys = Object.keys(prs);
  for (var i = 0; i < prKeys.length; i++) {
    prData[prKeys[i]] = prs[prKeys[i]].records;
  }
  S(K.prs, prData);
  S(K.inbody, inbody);
}
