/* ═══ workout.js — 운동 진행 화면 ═══ */

var _currentSession = null;
var _selectedParts = [];
var _restTimer = null;        // {endTime, intervalId}
var _workoutStartTime = null;
var _restAnimFrame = null;
var _currentExerciseIndex = 0;  // 현재 보고 있는 종목 인덱스

// ══ 화면 진입 ══
function renderWorkoutScreen() {
  var container = document.getElementById('workoutContent');
  if (!container) return;

  var workoutHeader = document.getElementById('workoutHeader');

  // 진행 중인 세션이 있으면 세트 입력 화면, 없으면 부위 선택
  if (_currentSession) {
    if (workoutHeader) workoutHeader.style.display = 'flex';
    updateWorkoutHeader(true);
    updateBottomButton('workout');
    renderExerciseCards();
  } else {
    if (workoutHeader) workoutHeader.style.display = 'flex';
    updateWorkoutHeader(false);
    updateBottomButton('partSelect');
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
        names.push('<span class="part-order-chip" style="background:#6C6C6C">' + (i + 1) + '. ' + p.name + '</span>');
      }
      orderEl.innerHTML = names.join(' → ');
    }
  }

  // 하단 버튼 상태 업데이트
  if (_selectedParts.length > 0) {
    updateBottomButton('partSelectReady');
  } else {
    updateBottomButton('partSelect');
  }
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
  _currentExerciseIndex = 0;
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

  var timerEl = document.getElementById('workoutTimer');
  var tagsEl = document.getElementById('workoutTags');

  if (inProgress) {
    if (timerEl) timerEl.style.display = 'inline';
    if (tagsEl) {
      var tagsHtml = '';
      for (var i = 0; i < _selectedParts.length; i++) {
        var p = getBodyPart(_selectedParts[i]);
        tagsHtml += '<span class="wh-tag">' + p.name + '</span>';
      }
      tagsEl.innerHTML = tagsHtml;
    }
  } else {
    if (timerEl) timerEl.style.display = 'none';
    if (tagsEl) tagsEl.innerHTML = '';
  }
}

// ══ 종목 카드 렌더링 ══
function renderExerciseCards() {
  var container = document.getElementById('workoutContent');
  if (!container || !_currentSession) return;

  // 유효한 인덱스 확인
  if (_currentExerciseIndex >= _currentSession.exercises.length) {
    _currentExerciseIndex = _currentSession.exercises.length - 1;
  }
  if (_currentExerciseIndex < 0) _currentExerciseIndex = 0;

  var html = '';

  // 현재 종목 카드만 렌더링
  html += '<div id="exercise-cards">' + renderExerciseCard(_currentExerciseIndex) + '</div>';

  // 종목 네비게이션 버튼바
  html += renderExerciseNav();

  // 하단 고정 버튼과 겹치지 않도록 여백만
  html += '<div style="height:80px"></div>';

  container.innerHTML = html;
}

// ══ 종목 네비게이션 버튼바 ══
function renderExerciseNav() {
  var html = '<div class="exercise-nav">';

  for (var i = 0; i < _currentSession.exercises.length; i++) {
    var exData = _currentSession.exercises[i];
    var meta = getExercise(exData.exerciseId);
    var name = meta ? meta.name : exData.exerciseId;

    // 모든 세트 완료 여부
    var allDone = true;
    for (var j = 0; j < exData.sets.length; j++) {
      if (!exData.sets[j].done) {
        allDone = false;
        break;
      }
    }

    var btnClass = 'ex-nav-btn';
    if (i === _currentExerciseIndex) {
      btnClass += ' active';
    } else if (allDone) {
      btnClass += ' done';
    }

    var btnContent = name;
    if (allDone) btnContent = '✓ ' + name;

    html += '<button class="' + btnClass + '" onclick="switchExercise(' + i + ')">' + btnContent + '</button>';
  }

  html += '</div>';
  return html;
}

// ══ 종목 전환 ══
function switchExercise(exIdx) {
  if (exIdx < 0 || exIdx >= _currentSession.exercises.length) return;
  _currentExerciseIndex = exIdx;
  renderExerciseCards();
}

