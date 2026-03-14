/* ═══ workout.js — 운동 진행 화면 ═══ */

var _currentSession = null;
var _selectedParts = [];
var _restTimer = null;        // {endTime, intervalId}
var _workoutStartTime = null;
var _restAnimFrame = null;

// ══ 화면 진입 ══
function renderWorkoutScreen() {
  var container = document.getElementById('workoutContent');
  if (!container) return;

  // 진행 중인 세션이 있으면 세트 입력 화면, 없으면 부위 선택
  if (_currentSession) {
    renderExerciseCards();
  } else {
    renderPartSelector();
  }
}

// ══ 부위 선택 ══
function renderPartSelector() {
  var container = document.getElementById('workoutContent');
  _selectedParts = [];

  var html =
    '<div class="part-selector">' +
      '<div class="part-selector-title">오늘의 운동</div>' +
      '<div class="part-selector-sub">부위를 순서대로 선택하세요</div>' +
      '<div class="part-tags" id="partTags">';

  for (var i = 0; i < BODY_PARTS.length; i++) {
    var p = BODY_PARTS[i];
    html +=
      '<button class="part-tag" id="pt-' + p.id + '" onclick="togglePart(\'' + p.id + '\')" ' +
        'style="--c:' + p.color + ';--bg:' + p.bg + '">' +
        p.name +
      '</button>';
  }

  html +=
      '</div>' +
      '<div class="part-selected-order" id="partOrder"></div>' +
      '<button class="start-workout-btn" id="startWorkoutBtn" onclick="startWorkout()" disabled>운동 시작</button>' +
    '</div>';

  container.innerHTML = html;
  updateWorkoutHeader(false);
}

function togglePart(partId) {
  var idx = _selectedParts.indexOf(partId);
  var el = document.getElementById('pt-' + partId);

  if (idx >= 0) {
    _selectedParts.splice(idx, 1);
    if (el) el.classList.remove('selected');
  } else {
    _selectedParts.push(partId);
    if (el) el.classList.add('selected');
  }

  // 순서 표시 업데이트
  var orderEl = document.getElementById('partOrder');
  if (orderEl) {
    if (_selectedParts.length === 0) {
      orderEl.innerHTML = '';
    } else {
      var names = [];
      for (var i = 0; i < _selectedParts.length; i++) {
        var p = getBodyPart(_selectedParts[i]);
        names.push('<span class="part-order-chip" style="background:' + p.color + '">' + (i + 1) + '. ' + p.name + '</span>');
      }
      orderEl.innerHTML = names.join(' → ');
    }
  }

  // 시작 버튼 활성화
  var btn = document.getElementById('startWorkoutBtn');
  if (btn) btn.disabled = _selectedParts.length === 0;
}

// ══ 운동 시작 ══
function startWorkout() {
  if (_selectedParts.length === 0) return;

  _workoutStartTime = Date.now();

  // 세션 객체 생성
  _currentSession = {
    id: genId(),
    date: today(),
    startTime: _workoutStartTime,
    endTime: null,
    tags: _selectedParts.slice(),
    exercises: [],
    totalVolume: 0,
    totalVolumeExWarmup: 0,
    totalCalories: 0,
    durationMin: 0,
    memo: ''
  };

  // 선택 순서대로 종목 추가
  var sortIdx = 0;
  for (var i = 0; i < _selectedParts.length; i++) {
    var exs = getExercisesByPart(_selectedParts[i]);
    for (var j = 0; j < exs.length; j++) {
      var ex = exs[j];
      var lastSets = getLastExerciseSets(ex.id);
      var sets = [];

      var numSets = ex.defaultSets;
      if (lastSets && lastSets.length > numSets) numSets = lastSets.length;

      for (var s = 0; s < numSets; s++) {
        var prev = lastSets && lastSets[s] ? lastSets[s] : null;
        sets.push({
          weight: prev ? prev.weight : 0,
          reps: prev ? prev.reps : ex.defaultReps,
          done: false,
          isPR: false
        });
      }

      _currentSession.exercises.push({
        exerciseId: ex.id,
        sortOrder: sortIdx++,
        sets: sets
      });
    }
  }

  updateWorkoutHeader(true);
  renderExerciseCards();
  startWorkoutTimer();
}

// ══ 운동 경과 타이머 ══
var _workoutTimerInterval = null;

