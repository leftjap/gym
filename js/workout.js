/* ═══ workout.js — 운동 진행 화면 ═══ */

var _currentSession = null;
var _selectedParts = [];
var _restTimer = null;        // {endTime, intervalId}
var _workoutStartTime = null;
var _restAnimFrame = null;
var _currentExerciseIndex = 0;  // 현재 보고 있는 종목 인덱스
var _isFinishing = false;  // finishWorkout 중복 실행 방지
var _headerFilterPart = null;  // 헤더 부위 탭 필터 (null이면 전체)

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
      '<div class="workout-timeline" id="partOrder"></div>' +
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

  // 타임라인 업데이트
  renderWorkoutTimeline();

  // 하단 버튼 상태 업데이트
  if (_selectedParts.length > 0) {
    updateBottomButton('partSelectReady');
  } else {
    updateBottomButton('partSelect');
  }
}

function renderWorkoutTimeline() {
  var orderEl = document.getElementById('partOrder');
  if (!orderEl) return;

  if (_selectedParts.length === 0) {
    orderEl.innerHTML = '<div class="workout-timeline-empty">부위를 선택하면 운동 순서가 표시됩니다</div>';
    return;
  }

  var html = '<div class="workout-timeline-title">운동 순서</div><div class="workout-timeline-list">';

  for (var i = 0; i < _selectedParts.length; i++) {
    var p = getBodyPart(_selectedParts[i]);
    var exercises = getExercisesByPart(_selectedParts[i]);
    var exNames = [];
    for (var j = 0; j < exercises.length; j++) {
      exNames.push(exercises[j].name);
    }

    html +=
      '<div class="workout-timeline-item">' +
        '<div class="workout-timeline-line">' +
          '<div class="workout-timeline-num">' + (i + 1) + '</div>' +
          '<div class="workout-timeline-connector"></div>' +
        '</div>' +
        '<div class="workout-timeline-content">' +
          '<div class="workout-timeline-part">' + p.name + '</div>' +
          '<div class="workout-timeline-exercises">' + exNames.join(', ') + '</div>' +
        '</div>' +
      '</div>';
  }

  html += '</div>';
  orderEl.innerHTML = html;
}

// ══ 운동 시작 ══
function startWorkout() {
  if (_selectedParts.length === 0) return;

  // 이미 진행 중인 세션이 있으면 중복 생성 방지
  if (_currentSession) {
    console.warn('이미 진행 중인 세션이 있습니다.');
    return;
  }

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
          weight: prev ? prev.weight : (ex.defaultWeight || 0),
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
  updateBottomButton('workout');
  _currentExerciseIndex = 0;
  _headerFilterPart = null;
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
      tagsEl.innerHTML = '<button class="wh-settings-btn" onclick="showWorkoutMenuSheet()">⋮</button>';
    }
  } else {
    if (timerEl) timerEl.style.display = 'none';
    if (tagsEl) tagsEl.innerHTML = '';
  }
}

// ══ 부위 탭 클릭 → 해당 부위 종목만 네비에 표시 ══
function filterByPart(partId) {
  if (_headerFilterPart === partId) {
    // 같은 탭 재클릭 → 필터 해제 (전체 표시)
    _headerFilterPart = null;
  } else {
    _headerFilterPart = partId;
    // 해당 부위의 첫 번째 종목으로 자동 이동
    for (var i = 0; i < _currentSession.exercises.length; i++) {
      var meta = getExercise(_currentSession.exercises[i].exerciseId);
      if (meta && meta.bodyPart === partId) {
        _currentExerciseIndex = i;
        break;
      }
    }
  }
  renderExerciseCards();
}

// ══ 종목 카드 렌더링 ══
function renderExerciseCards() {
  var container = document.getElementById('workoutContent');
  if (!container || !_currentSession) return;

  if (_currentExerciseIndex >= _currentSession.exercises.length) {
    _currentExerciseIndex = _currentSession.exercises.length - 1;
  }
  if (_currentExerciseIndex < 0) _currentExerciseIndex = 0;

  // 현재 종목의 부위 판별 (세로 막대바 색상용)
  var currentExData = _currentSession.exercises[_currentExerciseIndex];
  var currentMeta = currentExData ? getExercise(currentExData.exerciseId) : null;
  var hasFilter = _headerFilterPart !== null;

  var html = '';

  // 1. 부위탭 + 종목네비 영역 (카드 없이 배치)
  html += '<div class="exercise-nav-area">';

  // 세로 막대바 (필터 활성 시 accent 색)
  html += '<div class="exercise-nav-area-bar' + (hasFilter ? ' active' : '') + '"></div>';

  html += '<div class="exercise-nav-area-content">';

  // 부위 탭 (여러 부위 선택 시에만 표시)
  if (_selectedParts.length > 1) {
    html += '<div class="exercise-nav-part-row">';
    for (var p = 0; p < _selectedParts.length; p++) {
      if (p > 0) html += '<span class="exercise-nav-pipe">|</span>';
      var partInfo = getBodyPart(_selectedParts[p]);
      var isActive = (_headerFilterPart === _selectedParts[p]);
      html += '<button class="exercise-nav-part-tab' + (isActive ? ' active' : '') + '" ' +
        'data-part-id="' + _selectedParts[p] + '" ' +
        'onclick="filterByPart(\'' + _selectedParts[p] + '\')">' +
        partInfo.name +
      '</button>';
    }
    html += '</div>';
  }

  // 종목 네비게이션
  html += renderExerciseNav();

  html += '</div>'; // exercise-nav-area-content
  html += '</div>'; // exercise-nav-area

  // 구분선
  html += '<div class="exercise-nav-area-divider"></div>';

  // 2. 현재 종목 카드
  html += '<div id="exercise-cards">' + renderExerciseCard(_currentExerciseIndex) + '</div>';

  // 하단 여백
  html += '<div style="height:80px"></div>';

  container.innerHTML = html;

  // 3. 종목 네비 버튼 롱프레스(종목 완료) 바인딩
  bindNavLongPress();

  // 4. 부위 탭 롱프레스(설정 진입) 바인딩
  bindPartTabLongPress();
}