function renderExerciseCard(exIdx) {
  var exData = _currentSession.exercises[exIdx];
  var meta = getExercise(exData.exerciseId);
  if (!meta) return '';

  var part = getBodyPart(meta.bodyPart);
  var partColor = part ? part.color : '#999';
  var isCardio = meta.equipment === 'cardio';

  // 오늘 볼륨 계산
  var todayVol = 0;
  var allDone = true;
  var doneCount = 0;
  for (var i = 0; i < exData.sets.length; i++) {
    var s = exData.sets[i];
    if (s.done) {
      todayVol += (s.weight || 0) * (s.reps || 0);
      doneCount++;
    }
    if (!s.done) allDone = false;
  }

  // 지난번 데이터
  var lastSets = getLastExerciseSets(meta.id);
  var lastVol = 0;
  var lastSetCount = 0;
  if (lastSets) {
    lastSetCount = lastSets.length;
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
          (function() {
            if (isCardio) return '';
            if (!lastSets || lastSets.length === 0) return '<div class="ex-card-motivate">첫 기록을 만들어보세요!</div>';
            // 지난번 세션 날짜 찾기
            var sessions = getSessions();
            var lastDate = '';
            for (var si = sessions.length - 1; si >= 0; si--) {
              var sess = sessions[si];
              if (sess.id === _currentSession.id) continue;
              for (var ei = 0; ei < sess.exercises.length; ei++) {
                if (sess.exercises[ei].exerciseId === meta.id) {
                  lastDate = sess.date;
                  break;
                }
              }
              if (lastDate) break;
            }
            var dateDisplay = lastDate ? formatDate(lastDate) : '';
            return '<div class="ex-card-motivate">' +
              (dateDisplay ? dateDisplay + ' ' : '') +
              lastSetCount + '세트 총 <strong>' + formatNum(lastVol) + 'kg</strong>을 들었어요' +
            '</div>';
          })() +
        '</div>' +
        (allDone ? '<span class="ex-card-check">✓</span>' : '') +
      '</div>' +
      '<div class="ex-card-body" id="exBody-' + exIdx + '">';

  if (isCardio) {
    var curMin = exData.sets[0] ? exData.sets[0].reps : 0;
    html +=
      '<div class="cardio-input">' +
        '<input type="number" class="cardio-min-input" id="cardioMin-' + exIdx + '" ' +
          'value="' + (curMin || '') + '" placeholder="분" inputmode="numeric">' +
        '<span class="cardio-label">분</span>' +
        '<button class="set-check-btn' + (exData.sets[0] && exData.sets[0].done ? ' done' : '') + '" ' +
          'onclick="completeCardio(' + exIdx + ')">' +
          '✓' +
        '</button>' +
      '</div>';
  } else {
    // 진행 바
    html += renderSetProgress(todayVol, lastVol, lastSetCount, doneCount);

    // 세트 테이블: 완료된 세트 + 다음 1개만
    html +=
      '<table class="set-table">' +
        '<thead><tr>' +
          '<th class="st-set"></th>' +
          '<th class="st-kg">KG</th>' +
          '<th class="st-gap"></th>' +
          '<th class="st-reps">횟수</th>' +
          '<th class="st-chk"></th>' +
        '</tr></thead>' +
        '<tbody>';

    var nextShown = false;
    for (var s = 0; s < exData.sets.length; s++) {
      if (exData.sets[s].done) {
        html += renderSetRow(exIdx, s);
      } else if (!nextShown) {
        html += renderSetRow(exIdx, s);
        nextShown = true;
      }
      // 나머지 미완료 세트는 렌더하지 않음
    }

    // 모든 기존 세트가 완료되었으면 새 세트 1개를 자동 추가하여 표시
    if (!nextShown && allDone) {
      // 아직 추가하지 않음 — 사용자가 체크하면 completeSet에서 처리
    }

    html +=
        '</tbody>' +
      '</table>';
  }

  html += '</div></div>';
  return html;
}

function renderSetProgress(todayVol, lastVol, lastSetCount, doneCount) {
  var html = '<div class="set-progress">';

  // 지난번 데이터가 없으면
  if (lastVol <= 0) {
    html +=
      '<div class="set-progress-text">' +
        '<span style="color:var(--icon-inactive);font-size:12px">첫 기록</span>' +
        '<span class="set-progress-vol">' + formatNum(todayVol) + 'kg</span>' +
      '</div>';
    html += '</div>';
    return html;
  }

  var pct = Math.round((todayVol / lastVol) * 100);
  var barPct = Math.min(pct, 100);
  var isBurst = pct >= 100 && todayVol > 0;
  var diff = todayVol - lastVol;

  if (isBurst && diff > 0) {
    html += '<div class="set-progress-burst">🔥 지난번 돌파! +' + formatNum(diff) + 'kg</div>';
  }

  html +=
    '<div class="set-progress-bar-wrap">' +
      '<div class="set-progress-bar' + (isBurst ? ' burst' : '') + '" style="width:' + barPct + '%"></div>' +
    '</div>' +
    '<div class="set-progress-text">' +
      '<span class="set-progress-pct' + (isBurst ? ' burst' : '') + '">' + (todayVol > 0 ? pct + '%' : '') + '</span>' +
      '<span class="set-progress-vol">' + formatNum(todayVol) + ' / ' + formatNum(lastVol) + 'kg</span>' +
    '</div>';

  html += '</div>';
  return html;
}

// ══ 중량/횟수 증감 ══
function getWeightDelta(exerciseId) {
  var meta = getExercise(exerciseId);
  if (!meta) return 5;
  var eq = meta.equipment;
  // barbell, machine, cable → 5kg / dumbbell, bodyweight → 1kg
  if (eq === 'dumbbell' || eq === 'bodyweight') return 1;
  return 5;
}

function adjustSetValue(exIdx, setIdx, field, direction) {
  var exData = _currentSession.exercises[exIdx];
  if (!exData) return;
  var setData = exData.sets[setIdx];
  if (!setData) return;
  if (setData.done) return; // 완료된 세트는 조정 불가

  var inputId = (field === 'weight') ? 'setW-' + exIdx + '-' + setIdx : 'setR-' + exIdx + '-' + setIdx;
  var inputEl = document.getElementById(inputId);
  if (!inputEl) return;

  var current = parseFloat(inputEl.value) || 0;
  var delta;

  if (field === 'weight') {
    delta = getWeightDelta(exData.exerciseId) * direction;
  } else {
    delta = 1 * direction; // reps는 항상 ±1
  }

  var newVal = Math.max(0, current + delta);

  // 소수점 처리 (2.5kg 단위 등 향후 대비)
  newVal = Math.round(newVal * 10) / 10;

  inputEl.value = newVal;

  // 세션 데이터에도 반영
  if (field === 'weight') {
    setData.weight = newVal;
  } else {
    setData.reps = newVal;
  }
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
        '<div class="set-adjust-group">' +
          '<button class="set-adjust-btn" onclick="adjustSetValue(' + exIdx + ',' + setIdx + ',\'weight\',-1)">－</button>' +
          '<input type="text" class="set-input' + (setData.done ? ' filled' : '') + '" ' +
            'id="setW-' + exIdx + '-' + setIdx + '" ' +
            'value="' + (setData.weight || '') + '" ' +
            'placeholder="' + (prev ? prev.weight : '') + '" ' +
            'inputmode="decimal" ' +
            'onfocus="this.select()">' +
          '<button class="set-adjust-btn" onclick="adjustSetValue(' + exIdx + ',' + setIdx + ',\'weight\',1)">＋</button>' +
        '</div>' +
      '</td>' +
      '<td class="st-gap"></td>' +
      '<td>' +
        '<div class="set-adjust-group">' +
          '<button class="set-adjust-btn" onclick="adjustSetValue(' + exIdx + ',' + setIdx + ',\'reps\',-1)">－</button>' +
          '<input type="text" class="set-input' + (setData.done ? ' filled' : '') + '" ' +
            'id="setR-' + exIdx + '-' + setIdx + '" ' +
            'value="' + (setData.reps || '') + '" ' +
            'placeholder="' + (prev ? prev.reps : (meta ? meta.defaultReps : '')) + '" ' +
            'inputmode="numeric" ' +
            'onfocus="this.select()">' +
          '<button class="set-adjust-btn" onclick="adjustSetValue(' + exIdx + ',' + setIdx + ',\'reps\',1)">＋</button>' +
        '</div>' +
      '</td>' +
      '<td>' +
        '<button class="set-check-btn' + (setData.done ? ' done' : '') + '" ' +
          'onclick="completeSet(' + exIdx + ',' + setIdx + ')">' +
          '✓' +
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

  // 세트 완료 시: 모든 기존 세트가 완료되었으면 새 세트 자동 추가
  if (setData.done) {
    var exData2 = _currentSession.exercises[exIdx];
    var allSetsDone = true;
    for (var k = 0; k < exData2.sets.length; k++) {
      if (!exData2.sets[k].done) { allSetsDone = false; break; }
    }
    if (allSetsDone) {
      var lastSet = exData2.sets[exData2.sets.length - 1];
      exData2.sets.push({
        weight: lastSet ? lastSet.weight : 0,
        reps: lastSet ? lastSet.reps : 0,
        done: false,
        isPR: false
      });
    }
  }

  // 전체 다시 렌더
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

  var el = document.getElementById('restTimerBar');
  if (!el) return;

  // 초기 HTML 한 번만 세팅
  el.innerHTML =
    '<div class="rest-timer active">' +
      '<span class="rest-timer-num" id="restTimerNum"></span>' +
      '<span class="rest-timer-text">탭해서 건너뛰기</span>' +
    '</div>';

  // 컨테이너에 클릭 이벤트 등록 (innerHTML 교체와 무관)
  el.onclick = function() {
    dismissRestTimer();
  };

  renderRestTimer();
}

function renderRestTimer() {
  if (!_restTimer) return;

  var el = document.getElementById('restTimerBar');
  if (!el) return;

  var remaining = Math.max(0, _restTimer.endTime - Date.now());
  var sec = Math.ceil(remaining / 1000);

  var numEl = document.getElementById('restTimerNum');
  var timerDiv = el.querySelector('.rest-timer');

  if (sec <= 0) {
    // 완료 상태
    if (numEl) numEl.textContent = '완료';
    if (timerDiv) {
      timerDiv.className = 'rest-timer done';
      var textEl = timerDiv.querySelector('.rest-timer-text');
      if (textEl) textEl.textContent = '탭해서 닫기';
    }
    return; // 애니메이션 루프 중단
  }

  var min = Math.floor(sec / 60);
  var s = sec % 60;
  var display = (min > 0 ? min + ':' : '') + String(s).padStart(min > 0 ? 2 : 1, '0');

  if (numEl) numEl.textContent = display;

  _restAnimFrame = requestAnimationFrame(renderRestTimer);
}

function dismissRestTimer() {
  _restTimer = null;
  if (_restAnimFrame) {
    cancelAnimationFrame(_restAnimFrame);
    _restAnimFrame = null;
  }
  var el = document.getElementById('restTimerBar');
  if (el) {
    el.innerHTML = '';
    el.onclick = null;
  }
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

  // 헤더 숨기기
  var workoutHeader = document.getElementById('workoutHeader');
  if (workoutHeader) workoutHeader.style.display = 'none';

  // 완료 요약 표시
  renderWorkoutSummary(_currentSession);

  // 상태 초기화
  var finishedSession = _currentSession;
  _currentSession = null;
  _selectedParts = [];
  _workoutStartTime = null;
  _currentExerciseIndex = 0;
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
      '<div style="height:80px"></div>' +
    '</div>';

  container.innerHTML = html;
  updateBottomButton('summary');
}

// ══ 앱 복귀 시 진행 중 세션 복원 ══
function restoreSession() {
  var saved = L('wk_current_session');
  if (saved && saved.endTime === null) {
    _currentSession = saved;
    _selectedParts = saved.tags.slice();
    _workoutStartTime = saved.startTime;
    _currentExerciseIndex = 0;
    return true;
  }
  return false;
}

// ══ 뒤로가기 / 운동 취소 ══
function onWorkoutBack() {
  if (_currentSession) {
    cancelWorkout();
  } else {
    // 부위 선택 화면에서 뒤로가기 → 홈
    _selectedParts = [];
    showScreen('home');
  }
}

function cancelWorkout() {
  if (!confirm('운동을 취소하시겠습니까?\n기록이 저장되지 않습니다.')) return;

  // 임시 저장 제거
  localStorage.removeItem('wk_current_session');

  // 타이머 정리
  if (_workoutTimerInterval) clearInterval(_workoutTimerInterval);
  dismissRestTimer();

  // 상태 초기화
  _currentSession = null;
  _selectedParts = [];
  _workoutStartTime = null;
  _currentExerciseIndex = 0;

  showScreen('home');
}