function startWorkoutTimer() {
  updateWorkoutTimerDisplay();
  _workoutTimerInterval = setInterval(updateWorkoutTimerDisplay, 1000);
}

function updateWorkoutTimerDisplay() {
  var el = document.getElementById('workoutTimer');
  if (!el || !_workoutStartTime) return;
  var elapsed = Math.floor((Date.now() - _workoutStartTime) / 1000);
  var min = Math.floor(elapsed / 60);
  var sec = elapsed % 60;
  el.textContent = String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}

function updateWorkoutHeader(inProgress) {
  var headerEl = document.getElementById('workoutHeader');
  if (!headerEl) return;

  if (inProgress) {
    headerEl.style.display = 'flex';
    // 태그 표시
    var tagsHtml = '';
    for (var i = 0; i < _selectedParts.length; i++) {
      var p = getBodyPart(_selectedParts[i]);
      tagsHtml += '<span class="wh-tag" style="background:' + p.color + '">' + p.name + '</span>';
    }
    document.getElementById('workoutTags').innerHTML = tagsHtml;
  } else {
    headerEl.style.display = 'none';
  }
}

// ══ 종목 카드 렌더링 ══
function renderExerciseCards() {
  var container = document.getElementById('workoutContent');
  if (!container || !_currentSession) return;

  var html = '';

  for (var i = 0; i < _currentSession.exercises.length; i++) {
    html += renderExerciseCard(i);
  }

  // 운동 완료 버튼
  html += '<button class="finish-btn" onclick="finishWorkout()">운동 완료 💪</button>';
  html += '<div style="height:100px"></div>';

  container.innerHTML = html;
}

function renderExerciseCard(exIdx) {
  var exData = _currentSession.exercises[exIdx];
  var meta = getExercise(exData.exerciseId);
  if (!meta) return '';

  var part = getBodyPart(meta.bodyPart);
  var partColor = part ? part.color : '#999';
  var isCardio = meta.equipment === 'cardio';

  // 이 종목의 오늘 볼륨 계산
  var todayVol = 0;
  var allDone = true;
  for (var i = 0; i < exData.sets.length; i++) {
    var s = exData.sets[i];
    if (s.done) todayVol += (s.weight || 0) * (s.reps || 0);
    if (!s.done) allDone = false;
  }

  // 지난번 볼륨
  var lastSets = getLastExerciseSets(meta.id);
  var lastVol = 0;
  if (lastSets) {
    for (var i = 0; i < lastSets.length; i++) {
      lastVol += (lastSets[i].weight || 0) * (lastSets[i].reps || 0);
    }
  }

  var cardClass = 'ex-card' + (allDone ? ' ex-done' : '');

  var html =
    '<div class="' + cardClass + '">' +
      '<div class="ex-card-header" onclick="toggleExCard(' + exIdx + ')">' +
        '<div class="ex-card-color" style="background:' + partColor + '"></div>' +
        '<div class="ex-card-info">' +
          '<div class="ex-card-name">' + meta.name + '</div>' +
          '<div class="ex-card-vol">' +
            (isCardio ? '' : formatNum(todayVol) + 'kg') +
            (lastVol > 0 && !isCardio ? ' <span class="ex-card-vol-prev">(지난번 ' + formatNum(lastVol) + ')</span>' : '') +
          '</div>' +
        '</div>' +
        (allDone ? '<span class="ex-card-check">✓</span>' : '') +
      '</div>' +
      '<div class="ex-card-body" id="exBody-' + exIdx + '">';

  if (isCardio) {
    // 유산소: 시간만 입력
    var curMin = exData.sets[0] ? exData.sets[0].reps : 0;
    html +=
      '<div class="cardio-input">' +
        '<input type="number" class="cardio-min-input" id="cardioMin-' + exIdx + '" ' +
          'value="' + (curMin || '') + '" placeholder="분" inputmode="numeric">' +
        '<span class="cardio-label">분</span>' +
        '<button class="set-check-btn' + (exData.sets[0] && exData.sets[0].done ? ' done' : '') + '" ' +
          'onclick="completeCardio(' + exIdx + ')">' +
          (exData.sets[0] && exData.sets[0].done ? '✓' : '') +
        '</button>' +
      '</div>';
  } else {
    // 세트 테이블
    html +=
      '<table class="set-table">' +
        '<thead><tr>' +
          '<th class="st-set">세트</th>' +
          '<th class="st-kg">KG</th>' +
          '<th class="st-reps">횟수</th>' +
          '<th class="st-chk"></th>' +
        '</tr></thead>' +
        '<tbody>';

    for (var s = 0; s < exData.sets.length; s++) {
      html += renderSetRow(exIdx, s);
    }

    html +=
        '</tbody>' +
      '</table>' +
      '<button class="add-set-btn" onclick="addSet(' + exIdx + ')">+ 세트 추가</button>';
  }

  html += '</div></div>';
  return html;
}