// ══ 종목 네비게이션 버튼바 ══
function renderExerciseNav() {
  var html = '<div class="exercise-nav">';
  html += '<div class="exercise-nav-scroll" id="exNavScroll">';

  for (var i = 0; i < _currentSession.exercises.length; i++) {
    var exData = _currentSession.exercises[i];
    var meta = getExercise(exData.exerciseId);
    var name = meta ? meta.name : exData.exerciseId;

    if (_headerFilterPart && meta && meta.bodyPart !== _headerFilterPart) continue;

    var allDone = true;
    for (var j = 0; j < exData.sets.length; j++) {
      if (!exData.sets[j].done) { allDone = false; break; }
    }

    var btnClass = 'ex-nav-btn';
    if (i === _currentExerciseIndex) btnClass += ' active';
    else if (allDone) btnClass += ' done';

    var btnContent = allDone ? '✓ ' + name : name;

    html += '<button class="' + btnClass + '" data-ex-idx="' + i + '" ' +
      'onclick="switchExercise(' + i + ')">' +
      btnContent + '</button>';
  }

  html += '</div>';
  html += '</div>';
  return html;
}

// ══ 종목 전환 ══
function switchExercise(exIdx) {
  if (exIdx < 0 || exIdx >= _currentSession.exercises.length) return;
  _currentExerciseIndex = exIdx;
  renderExerciseCards();
}

// ══ 전체 종목 목록 액션시트 ══
function showExerciseListSheet() {
  if (!_currentSession) return;

  var buttons = [];
  for (var i = 0; i < _currentSession.exercises.length; i++) {
    var exData = _currentSession.exercises[i];
    var meta = getExercise(exData.exerciseId);
    var name = meta ? meta.name : exData.exerciseId;

    // 부위 필터 적용
    if (_headerFilterPart && meta && meta.bodyPart !== _headerFilterPart) continue;

    var allDone = true;
    for (var j = 0; j < exData.sets.length; j++) {
      if (!exData.sets[j].done) { allDone = false; break; }
    }

    var label = '';
    if (i === _currentExerciseIndex) {
      label = '▸ ' + name;
    } else if (allDone) {
      label = '✓ ' + name;
    } else {
      label = name;
    }

    (function(idx) {
      buttons.push({
        text: label,
        onClick: function() {
          switchExercise(idx);
        }
      });
    })(i);
  }

  var sheetTitle = '종목 선택';
  if (_headerFilterPart) {
    var partInfo = getBodyPart(_headerFilterPart);
    if (partInfo) sheetTitle = partInfo.name + ' 종목';
  }

  showActionSheet(sheetTitle, buttons);
}

// ══ 운동 메뉴 액션시트 ══
function showWorkoutMenuSheet() {
  if (!_currentSession) return;

  var buttons = [
    {
      text: '종목 전체 보기',
      onClick: function() {
        showExerciseListSheet();
      }
    },
    {
      text: '종목 설정',
      onClick: function() {
        openSettingsForPart(_selectedParts[0] || '');
      }
    }
  ];

  showActionSheet('운동 메뉴', buttons);
}