function renderSetRow(exIdx, setIdx) {
  var exData = _currentSession.exercises[exIdx];
  var setData = exData.sets[setIdx];
  var meta = getExercise(exData.exerciseId);
  var lastSets = getLastExerciseSets(exData.exerciseId);
  var prev = lastSets && lastSets[setIdx] ? lastSets[setIdx] : null;

  var rowClass = 'set-row';
  if (setData.done) rowClass += ' set-done';
  if (setData.isPR) rowClass += ' set-pr';

  var html =
    '<tr class="' + rowClass + '" id="setRow-' + exIdx + '-' + setIdx + '">' +
      '<td><span class="set-num">' + (setIdx + 1) + '</span></td>' +
      '<td>' +
        '<input type="number" class="set-input' + (setData.done ? ' filled' : '') + '" ' +
          'id="setW-' + exIdx + '-' + setIdx + '" ' +
          'value="' + (setData.weight || '') + '" ' +
          'placeholder="' + (prev ? prev.weight : '') + '" ' +
          'inputmode="decimal" ' +
          'onfocus="this.select()">' +
        (prev ? '<span class="prev-val">' + prev.weight + '</span>' : '') +
      '</td>' +
      '<td>' +
        '<input type="number" class="set-input' + (setData.done ? ' filled' : '') + '" ' +
          'id="setR-' + exIdx + '-' + setIdx + '" ' +
          'value="' + (setData.reps || '') + '" ' +
          'placeholder="' + (prev ? prev.reps : (meta ? meta.defaultReps : '')) + '" ' +
          'inputmode="numeric" ' +
          'onfocus="this.select()">' +
        (prev ? '<span class="prev-val">' + prev.reps + '</span>' : '') +
      '</td>' +
      '<td>' +
        '<button class="set-check-btn' + (setData.done ? ' done' : '') + '" ' +
          'onclick="completeSet(' + exIdx + ',' + setIdx + ')">' +
          (setData.done ? '✓' : '') +
        '</button>' +
      '</td>' +
    '</tr>';

  return html;
}

function toggleExCard(exIdx) {
  var body = document.getElementById('exBody-' + exIdx);
  if (body) body.classList.toggle('collapsed');
}

// ══ 세트 완료 ══
function completeSet(exIdx, setIdx) {
  var exData = _currentSession.exercises[exIdx];
  var setData = exData.sets[setIdx];

  // 입력값 읽기 (비어있으면 placeholder=지난번 값 사용)
  var wInput = document.getElementById('setW-' + exIdx + '-' + setIdx);
  var rInput = document.getElementById('setR-' + exIdx + '-' + setIdx);

  var w = parseFloat(wInput.value) || parseFloat(wInput.placeholder) || 0;
  var r = parseInt(rInput.value) || parseInt(rInput.placeholder) || 0;

  setData.weight = w;
  setData.reps = r;
  setData.done = !setData.done; // 토글

  if (setData.done) {
    // PR 판정
    if (w > 0 && r > 0) {
      var prResult = checkPR(exData.exerciseId, w, r, _currentSession.id);
      setData.isPR = prResult.isPR;

      if (prResult.isPR) {
        showPRFlash(exIdx, setIdx, prResult);
      }
    }

    // 휴식 타이머 시작
    var meta = getExercise(exData.exerciseId);
    if (meta && meta.defaultRestSec > 0) {
      startRestTimer(meta.defaultRestSec);
    }
  } else {
    setData.isPR = false;
  }

  // 자동저장
  autoSaveSession();

  // 해당 행만 업데이트
  var row = document.getElementById('setRow-' + exIdx + '-' + setIdx);
  if (row) {
    var tbody = row.parentNode;
    var tempDiv = document.createElement('tbody');
    tempDiv.innerHTML = renderSetRow(exIdx, setIdx);
    tbody.replaceChild(tempDiv.firstChild, row);
  }

  // 종목 카드 헤더 볼륨 업데이트
  renderExerciseCards();
}

function completeCardio(exIdx) {
  var exData = _currentSession.exercises[exIdx];
  var input = document.getElementById('cardioMin-' + exIdx);
  var min = parseInt(input.value) || 0;

  if (!exData.sets[0]) exData.sets[0] = { weight: 0, reps: 0, done: false, isPR: false };
  exData.sets[0].reps = min; // reps에 분 저장
  exData.sets[0].done = !exData.sets[0].done;

  autoSaveSession();
  renderExerciseCards();
}

function addSet(exIdx) {
  var exData = _currentSession.exercises[exIdx];
  var lastSet = exData.sets[exData.sets.length - 1];
  exData.sets.push({
    weight: lastSet ? lastSet.weight : 0,
    reps: lastSet ? lastSet.reps : 0,
    done: false,
    isPR: false
  });
  renderExerciseCards();
}

// ══ PR 플래시 ══
function showPRFlash(exIdx, setIdx, prResult) {
  var ex = _currentSession.exercises[exIdx];
  var meta = getExercise(ex.exerciseId);
  var name = meta ? meta.name : '';
  var set = ex.sets[setIdx];

  var toast = document.createElement('div');
  toast.className = 'pr-toast';
  toast.innerHTML = '🏆 ' + name + ' 개인 기록! ' + set.weight + 'kg × ' + set.reps + '회';
  document.body.appendChild(toast);

  setTimeout(function() { toast.classList.add('show'); }, 10);
  setTimeout(function() {
    toast.classList.remove('show');
    setTimeout(function() { toast.remove(); }, 300);
  }, 2500);
}

// ══ 휴식 타이머 ══
function startRestTimer(seconds) {
  dismissRestTimer();
  _restTimer = {
    endTime: Date.now() + seconds * 1000
  };
  renderRestTimer();
}

function renderRestTimer() {
  var el = document.getElementById('restTimerBar');
  if (!el || !_restTimer) return;

  var remaining = Math.max(0, _restTimer.endTime - Date.now());
  var sec = Math.ceil(remaining / 1000);

  if (sec <= 0) {
    el.innerHTML =
      '<div class="rest-timer done" onclick="dismissRestTimer()">' +
        '<span class="rest-timer-text">휴식 완료!</span>' +
      '</div>';
    return;
  }

  var min = Math.floor(sec / 60);
  var s = sec % 60;
  var display = (min > 0 ? min + ':' : '') + String(s).padStart(min > 0 ? 2 : 1, '0');

  el.innerHTML =
    '<div class="rest-timer active" onclick="dismissRestTimer()">' +
      '<span class="rest-timer-num">' + display + '</span>' +
      '<span class="rest-timer-text">휴식 중 · 탭하여 건너뛰기</span>' +
    '</div>';

  _restAnimFrame = requestAnimationFrame(renderRestTimer);
}

function dismissRestTimer() {
  _restTimer = null;
  if (_restAnimFrame) cancelAnimationFrame(_restAnimFrame);
  var el = document.getElementById('restTimerBar');
  if (el) el.innerHTML = '';
}

// ══ 자동저장 ══
function autoSaveSession() {
  if (!_currentSession) return;
  // 볼륨 계산
  var vol = 0, volEx = 0;
  for (var i = 0; i < _currentSession.exercises.length; i++) {
    var ex = _currentSession.exercises[i];
    var meta = getExercise(ex.exerciseId);
    if (meta && meta.equipment === 'cardio') continue;
    for (var j = 0; j < ex.sets.length; j++) {
      var s = ex.sets[j];
      if (s.done) {
        var v = (s.weight || 0) * (s.reps || 0);
        vol += v;
        volEx += v;
      }
    }
  }
  _currentSession.totalVolume = vol;
  _currentSession.totalVolumeExWarmup = volEx;

  // 임시 저장 (진행 중 세션)
  S('wk_current_session', _currentSession);
}