function renderExerciseCard(exIdx) {
  var exData = _currentSession.exercises[exIdx];
  var meta = getExercise(exData.exerciseId);
  if (!meta) return '';

  var isCardio = meta.equipment === 'cardio';
  var isBodyweight = meta.equipment === 'bodyweight';

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
  var lastCardioMin = 0;
  if (lastSets) {
    lastSetCount = lastSets.length;
    for (var i = 0; i < lastSets.length; i++) {
      lastVol += (lastSets[i].weight || 0) * (lastSets[i].reps || 0);
      if (isCardio) lastCardioMin += lastSets[i].reps || 0;
    }
  }

  // 지난번 날짜 조회
  var lastDate = '';
  var sessions = getSessions();
  for (var si = 0; si < sessions.length; si++) {
    var sess = sessions[si];
    if (_currentSession && sess.id === _currentSession.id) continue;
    for (var ei = 0; ei < sess.exercises.length; ei++) {
      if (sess.exercises[ei].exerciseId === meta.id) {
        lastDate = sess.date;
        break;
      }
    }
    if (lastDate) break;
  }
  var dateDisplay = lastDate ? formatDate(lastDate) : '';

  // 동기부여 문구 HTML
  var motivateHtml = '';
  if (isCardio) {
    if (lastCardioMin > 0) {
      motivateHtml = '<div class="ex-motivate-msg">' +
        (dateDisplay ? '<span class="ex-motivate-sub">' + dateDisplay + '</span>' : '') +
        '<span class="ex-motivate-main"><strong>' + lastCardioMin + '분</strong> 했어요</span>' +
      '</div>';
    } else {
      motivateHtml = '<div class="ex-motivate-msg"><span class="ex-motivate-main">첫 기록을 만들어보세요!</span></div>';
    }
  } else if (isBodyweight) {
    if (!lastSets || lastSets.length === 0) {
      motivateHtml = '<div class="ex-motivate-msg"><span class="ex-motivate-main">첫 기록을 만들어보세요!</span></div>';
    } else {
      var totalReps = 0;
      for (var i = 0; i < lastSets.length; i++) totalReps += lastSets[i].reps || 0;
      motivateHtml = '<div class="ex-motivate-msg">' +
        (dateDisplay ? '<span class="ex-motivate-sub">' + dateDisplay + '</span>' : '') +
        '<span class="ex-motivate-main">' + lastSetCount + '세트 총 <strong>' + totalReps + '회</strong> 했어요</span>' +
      '</div>';
    }
  } else {
    if (!lastSets || lastSets.length === 0) {
      motivateHtml = '<div class="ex-motivate-msg"><span class="ex-motivate-main">첫 기록을 만들어보세요!</span></div>';
    } else {
      motivateHtml = '<div class="ex-motivate-msg">' +
        (dateDisplay ? '<span class="ex-motivate-sub">' + dateDisplay + '</span>' : '') +
        '<span class="ex-motivate-main">' + lastSetCount + '세트 총 <strong>' + formatNum(lastVol) + 'kg</strong>을 들었어요</span>' +
      '</div>';
    }
  }

  var html = '';

  // 1. 카드헤더 (박스 밖)
  var exIconUrl = getExerciseIcon(meta.id);
  var exIconHtml = exIconUrl
    ? '<img src="' + exIconUrl + '" class="ex-card-icon" alt="" onerror="this.style.display=\'none\'">'
    : '';
  html +=
    '<div class="ex-card-header-standalone" id="exHeader-' + exIdx + '" ontouchstart="startExHeaderLongPress(' + exIdx + ',event)" ontouchend="cancelExHeaderLongPress()" ontouchmove="moveExHeaderLongPress(event)">' +
      '<div class="ex-card-color" style="background:#e85040"></div>' +
      exIconHtml +
      '<div class="ex-card-info">' +
        '<div class="ex-card-name">' + meta.name + '</div>' +
      '</div>' +
      (allDone ? '<span class="ex-card-check">✓</span>' : '') +
    '</div>';

  // 2. 동기부여 문구
  html += motivateHtml;

  if (isCardio) {
    html +=
      '<div class="ex-card' + (allDone ? ' ex-done' : '') + '">' +
        '<div class="ex-card-body">' +
          '<div class="cardio-input">' +
            '<input type="number" class="cardio-min-input" id="cardioMin-' + exIdx + '" ' +
              'value="' + (exData.sets[0] ? exData.sets[0].reps : '') + '" placeholder="' + (lastCardioMin > 0 ? lastCardioMin : '분') + '" inputmode="numeric">' +
            '<span class="cardio-label">분</span>' +
            '<button class="set-check-btn' + (exData.sets[0] && exData.sets[0].done ? ' done' : '') + '" ' +
              'onclick="completeCardio(' + exIdx + ')">' +
              '✓' +
            '</button>' +
          '</div>' +
          '<button class="complete-ex-btn" onclick="completeExercise(' + exIdx + ')">종목 완료 →</button>' +
        '</div>' +
      '</div>';
  } else if (isBodyweight) {
    var todayReps = 0;
    var lastTotalReps = 0;
    for (var i = 0; i < exData.sets.length; i++) {
      if (exData.sets[i].done) todayReps += exData.sets[i].reps || 0;
    }
    if (lastSets) {
      for (var i = 0; i < lastSets.length; i++) lastTotalReps += lastSets[i].reps || 0;
    }
    html += renderBodyweightProgress(todayReps, lastTotalReps, lastSetCount, doneCount);

    html += '<div class="ex-card' + (allDone ? ' ex-done' : '') + '">';
    html += '<div class="ex-card-body" id="exBody-' + exIdx + '">';

    // 완료 세트 요약 (접힘)
    html += renderDoneSetsSummary(exIdx, true);

    // 미완료 세트 테이블
    var hasUndone = false;
    for (var s = 0; s < exData.sets.length; s++) {
      if (!exData.sets[s].done) { hasUndone = true; break; }
    }
    if (hasUndone) {
      html +=
        '<table class="set-table">' +
          '<thead><tr>' +
            '<th class="st-set"></th>' +
            '<th class="st-reps">횟수</th>' +
          '</tr></thead>' +
          '<tbody>';
      var nextShown = false;
      for (var s = 0; s < exData.sets.length; s++) {
        if (!exData.sets[s].done && !nextShown) {
          html += renderSetRow(exIdx, s);
          nextShown = true;
        }
      }
      html += '</tbody></table>';
    }

    html += '</div></div>';
  } else {
    // 웨이트
    html += renderSetProgress(todayVol, lastVol, lastSetCount, doneCount);

    html += '<div class="ex-card' + (allDone ? ' ex-done' : '') + '">';
    html += '<div class="ex-card-body" id="exBody-' + exIdx + '">';

    // 완료 세트 요약 (접힘)
    html += renderDoneSetsSummary(exIdx, false);

    // 미완료 세트 테이블
    var hasUndone = false;
    for (var s = 0; s < exData.sets.length; s++) {
      if (!exData.sets[s].done) { hasUndone = true; break; }
    }
    if (hasUndone) {
      html +=
        '<table class="set-table">' +
          '<thead><tr>' +
            '<th class="st-set"></th>' +
            '<th class="st-kg">KG</th>' +
            '<th class="st-gap"></th>' +
            '<th class="st-reps">횟수</th>' +
          '</tr></thead>' +
          '<tbody>';
      var nextShown = false;
      for (var s = 0; s < exData.sets.length; s++) {
        if (!exData.sets[s].done && !nextShown) {
          html += renderSetRow(exIdx, s);
          nextShown = true;
        }
      }
      html += '</tbody></table>';
    }

    html += '</div></div>';
  }

  return html;
}

// ══ 완료 세트 요약 (접힘) ══
function renderDoneSetsSummary(exIdx, isBodyweight) {
  var exData = _currentSession.exercises[exIdx];
  var doneSets = [];
  for (var i = 0; i < exData.sets.length; i++) {
    if (exData.sets[i].done) doneSets.push({ idx: i, data: exData.sets[i] });
  }
  if (doneSets.length === 0) return '';

  var html = '<div class="done-sets-summary" onclick="toggleDoneSets(' + exIdx + ')">';
  for (var i = 0; i < doneSets.length; i++) {
    var s = doneSets[i].data;
    var chipClass = 'done-set-chip' + (s.isPR ? ' has-pr' : '');
    var label = '';
    if (isBodyweight) {
      label = (s.reps || 0) + '회';
    } else {
      label = (s.weight || 0) + 'kg×' + (s.reps || 0);
    }
    html += '<span class="' + chipClass + '"><span class="chip-set-num">' + (doneSets[i].idx + 1) + '</span> ' + label + '</span>';
  }
  html += '</div>';

  // 펼침 영역 (기본 숨김)
  html += '<div class="done-sets-expanded" id="doneSetsExp-' + exIdx + '">';
  html += '<table class="set-table"><tbody>';
  for (var i = 0; i < doneSets.length; i++) {
    html += renderSetRow(exIdx, doneSets[i].idx);
  }
  html += '</tbody></table></div>';

  return html;
}