// ══ 운동 완료 ══
function finishWorkout() {
  if (!_currentSession) return;

  // 경과 시간
  _currentSession.endTime = Date.now();
  _currentSession.durationMin = Math.round((_currentSession.endTime - _currentSession.startTime) / 60000);

  // 칼로리
  _currentSession.totalCalories = estimateCalories(_currentSession);

  // 세션 저장
  saveSession(_currentSession);

  // 임시 저장 제거
  localStorage.removeItem('wk_current_session');

  // 타이머 정리
  if (_workoutTimerInterval) clearInterval(_workoutTimerInterval);
  dismissRestTimer();

  // 완료 요약 표시
  renderWorkoutSummary(_currentSession);

  // 상태 초기화
  var finishedSession = _currentSession;
  _currentSession = null;
  _selectedParts = [];
  _workoutStartTime = null;
}

// ══ 운동 완료 요약 ══
function renderWorkoutSummary(session) {
  var container = document.getElementById('workoutContent');
  if (!container) return;

  updateWorkoutHeader(false);

  // 태그 이름
  var tagNames = [];
  for (var i = 0; i < session.tags.length; i++) {
    var p = getBodyPart(session.tags[i]);
    tagNames.push(p ? p.name : session.tags[i]);
  }

  // PR 목록
  var prHtml = '';
  for (var i = 0; i < session.exercises.length; i++) {
    var ex = session.exercises[i];
    var meta = getExercise(ex.exerciseId);
    for (var j = 0; j < ex.sets.length; j++) {
      if (ex.sets[j].isPR) {
        prHtml +=
          '<div class="summary-pr">' +
            '<span class="summary-pr-icon">🏆</span>' +
            '<span class="summary-pr-name">' + (meta ? meta.name : '') + '</span>' +
            '<span class="summary-pr-val">' + ex.sets[j].weight + 'kg × ' + ex.sets[j].reps + '회</span>' +
          '</div>';
      }
    }
  }

  // 지난번 비교
  var lastSession = getLastSimilarSession(session.tags);
  var volDiff = '';
  if (lastSession && lastSession.id !== session.id) {
    var diff = session.totalVolumeExWarmup - (lastSession.totalVolumeExWarmup || 0);
    if (diff > 0) volDiff = '<span class="vol-up">+' + formatNum(diff) + 'kg ↑</span>';
    else if (diff < 0) volDiff = '<span class="vol-down">' + formatNum(diff) + 'kg ↓</span>';
  }

  // 종목 수, 세트 수
  var exCount = session.exercises.length;
  var setCount = 0;
  for (var i = 0; i < session.exercises.length; i++) {
    for (var j = 0; j < session.exercises[i].sets.length; j++) {
      if (session.exercises[i].sets[j].done) setCount++;
    }
  }

  var html =
    '<div class="workout-summary">' +
      '<div class="summary-title">운동 완료! 💪</div>' +
      '<div class="summary-tags">' + tagNames.join(' · ') + '</div>' +
      '<div class="summary-stats">' +
        '<div class="summary-stat">' +
          '<div class="summary-stat-num">' + formatDuration(session.durationMin) + '</div>' +
          '<div class="summary-stat-label">운동 시간</div>' +
        '</div>' +
        '<div class="summary-stat">' +
          '<div class="summary-stat-num">' + formatNum(session.totalVolumeExWarmup) + '<small>kg</small></div>' +
          volDiff +
          '<div class="summary-stat-label">총 볼륨</div>' +
        '</div>' +
        '<div class="summary-stat">' +
          '<div class="summary-stat-num">' + formatNum(session.totalCalories) + '<small>kcal</small></div>' +
          '<div class="summary-stat-label">소모 칼로리</div>' +
        '</div>' +
      '</div>' +
      '<div class="summary-detail">' + exCount + '종목 · ' + setCount + '세트</div>' +
      (prHtml ? '<div class="summary-prs"><div class="summary-prs-title">개인 기록 갱신</div>' + prHtml + '</div>' : '') +
      '<button class="summary-home-btn" onclick="showScreen(\'home\')">홈으로</button>' +
    '</div>';

  container.innerHTML = html;
}

// ══ 앱 복귀 시 진행 중 세션 복원 ══
function restoreSession() {
  var saved = L('wk_current_session');
  if (saved && saved.endTime === null) {
    _currentSession = saved;
    _selectedParts = saved.tags.slice();
    _workoutStartTime = saved.startTime;
    return true;
  }
  return false;
}