function toggleDoneSets(exIdx) {
  var el = document.getElementById('doneSetsExp-' + exIdx);
  if (el) el.classList.toggle('show');
}

// ══ 세트 수동 추가 ══
function addSet(exIdx) {
  var exData = _currentSession.exercises[exIdx];
  if (!exData) return;

  var lastSet = exData.sets[exData.sets.length - 1];
  exData.sets.push({
    weight: lastSet ? lastSet.weight : 0,
    reps: lastSet ? lastSet.reps : 0,
    done: false,
    isPR: false
  });

  autoSaveSession();
  renderExerciseCards();
}

// ══ 종목 완료 → 다음 미완료 종목으로 이동 ══
function completeExercise(exIdx) {
  var exData = _currentSession.exercises[exIdx];
  if (!exData) return;

  // 미완료 세트 제거 (완료된 세트만 보존)
  exData.sets = exData.sets.filter(function(s) { return s.done; });

  // 자동저장
  autoSaveSession();

  // 다음 미완료 종목 찾기
  var nextIdx = -1;
  for (var i = 0; i < _currentSession.exercises.length; i++) {
    if (i === exIdx) continue;
    var ex = _currentSession.exercises[i];
    var hasUndone = false;
    for (var j = 0; j < ex.sets.length; j++) {
      if (!ex.sets[j].done) { hasUndone = true; break; }
    }
    if (hasUndone) {
      nextIdx = i;
      break;
    }
  }

  if (nextIdx >= 0) {
    _currentExerciseIndex = nextIdx;
  }
  // 미완료 종목이 없으면 현재 위치 유지 (모든 종목 완료 상태)

  renderExerciseCards();
}

// ══ 종목 카드 헤더 롱프레스 → 종목 완료 확인 ══
var _exHeaderLongPressTimer = null;
var _exHeaderTouchStart = null;

function startExHeaderLongPress(exIdx, e) {
  cancelExHeaderLongPress();

  var touch = e.touches ? e.touches[0] : e;
  _exHeaderTouchStart = { x: touch.clientX, y: touch.clientY };

  var header = document.getElementById('exHeader-' + exIdx);
  if (header) header.classList.add('long-pressing');

  _exHeaderLongPressTimer = setTimeout(function() {
    _exHeaderLongPressTimer = null;
    _exHeaderTouchStart = null;
    if (navigator.vibrate) navigator.vibrate(30);
    if (header) header.classList.remove('long-pressing');

    var exData = _currentSession.exercises[exIdx];
    var meta = getExercise(exData.exerciseId);
    var name = meta ? meta.name : '';

    var doneCount = 0;
    for (var k = 0; k < exData.sets.length; k++) {
      if (exData.sets[k].done) doneCount++;
    }
    if (doneCount === 0) {
      showConfirm('완료된 세트가 없습니다.\n세트를 먼저 완료해주세요.', function(confirmed) {});
      return;
    }

    showConfirm(name + ' 종목을 완료하시겠습니까?', function(confirmed) {
      if (confirmed) {
        completeExercise(exIdx);
      }
    });
  }, 500);
}

function moveExHeaderLongPress(e) {
  if (!_exHeaderLongPressTimer || !_exHeaderTouchStart) return;
  var touch = e.touches ? e.touches[0] : e;
  var dx = Math.abs(touch.clientX - _exHeaderTouchStart.x);
  var dy = Math.abs(touch.clientY - _exHeaderTouchStart.y);
  if (dx > 15 || dy > 15) {
    cancelExHeaderLongPress();
  }
}

function cancelExHeaderLongPress() {
  if (_exHeaderLongPressTimer) {
    clearTimeout(_exHeaderLongPressTimer);
    _exHeaderLongPressTimer = null;
  }
  _exHeaderTouchStart = null;
  var headers = document.querySelectorAll('.ex-card-header-standalone');
  for (var i = 0; i < headers.length; i++) {
    headers[i].classList.remove('long-pressing');
  }
}

// ══ 롱프레스 유틸 ══
function bindLongPress(element, callback, duration) {
  var timer = null;
  var touchStart = null;

  function start(e) {
    var touch = e.touches ? e.touches[0] : e;
    touchStart = { x: touch.clientX, y: touch.clientY };
    timer = setTimeout(function() {
      timer = null;
      touchStart = null;
      if (navigator.vibrate) navigator.vibrate(30);
      if (callback) callback();
    }, duration || 500);
  }

  function move(e) {
    if (!timer || !touchStart) return;
    var touch = e.touches ? e.touches[0] : e;
    var dx = Math.abs(touch.clientX - touchStart.x);
    var dy = Math.abs(touch.clientY - touchStart.y);
    if (dx > 15 || dy > 15) {
      cancel();
    }
  }

  function cancel() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    touchStart = null;
  }

  element.addEventListener('touchstart', start);
  element.addEventListener('touchmove', move);
  element.addEventListener('touchend', cancel);
  element.addEventListener('touchcancel', cancel);
}

// ══ 종목 네비 드래그 순서 변경 ══
function bindNavLongPress() {
  var scrollEl = document.getElementById('exNavScroll');
  if (!scrollEl) return;

  var btns = scrollEl.querySelectorAll('.ex-nav-btn');
  for (var i = 0; i < btns.length; i++) {
    (function(btn) {
      var exIdx = parseInt(btn.getAttribute('data-ex-idx'));
      if (isNaN(exIdx)) return;

      var timer = null;
      var triggered = false;
      var startX = 0;
      var startY = 0;

      btn.addEventListener('touchstart', function(e) {
        triggered = false;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        btn.classList.add('long-pressing');

        timer = setTimeout(function() {
          triggered = true;
          btn.classList.remove('long-pressing');

          // 종목 완료 처리
          var exData = _currentSession.exercises[exIdx];
          if (!exData) return;
          var meta = getExercise(exData.exerciseId);
          var name = meta ? meta.name : '';

          var doneCount = 0;
          for (var k = 0; k < exData.sets.length; k++) {
            if (exData.sets[k].done) doneCount++;
          }

          if (doneCount === 0) {
            showConfirm('완료된 세트가 없습니다.\n세트를 먼저 완료해주세요.', function(confirmed) {});
            return;
          }

          showConfirm(name + ' 종목을 완료하시겠습니까?', function(confirmed) {
            if (confirmed) {
              completeExercise(exIdx);
            }
          });
        }, 500);
      }, { passive: true });

      btn.addEventListener('touchmove', function(e) {
        if (!timer) return;
        var dx = Math.abs(e.touches[0].clientX - startX);
        var dy = Math.abs(e.touches[0].clientY - startY);
        if (dx > 15 || dy > 15) {
          clearTimeout(timer);
          timer = null;
          triggered = false;
          btn.classList.remove('long-pressing');
        }
      }, { passive: true });

      btn.addEventListener('touchend', function(e) {
        if (timer) { clearTimeout(timer); timer = null; }
        btn.classList.remove('long-pressing');
        if (triggered) {
          e.preventDefault();
          e.stopPropagation();
          triggered = false;
        }
      }, { passive: false });

      btn.addEventListener('touchcancel', function() {
        if (timer) { clearTimeout(timer); timer = null; }
        triggered = false;
        btn.classList.remove('long-pressing');
      }, { passive: true });
    })(btns[i]);
  }
}

function bindPartTabLongPress() {
  var partTabs = document.querySelectorAll('.exercise-nav-part-tab');
  for (var i = 0; i < partTabs.length; i++) {
    (function(tab) {
      var partId = tab.getAttribute('data-part-id');
      if (!partId) return;

      bindLongPress(tab, function() {
        openSettingsForPart(partId);
      }, 500);
    })(partTabs[i]);
  }
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

function renderBodyweightProgress(todayReps, lastTotalReps, lastSetCount, doneCount) {
  var html = '<div class="set-progress">';

  if (lastTotalReps <= 0) {
    html +=
      '<div class="set-progress-text">' +
        '<span style="color:var(--icon-inactive);font-size:12px">첫 기록</span>' +
        '<span class="set-progress-vol">' + todayReps + '회</span>' +
      '</div>';
    html += '</div>';
    return html;
  }

  var pct = Math.round((todayReps / lastTotalReps) * 100);
  var barPct = Math.min(pct, 100);
  var isBurst = pct >= 100 && todayReps > 0;
  var diff = todayReps - lastTotalReps;

  if (isBurst && diff > 0) {
    html += '<div class="set-progress-burst">🔥 지난번 돌파! +' + diff + '회</div>';
  }

  html +=
    '<div class="set-progress-bar-wrap">' +
      '<div class="set-progress-bar' + (isBurst ? ' burst' : '') + '" style="width:' + barPct + '%"></div>' +
    '</div>' +
    '<div class="set-progress-text">' +
      '<span class="set-progress-pct' + (isBurst ? ' burst' : '') + '">' + (todayReps > 0 ? pct + '%' : '') + '</span>' +
      '<span class="set-progress-vol">' + todayReps + ' / ' + lastTotalReps + '회</span>' +
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
  var isBodyweight = meta && meta.equipment === 'bodyweight';
  var lastSets = getLastExerciseSets(exData.exerciseId);
  var prev = lastSets && lastSets[setIdx] ? lastSets[setIdx] : null;

  var rowClass = 'set-row';
  if (setData.done) rowClass += ' set-done';
  if (setData.isPR) rowClass += ' set-pr';

  var focusHandler = 'onfocus="this.select()"';

  var html = '<tr class="' + rowClass + '" id="setRow-' + exIdx + '-' + setIdx + '">';

  // 세트 번호 (탭 시 완료 처리)
  var numClass = 'set-num' + (setData.done ? ' set-num-done' : '');
  html += '<td><span class="' + numClass + '" onclick="completeSet(' + exIdx + ',' + setIdx + ')">' + (setIdx + 1) + '</span></td>';

  if (isBodyweight) {
    html +=
      '<td>' +
        '<div class="set-adjust-group">' +
          '<button class="set-adjust-btn adjust-minus" onclick="adjustSetValue(' + exIdx + ',' + setIdx + ',\'reps\',-1)">－</button>' +
          '<input type="text" class="set-input' + (setData.done ? ' filled' : '') + '" ' +
            'id="setR-' + exIdx + '-' + setIdx + '" ' +
            'value="' + (setData.reps || '') + '" ' +
            'placeholder="' + (prev ? prev.reps : (meta ? meta.defaultReps : '')) + '" ' +
            'inputmode="numeric" ' +
            focusHandler + '>' +
          '<button class="set-adjust-btn adjust-plus" onclick="adjustSetValue(' + exIdx + ',' + setIdx + ',\'reps\',1)">＋</button>' +
        '</div>' +
      '</td>';
  } else {
    html +=
      '<td>' +
        '<div class="set-adjust-group">' +
          '<button class="set-adjust-btn adjust-minus" onclick="adjustSetValue(' + exIdx + ',' + setIdx + ',\'weight\',-1)">－</button>' +
          '<input type="text" class="set-input' + (setData.done ? ' filled' : '') + '" ' +
            'id="setW-' + exIdx + '-' + setIdx + '" ' +
            'value="' + (setData.weight || '') + '" ' +
            'placeholder="' + (prev ? prev.weight : '') + '" ' +
            'inputmode="decimal" ' +
            focusHandler + '>' +
          '<button class="set-adjust-btn adjust-plus" onclick="adjustSetValue(' + exIdx + ',' + setIdx + ',\'weight\',1)">＋</button>' +
        '</div>' +
      '</td>' +
      '<td class="st-gap"></td>' +
      '<td>' +
        '<div class="set-adjust-group">' +
          '<button class="set-adjust-btn adjust-minus" onclick="adjustSetValue(' + exIdx + ',' + setIdx + ',\'reps\',-1)">－</button>' +
          '<input type="text" class="set-input' + (setData.done ? ' filled' : '') + '" ' +
            'id="setR-' + exIdx + '-' + setIdx + '" ' +
            'value="' + (setData.reps || '') + '" ' +
            'placeholder="' + (prev ? prev.reps : (meta ? meta.defaultReps : '')) + '" ' +
            'inputmode="numeric" ' +
            focusHandler + '>' +
          '<button class="set-adjust-btn adjust-plus" onclick="adjustSetValue(' + exIdx + ',' + setIdx + ',\'reps\',1)">＋</button>' +
        '</div>' +
      '</td>';
  }

  html += '</tr>';
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
  var meta = getExercise(exData.exerciseId);
  var isBodyweight = meta && (meta.equipment === 'bodyweight' || meta.equipment === 'cardio');

  // 입력값 읽기
  var wInput = document.getElementById('setW-' + exIdx + '-' + setIdx);
  var rInput = document.getElementById('setR-' + exIdx + '-' + setIdx);

  var w = 0;
  if (wInput) {
    w = parseFloat(wInput.value) || parseFloat(wInput.placeholder) || 0;
  }
  var r = parseInt(rInput.value) || parseInt(rInput.placeholder) || 0;

  // 완료 해제(토글 off)인 경우 바로 처리
  if (setData.done) {
    setData.done = false;
    setData.isPR = false;
    autoSaveSession();
    renderExerciseCards();
    return;
  }

  // 완료 처리 전: 중량 0 검증 (맨몸/유산소 제외)
  if (!isBodyweight && w <= 0) {
    showConfirm('중량을 입력하세요', function() {});
    return;
  }

  setData.weight = w;
  setData.reps = r;
  setData.done = true;

  // PR 판정
  if (w > 0 && r > 0) {
    var prResult = checkPR(exData.exerciseId, w, r, _currentSession.id);
    setData.isPR = prResult.isPR;

    if (prResult.isPR) {
      showPRFlash(exIdx, setIdx, prResult);
    }
  }

  // 휴식 타이머 시작
  if (meta && meta.defaultRestSec > 0) {
    startRestTimer(meta.defaultRestSec);
  }

  // 자동저장
  autoSaveSession();

  // 모든 기존 세트가 완료되었으면 새 세트 자동 추가
  var allSetsDone = true;
  for (var k = 0; k < exData.sets.length; k++) {
    if (!exData.sets[k].done) { allSetsDone = false; break; }
  }
  if (allSetsDone) {
    var lastSet = exData.sets[exData.sets.length - 1];
    exData.sets.push({
      weight: lastSet ? lastSet.weight : 0,
      reps: lastSet ? lastSet.reps : 0,
      done: false,
      isPR: false
    });
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

  var overlay = document.createElement('div');
  overlay.className = 'pr-toast-overlay';
  overlay.innerHTML =
    '<div class="pr-toast">' +
      '<span class="pr-toast-title">PR</span>' +
      '<span class="pr-toast-name">' + name + '</span>' +
      '<span class="pr-toast-detail">' + set.weight + 'kg × ' + set.reps + '회</span>' +
    '</div>';
  document.body.appendChild(overlay);

  setTimeout(function() { overlay.classList.add('show'); }, 10);
  setTimeout(function() {
    overlay.classList.remove('show');
    setTimeout(function() { overlay.remove(); }, 300);
  }, 2000);
}

// ══ 휴식 타이머 ══
function startRestTimer(seconds) {
  dismissRestTimer();
  _restTimer = {
    endTime: Date.now() + seconds * 1000
  };

  var el = document.getElementById('restTimerBar');
  if (!el) return;

  // FINISH WORKOUT 버튼 완전히 숨기고 타이머를 버튼 자리로 이동
  var bottomBtn = document.getElementById('bottomBtn');
  if (bottomBtn) {
    bottomBtn.style.display = 'none';
    bottomBtn.style.visibility = 'hidden';
    bottomBtn.style.opacity = '0';
  }
  el.style.bottom = 'calc(max(20px, env(safe-area-inset-bottom) + 20px))';

  // 초기 HTML 한 번만 세팅
  el.innerHTML =
    '<div class="rest-timer active">' +
      '<span class="rest-timer-num" id="restTimerNum"></span>' +
      '<span class="rest-timer-text">탭해서 건너뛰기</span>' +
    '</div>';

  // 컨테이너에 클릭 이벤트 등록
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
    el.style.bottom = '';
  }

  // FINISH WORKOUT 버튼 완전히 복원
  var bottomBtn = document.getElementById('bottomBtn');
  if (bottomBtn) {
    bottomBtn.style.display = 'block';
    bottomBtn.style.visibility = 'visible';
    bottomBtn.style.opacity = '1';
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
  // 중복 실행 방지
  if (_isFinishing) {
    console.warn('이미 완료 처리 중입니다.');
    return;
  }
  if (!_currentSession) return;

  _isFinishing = true;  // 플래그 설정

  // 경과 시간
  _currentSession.endTime = Date.now();
  _currentSession.durationMin = Math.round((_currentSession.endTime - _currentSession.startTime) / 60000);

  // 칼로리
  _currentSession.totalCalories = estimateCalories(_currentSession);

  // 세션 저장
  saveSession(_currentSession);

  // 임시 저장 제거
  localStorage.removeItem('wk_current_session');

  // 서버에 동기화 (silent 모드 — 토스트 미표시)
  syncToServer(null, true);

  // 타이머 정리
  if (_workoutTimerInterval) clearInterval(_workoutTimerInterval);
  dismissRestTimer();

  // 버튼 스타일 확실히 복원
  var bottomBtn = document.getElementById('bottomBtn');
  if (bottomBtn) {
    bottomBtn.style.display = 'block';
    bottomBtn.style.visibility = 'visible';
    bottomBtn.style.opacity = '1';
  }

  // 헤더 숨기기
  var workoutHeader = document.getElementById('workoutHeader');
  if (workoutHeader) workoutHeader.style.display = 'none';

  // 완료 요약 표시
  renderWorkoutSummary(_currentSession);

  // 상태 초기화
  _currentSession = null;
  _selectedParts = [];
  _workoutStartTime = null;
  _currentExerciseIndex = 0;
  _headerFilterPart = null;
  _isFinishing = false;  // 플래그 해제
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

  // 종목 수, 세트 수
  var exCount = session.exercises.length;
  var setCount = 0;
  for (var i = 0; i < session.exercises.length; i++) {
    for (var j = 0; j < session.exercises[i].sets.length; j++) {
      if (session.exercises[i].sets[j].done) setCount++;
    }
  }

  // 지난번 비교
  var lastSession = getLastSimilarSession(session.tags);
  var volDiffHtml = '';
  if (lastSession && lastSession.id !== session.id) {
    var diff = (session.totalVolumeExWarmup || 0) - (lastSession.totalVolumeExWarmup || 0);
    if (diff > 0) {
      volDiffHtml = '<span class="summary-vol-diff up">+' + formatNum(diff) + 'kg</span>';
    } else if (diff < 0) {
      volDiffHtml = '<span class="summary-vol-diff down">' + formatNum(diff) + 'kg</span>';
    }
  }

  // PR 목록
  var prHtml = '';
  var prCount = 0;
  for (var i = 0; i < session.exercises.length; i++) {
    var ex = session.exercises[i];
    var meta = getExercise(ex.exerciseId);
    for (var j = 0; j < ex.sets.length; j++) {
      if (ex.sets[j].isPR) {
        prCount++;
        prHtml +=
          '<div class="summary-pr-item">' +
            '<span class="summary-pr-badge">PR</span>' +
            '<span class="summary-pr-name">' + (meta ? meta.name : '') + '</span>' +
            '<span class="summary-pr-val">' + ex.sets[j].weight + 'kg × ' + ex.sets[j].reps + '회</span>' +
          '</div>';
      }
    }
  }

  // 날짜 표시
  var dateDisplay = formatDate(session.date);

  var html =
    '<div class="workout-summary">' +
      '<div class="summary-top">' +
        '<div class="summary-title">운동 완료!</div>' +
        '<div class="summary-date">' + dateDisplay + '</div>' +
        '<div class="summary-tags">' + tagNames.join(' · ') + '</div>' +
      '</div>' +
      '<div class="summary-stats-card">' +
        '<div class="summary-stats-header">' + exCount + '종목 · ' + setCount + '세트</div>' +
        '<div class="summary-stats-row">' +
          '<div class="summary-stat-item">' +
            '<div class="summary-stat-val">' + formatDuration(session.durationMin) + '</div>' +
            '<div class="summary-stat-label">운동 시간</div>' +
          '</div>' +
          '<div class="summary-stat-divider"></div>' +
          '<div class="summary-stat-item">' +
            '<div class="summary-stat-val">' + formatNum(session.totalVolumeExWarmup) + '<small>kg</small></div>' +
            volDiffHtml +
            '<div class="summary-stat-label">총 볼륨</div>' +
          '</div>' +
          '<div class="summary-stat-divider"></div>' +
          '<div class="summary-stat-item">' +
            '<div class="summary-stat-val">' + formatNum(session.totalCalories) + '<small>kcal</small></div>' +
            '<div class="summary-stat-label">소모 칼로리</div>' +
          '</div>' +
        '</div>' +
      '</div>';

  if (prHtml) {
    html +=
      '<div class="summary-pr-card">' +
        '<div class="summary-pr-title">개인 기록 갱신</div>' +
        '<div class="summary-pr-list">' + prHtml + '</div>' +
      '</div>';
  }

  html +=
      '<div style="height:100px"></div>' +
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
    _headerFilterPart = null;

    // 타이머 재시작
    if (_workoutStartTime && !_workoutTimerInterval) {
      startWorkoutTimer();
    }
    return true;
  }
  return false;
}

// ══ 뒤로가기 / 운동 취소 ══
function onWorkoutBack() {
  if (_editMode) {
    cancelEditMode();
  } else {
    // 세션 유지한 채 홈으로 이동 (일시정지 개념)
    showScreen('home');
  }
}

// ══ 설정 변경 후 세션 종목 동기화 ══
function syncExercisesWithSettings() {
  if (!_currentSession) return;

  // 현재 세션에 있는 종목 ID 세트
  var existingIds = {};
  for (var i = 0; i < _currentSession.exercises.length; i++) {
    existingIds[_currentSession.exercises[i].exerciseId] = true;
  }

  // 선택된 부위들의 최신 종목 목록 (숨김 제외)
  var latestExercises = [];
  for (var p = 0; p < _selectedParts.length; p++) {
    var partExs = getExercisesByPart(_selectedParts[p]);
    for (var j = 0; j < partExs.length; j++) {
      latestExercises.push(partExs[j]);
    }
  }

  // 1. 새로 활성화된 종목 추가 (세션에 없는 것)
  var maxSort = 0;
  for (var i = 0; i < _currentSession.exercises.length; i++) {
    if (_currentSession.exercises[i].sortOrder > maxSort) {
      maxSort = _currentSession.exercises[i].sortOrder;
    }
  }

  for (var i = 0; i < latestExercises.length; i++) {
    var ex = latestExercises[i];
    if (!existingIds[ex.id]) {
      // 새 종목 추가
      var lastSets = getLastExerciseSets(ex.id);
      var sets = [];
      var numSets = ex.defaultSets;
      if (lastSets && lastSets.length > numSets) numSets = lastSets.length;

      for (var s = 0; s < numSets; s++) {
        var prev = lastSets && lastSets[s] ? lastSets[s] : null;
        sets.push({
          weight: prev ? prev.weight : (ex.defaultWeight || 0),
          reps: prev ? prev.reps : ex.defaultReps,
          done: false,
          isPR: false
        });
      }

      maxSort++;
      _currentSession.exercises.push({
        exerciseId: ex.id,
        sortOrder: maxSort,
        sets: sets
      });
    }
  }

  // 2. 숨김 처리된 종목 제거 (단, 세트 입력이 있으면 유지)
  var latestIds = {};
  for (var i = 0; i < latestExercises.length; i++) {
    latestIds[latestExercises[i].id] = true;
  }

  _currentSession.exercises = _currentSession.exercises.filter(function(exData) {
    // 최신 목록에 있으면 유지
    if (latestIds[exData.exerciseId]) return true;

    // 최신 목록에 없지만, 완료된 세트가 있으면 유지 (기록 보존)
    for (var k = 0; k < exData.sets.length; k++) {
      if (exData.sets[k].done) return true;
    }

    // 입력 없는 숨김 종목은 제거
    return false;
  });

  // sortOrder 재정렬
  for (var i = 0; i < _currentSession.exercises.length; i++) {
    _currentSession.exercises[i].sortOrder = i;
  }

  // 현재 인덱스 보정
  if (_currentExerciseIndex >= _currentSession.exercises.length) {
    _currentExerciseIndex = Math.max(0, _currentSession.exercises.length - 1);
  }

  // 자동저장
  autoSaveSession();
}

function cancelWorkout() {
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
  _headerFilterPart = null;
  _isFinishing = false;  // 플래그도 초기화

  showScreen('home');
}

// ══ 수정 모드 ══
var _editMode = false;
var _editSessionId = null;
var _editReturnScreen = 'stats'; // 수정 완료 후 돌아갈 화면

/**
 * 기존 세션을 수정 모드로 운동 화면에 로드
 * @param {string} sessionId - 수정할 세션 ID
 * @param {string} focusExerciseId - 포커스할 종목 ID (선택)
 */
function enterEditMode(sessionId, focusExerciseId) {
  var session = getSession(sessionId);
  if (!session) return;

  _editMode = true;
  _editSessionId = sessionId;

  // 세션 복제 (원본 보존)
  _currentSession = JSON.parse(JSON.stringify(session));
  _selectedParts = _currentSession.tags.slice();
  _workoutStartTime = _currentSession.startTime;

  // 포커스 종목 인덱스 찾기
  _currentExerciseIndex = 0;
  _headerFilterPart = null;
  if (focusExerciseId) {
    for (var i = 0; i < _currentSession.exercises.length; i++) {
      if (_currentSession.exercises[i].exerciseId === focusExerciseId) {
        _currentExerciseIndex = i;
        break;
      }
    }
  }

  // 운동 화면으로 전환
  showScreen('workout');

  // 헤더 표시
  var workoutHeader = document.getElementById('workoutHeader');
  if (workoutHeader) workoutHeader.style.display = 'flex';
  updateWorkoutHeader(true);

  // 하단 버튼: SAVE CHANGES
  updateBottomButton('editSave');

  // 종목 카드 렌더
  renderExerciseCards();
}

/**
 * 수정 내용 저장
 */
function saveEditChanges() {
  if (!_editMode || !_currentSession) return;

  // 볼륨 재계산
  var vol = 0;
  for (var i = 0; i < _currentSession.exercises.length; i++) {
    var ex = _currentSession.exercises[i];
    var meta = getExercise(ex.exerciseId);
    if (meta && meta.equipment === 'cardio') continue;
    for (var j = 0; j < ex.sets.length; j++) {
      var s = ex.sets[j];
      if (s.done) {
        vol += (s.weight || 0) * (s.reps || 0);
      }
    }
  }
  _currentSession.totalVolume = vol;
  _currentSession.totalVolumeExWarmup = vol;
  _currentSession.totalCalories = estimateCalories(_currentSession);

  // 기존 세션 덮어쓰기
  saveSession(_currentSession);

  // PR 재계산
  recalcAllPRs();

  // 서버 동기화
  if (typeof syncToServer === 'function') syncToServer();

  // 타이머 정리
  if (_workoutTimerInterval) clearInterval(_workoutTimerInterval);
  dismissRestTimer();

  // 헤더 숨기기
  var workoutHeader = document.getElementById('workoutHeader');
  if (workoutHeader) workoutHeader.style.display = 'none';

  // 상태 초기화
  var returnScreen = _editReturnScreen;
  _currentSession = null;
  _selectedParts = [];
  _workoutStartTime = null;
  _currentExerciseIndex = 0;
  _editMode = false;
  _editSessionId = null;

  // 통계 화면으로 복귀
  showScreen(returnScreen);
}

/**
 * 수정 모드 취소 (뒤로가기)
 */
function cancelEditMode() {
  // 타이머 정리
  if (_workoutTimerInterval) clearInterval(_workoutTimerInterval);
  dismissRestTimer();

  var workoutHeader = document.getElementById('workoutHeader');
  if (workoutHeader) workoutHeader.style.display = 'none';

  _currentSession = null;
  _selectedParts = [];
  _workoutStartTime = null;
  _currentExerciseIndex = 0;
  _headerFilterPart = null;
  _editMode = false;
  _editSessionId = null;

  showScreen('stats');
}
