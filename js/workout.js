/* ═══ workout.js — 운동 진행 화면 ═══ */

var _currentSession = null;
var _selectedParts = [];
var _restTimer = null;        // {endTime, intervalId}
var _workoutStartTime = null;
var _restAnimFrame = null;
var _currentExerciseIndex = 0;  // 현재 보고 있는 종목 인덱스
var _isFinishing = false;  // finishWorkout 중복 실행 방지
var _headerFilterPart = null;  // 헤더 부위 탭 필터 (null이면 전체)
var _autoSaveInterval = null;  // 30초 주기 자동저장 타이머
var _cardioTimers = {};  // 유산소 스톱워치 상태 { exIdx: { startedAt, elapsed, running, intervalId } }
var _selectedExercises = {};  // 종목 선택 화면 체크 상태 { exerciseId: true/false }
var _selectedOrder = [];       // ★ 추가: 선택 순서 배열 [exerciseId, exerciseId, ...]
var _addExerciseMode = false;  // 운동 중 종목 추가 모드 플래그

/* ── 헤더 표시 보장 (Phase 3-A-fix-2) ── */
function ensureWorkoutHeader() {
  const hdr = document.getElementById('workoutHeader');
  if (!hdr) return;

  if (_currentSession) {
    // 헤더 무조건 표시
    hdr.style.display = 'flex';

    // 타이머 미작동 시 시작
    if (!_workoutTimerInterval) startWorkoutTimer();

    // 볼륨 무조건 갱신 (0이어도 표시)
    updateHeaderVolume();
  } else {
    hdr.style.display = 'none';
  }
}

// ══ 종목 완료 여부 판정 ══
function isExerciseComplete(exIdx) {
  if (!_currentSession) return false;
  var exData = _currentSession.exercises[exIdx];
  if (!exData || exData.sets.length === 0) return false;
  for (var i = 0; i < exData.sets.length; i++) {
    if (!exData.sets[i].done) return false;
  }
  return true;
}

// ══ 화면 진입 ══
function renderWorkoutScreen() {
  var container = document.getElementById('workoutContent');
  if (!container) return;

  var workoutHeader = document.getElementById('workoutHeader');

  if (_currentSession) {
    // 운동 진행 모드: 기존 패딩 복원
    container.className = 'workout-content';
    container.style.padding = '';
    if (workoutHeader) workoutHeader.style.display = 'flex';
    updateWorkoutHeader(true);
    updateBottomButton('workout');
    renderExerciseCards();
  } else {
    // 종목 선택 모드
    updateBottomButton('partSelect');
    renderPartSelector();
  }

  // ── 헤더 표시 보장 (Phase 3-A-fix-2) ──
  ensureWorkoutHeader();
}

// ══ 부위 선택 ══
function renderPartSelector() {
  var container = document.getElementById('workoutContent');
  _selectedParts = [];
  _selectedExercises = {};
  _selectedOrder = [];

  var workoutHeader = document.getElementById('workoutHeader');
  if (workoutHeader) workoutHeader.style.display = 'none';

  container.style.padding = '';
  container.className = 'workout-content workout-select-mode';

  var defaultPart = BODY_PARTS[0].id;

  var html =
    '<div class="ex-select-header" style="padding:20px 0 10px 0">' +
      '<button class="summary-msg-icon" onclick="onWorkoutBack()">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>' +
      '</button>' +
      '<button class="summary-msg-icon" onclick="showHiddenExerciseSheet()">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>' +
      '</button>' +
    '</div>' +
    '<div class="part-selector" style="display:flex;flex-direction:column;flex:1;min-height:0">' +
      '<div class="exercise-select-tabs" id="exSelectTabs">';

  for (var i = 0; i < BODY_PARTS.length; i++) {
    var p = BODY_PARTS[i];
    var isActive = p.id === defaultPart;
    html += '<button class="exercise-select-tab' + (isActive ? ' active' : '') + '" data-part="' + p.id + '" onclick="switchSelectTab(\'' + p.id + '\')">' + p.name + '</button>';
  }

  html +=
      '</div>' +
      '<div class="ex-select-scroll">' +
        '<div class="exercise-select-chips" id="exSelectList"></div>' +
      '</div>' +
      '<div class="ex-select-chosen" id="exSelectChosen"></div>' +
    '</div>';

  container.innerHTML = html;
  renderSelectList(defaultPart);
}

function togglePart(partId) {
  // 이 함수는 더 이상 사용하지 않음. switchSelectTab으로 대체.
  switchSelectTab(partId);
}

function renderWorkoutTimeline() {
  // 이 함수는 더 이상 사용하지 않음. renderSelectSummary로 대체.
}

function switchSelectTab(partId) {
  var tabs = document.querySelectorAll('.exercise-select-tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.remove('active');
    if (tabs[i].getAttribute('data-part') === partId) {
      tabs[i].classList.add('active');
    }
  }
  renderSelectList(partId);
}

function renderSelectList(partId) {
  var container = document.getElementById('exSelectList');
  if (!container) return;

  var exercises = getExercisesByPart(partId);
  if (exercises.length === 0) {
    container.innerHTML = '<div class="exercise-select-empty">종목이 없습니다</div>';
    return;
  }

  var html = '';
  for (var i = 0; i < exercises.length; i++) {
    var ex = exercises[i];
    // 이 부위 탭을 처음 열 때만 초기값 세팅 (미선택)
    if (_selectedExercises[ex.id] === undefined) {
      _selectedExercises[ex.id] = false;
    }

    // 추가 모드에서 이미 세션에 있는 종목 확인
    var inSession = false;
    if (_addExerciseMode && _currentSession) {
      for (var si = 0; si < _currentSession.exercises.length; si++) {
        if (_currentSession.exercises[si].exerciseId === ex.id) {
          inSession = true;
          break;
        }
      }
    }

    var isChecked = _selectedExercises[ex.id] === true;
    var chipClass = 'ex-select-chip';
    if (inSession) {
      chipClass += ' in-session';
    } else if (isChecked) {
      chipClass += ' selected';
    }

    if (inSession) {
      html += '<button class="' + chipClass + '" disabled>✓ ' + ex.name + '</button>';
    } else {
      html += '<button class="' + chipClass + '" onclick="toggleSelectExercise(\'' + ex.id + '\',\'' + partId + '\')">' + ex.name + '</button>';
    }
  }

  container.innerHTML = html;
  updateSelectButton();
  renderSelectedChosen();
}

function toggleSelectExercise(exerciseId, partId) {
  if (_selectedExercises[exerciseId]) {
    // 선택 해제 → 배열에서도 제거
    _selectedExercises[exerciseId] = false;
    var idx = _selectedOrder.indexOf(exerciseId);
    if (idx >= 0) _selectedOrder.splice(idx, 1);
  } else {
    // 선택 → 배열 맨 뒤에 추가
    _selectedExercises[exerciseId] = true;
    if (_selectedOrder.indexOf(exerciseId) < 0) {
      _selectedOrder.push(exerciseId);
    }
  }

  // 현재 활성 탭 확인
  var activeTab = document.querySelector('.exercise-select-tab.active');
  var currentPart = activeTab ? activeTab.getAttribute('data-part') : partId;

  renderSelectList(currentPart);
}

function renderSelectSummary() {
  // 이 함수는 더 이상 사용하지 않음. renderSelectedChosen으로 대체.
  renderSelectedChosen();
}

function renderSelectedChosen() {
  var el = document.getElementById('exSelectChosen');
  if (!el) return;

  var hidden = getHiddenExercises();

  // hidden 종목은 _selectedOrder에서도 제거
  for (var i = _selectedOrder.length - 1; i >= 0; i--) {
    if (hidden.indexOf(_selectedOrder[i]) >= 0) {
      _selectedExercises[_selectedOrder[i]] = false;
      _selectedOrder.splice(i, 1);
    }
  }
  // 기존 _selectedExercises 정리
  var keys = Object.keys(_selectedExercises);
  for (var i = 0; i < keys.length; i++) {
    if (hidden.indexOf(keys[i]) >= 0) {
      delete _selectedExercises[keys[i]];
    }
  }

  if (_selectedOrder.length === 0) {
    el.innerHTML = '';
    return;
  }

  var html = '<div class="ex-select-chosen-title">운동 순서</div>';
  html += '<div class="ex-order-chips">';

  for (var i = 0; i < _selectedOrder.length; i++) {
    var exId = _selectedOrder[i];
    var meta = getExercise(exId);
    if (!meta) continue;

    html +=
      '<button class="ex-order-chip" onclick="toggleSelectExercise(\'' + exId + '\',\'' + meta.bodyPart + '\')">' +
        '<span class="ex-order-chip-num">' + (i + 1) + '</span> ' + meta.name +
      '</button>';
  }

  html += '</div>';
  el.innerHTML = html;
}

function updateSelectButton() {
  var count = 0;
  var keys = Object.keys(_selectedExercises);
  for (var i = 0; i < keys.length; i++) {
    if (_selectedExercises[keys[i]]) count++;
  }
  if (_addExerciseMode) {
    if (count > 0) {
      updateBottomButton('addExerciseReady');
    } else {
      updateBottomButton('addExercise');
    }
  } else {
    if (count > 0) {
      updateBottomButton('partSelectReady');
    } else {
      updateBottomButton('partSelect');
    }
  }
}

function showHiddenExerciseSheet() {
  // 현재 활성 탭의 부위 ID 가져오기
  var activeTab = document.querySelector('.exercise-select-tab.active');
  var partId = activeTab ? activeTab.getAttribute('data-part') : BODY_PARTS[0].id;

  // 해당 부위의 숨김 종목 찾기
  var hidden = getHiddenExercises();
  var allExercises = EXERCISES.filter(function(e) {
    var overrides = getPartOverrides();
    var effectivePart = overrides[e.id] || e.bodyPart;
    return effectivePart === partId && hidden.indexOf(e.id) >= 0;
  });

  // 커스텀 종목 중 숨김 상태인 것도 포함
  var customHidden = (getCustomExercises() || []).filter(function(e) {
    return e.bodyPart === partId && hidden.indexOf(e.id) >= 0;
  });
  allExercises = allExercises.concat(customHidden);

  if (allExercises.length === 0) {
    // 숨김 종목 없으면 설정 화면으로
    openSettingsForPart(partId);
    return;
  }

  var partInfo = getBodyPart(partId);
  var title = (partInfo ? partInfo.name : '') + ' 숨김 종목';

  var buttons = [];
  for (var i = 0; i < allExercises.length; i++) {
    (function(ex) {
      var alreadySelected = _selectedExercises[ex.id] === true;
      buttons.push({
        text: (alreadySelected ? '✓ ' : '') + ex.name,
        onClick: function() {
          // 숨김 해제 + 선택
          if (isExerciseHidden(ex.id)) {
            toggleHideExercise(ex.id);
          }
          _selectedExercises[ex.id] = true;
          if (_selectedOrder.indexOf(ex.id) < 0) {
            _selectedOrder.push(ex.id);
          }
          renderSelectList(partId);
        }
      });
    })(allExercises[i]);
  }

  // 종목 설정 바로가기
  buttons.push({
    text: '종목 설정',
    onClick: function() {
      openSettingsForPart(partId);
    }
  });

  showActionSheet(title, buttons);
}

// ══ 운동 시작 ══
function startWorkout() {
  // 이미 진행 중인 세션이 있으면 바로 운동 화면으로 전환
  if (_currentSession) {
    updateWorkoutHeader(true);
    updateBottomButton('workout');
    renderExerciseCards();
    startWorkoutTimer();
    startPeriodicSave();
    return;
  }

  // ★ _selectedOrder 순서를 사용 (사용자가 탭한 순서)
  var selectedIds = _selectedOrder.slice();
  if (selectedIds.length === 0) {
    // 폴백: 기존 방식
    var keys = Object.keys(_selectedExercises);
    for (var i = 0; i < keys.length; i++) {
      if (_selectedExercises[keys[i]]) selectedIds.push(keys[i]);
    }
  }
  if (selectedIds.length === 0) return;

  // 선택된 종목에서 부위 태그 자동 수집
  var tagSet = {};
  var tagList = [];
  for (var i = 0; i < selectedIds.length; i++) {
    var meta = getExercise(selectedIds[i]);
    if (meta && !tagSet[meta.bodyPart]) {
      tagSet[meta.bodyPart] = true;
      tagList.push(meta.bodyPart);
    }
  }
  _selectedParts = tagList;

  _workoutStartTime = Date.now();

  // 세션 객체 생성
  _currentSession = {
    id: genId(),
    date: today(),
    startTime: _workoutStartTime,
    endTime: null,
    tags: tagList.slice(),
    exercises: [],
    totalVolume: 0,
    totalVolumeExWarmup: 0,
    totalCalories: 0,
    durationMin: 0,
    memo: ''
  };

  // ★ 정렬 제거: _selectedOrder 순서 = 운동 순서
  var sortedExercises = [];
  for (var i = 0; i < selectedIds.length; i++) {
    var meta = getExercise(selectedIds[i]);
    if (meta) sortedExercises.push(meta);
  }

  // 종목 추가
  for (var i = 0; i < sortedExercises.length; i++) {
    var ex = sortedExercises[i];
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
      sortOrder: i,
      sets: sets
    });
  }

  updateWorkoutHeader(true);
  updateBottomButton('workout');

  // workout-select-mode 클래스 제거 + 패딩 복원 (Phase 3-A-fix-3)
  var container = document.getElementById('workoutContent');
  if (container) {
    container.className = 'workout-content';
    container.style.padding = '';
  }

  _currentExerciseIndex = 0;
  _headerFilterPart = tagList.length > 0 ? tagList[0] : null;
  renderExerciseCards();
  startWorkoutTimer();
  startPeriodicSave();
  autoSaveSession();

  // ── 새 세션 시작 후 헤더 강제 표시 (Phase 3-A-fix-2) ──
  ensureWorkoutHeader();
}

// ══ 운동 경과 타이머 ══
var _workoutTimerInterval = null;

function startWorkoutTimer() {
  if (_workoutTimerInterval) clearInterval(_workoutTimerInterval);
  _workoutTimerInterval = setInterval(updateWorkoutTimeDisplay, 1000);
  updateWorkoutTimeDisplay();
}

function updateWorkoutTimeDisplay() {
  var el = document.getElementById('workoutTime');
  if (!el) return;
  var session = JSON.parse(localStorage.getItem('wk_current_session'));
  if (!session || !session.startTime) { el.textContent = ''; return; }
  var diff = Math.floor((Date.now() - session.startTime) / 1000);
  var h = Math.floor(diff / 3600);
  var m = Math.floor((diff % 3600) / 60);
  var s = diff % 60;
  el.textContent = (h > 0 ? h + ':' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');

  // ── 헤더 표시 방어 (Phase 3-A-fix-2) ──
  const hdr = document.getElementById('workoutHeader');
  if (hdr && _currentSession && hdr.style.display !== 'flex') {
    hdr.style.display = 'flex';
  }
}

function updateWorkoutHeader(inProgress) {
  var headerEl = document.getElementById('workoutHeader');
  if (!headerEl) return;

  var tagsEl = document.getElementById('workoutTags');

  if (inProgress) {
    if (tagsEl) {
      tagsEl.innerHTML = '<button class="wh-settings-btn" onclick="openSettingsForPart(_selectedParts[0] || \'chest\')">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>' +
      '</button>';
    }
    updateHeaderVolume();
  } else {
    if (tagsEl) tagsEl.innerHTML = '';
    var volEl = document.getElementById('workoutHeaderVol');
    if (volEl) volEl.textContent = '';
  }
}

function updateHeaderVolume() {
  var volEl = document.getElementById('workoutHeaderVol');
  var sepEl = document.querySelector('.wh-sep');
  if (!volEl) return;

  var session = JSON.parse(localStorage.getItem('wk_current_session'));
  if (!session || !session.exercises) {
    volEl.innerHTML = '';
    if (sepEl) sepEl.style.display = 'none';
    return;
  }

  // 현재 총 볼륨 계산
  var curVol = 0;
  session.exercises.forEach(function(ex) {
    var exMeta = getExercise(ex.exerciseId);
    if (exMeta && exMeta.equipment === 'cardio') return;
    (ex.sets || []).forEach(function(s) {
      if (s.done) curVol += (s.weight || 0) * (s.reps || 0);
    });
  });

  // 과거 세션 부분 매칭: 겹치는 태그 수가 가장 많은 세션 선택
  var lastVol = 0;
  var curTags = (session.tags || []).slice().sort();
  if (curTags.length > 0) {
    var ss = JSON.parse(localStorage.getItem('wk_sessions')) || [];
    var bestScore = 0;
    var bestSession = null;
    for (var i = ss.length - 1; i >= 0; i--) {
      var s = ss[i];
      if (s.id === session.id) continue;
      if (!s.tags || s.tags.length === 0) continue;
      var sTags = s.tags.slice().sort();
      var overlap = 0;
      for (var j = 0; j < curTags.length; j++) {
        if (sTags.indexOf(curTags[j]) !== -1) overlap++;
      }
      if (overlap > bestScore) {
        bestScore = overlap;
        bestSession = s;
      } else if (overlap === bestScore && bestSession) {
        // 동일 점수면 더 최근 세션 유지 (역순 순회이므로 먼저 �은 게 최신)
        continue;
      }
    }
    if (bestSession) {
      lastVol = bestSession.totalVolumeExWarmup || bestSession.totalVolume || 0;
    }
  }

  // 표시: 항상 볼륨 노출 (curVol이 0이어도)
  if (sepEl) sepEl.style.display = '';
  if (lastVol > 0) {
    volEl.innerHTML = '<span class="vol-current">' + curVol.toLocaleString() + '</span>'
      + ' <span class="vol-target">/ ' + lastVol.toLocaleString() + 'kg</span>';
  } else {
    volEl.innerHTML = '<span class="vol-current">' + curVol.toLocaleString() + 'kg</span>';
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

  var html = '';

  // 1. 부위탭 + 종목네비 영역
  html += '<div class="exercise-nav-area">';

  // 부위 탭 제거 (Phase 3-A), 부위 필터 해제
  _headerFilterPart = null;

  // 종목 네비게이션
  html += renderExerciseNav();

  html += '</div>';

  // 2. 현재 종목 카드
  html += '<div id="exercise-cards" class="swipe-container"><div class="swipe-card">' + renderExerciseCard(_currentExerciseIndex) + '</div></div>';

  // 하단 여백
  html += '<div style="height:80px"></div>';

  container.innerHTML = html;

  // 3. 종목 카드 헤더 롱프레스(종목 완료/삭제) 바인딩
  bindExHeaderLongPress();

  // 4. 종목 네비 버튼 롱프레스(종목 완료) 바인딩
  bindNavLongPress();

  // 5. 카드 좌우 스와이프 종목 전환
  bindCardSwipe();

  // 6. 활성 종목이 네비 중앙에 오도록 자동 스크롤
  scrollNavToActive();
}

// ══ 종목 네비게이션 버튼바 ══
function renderExerciseNav() {
  var exercises = _currentSession ? _currentSession.exercises : [];
  var html = '<div class="exercise-nav">';
  html += '<div class="exercise-nav-scroll" id="exNavScroll">';
  var isFirst = true;

  for (var i = 0; i < exercises.length; i++) {
    var ex = exercises[i];
    var meta = getExercise(ex.exerciseId);
    if (!meta) continue;

    // 부위 필터 적용 시 해당 부위가 아닌 종목은 완전히 스킵
    if (_headerFilterPart !== null && meta.bodyPart !== _headerFilterPart) continue;

    // 첫 번째가 아닌 경우에만 파이프 추가
    if (!isFirst) {
      html += '<span class="exercise-nav-pipe-separator">|</span>';
    }
    isFirst = false;

    var cls = 'ex-nav-btn';
    if (i === _currentExerciseIndex) cls += ' active';
    else if (isExerciseComplete(i)) {
      var _navMeta = getExercise(ex.exerciseId);
      if (!_navMeta || _navMeta.equipment !== 'cardio') cls += ' done';
    }
    html += '<button class="' + cls + '" data-idx="' + i + '" onclick="switchExercise(' + i + ')">' + meta.name + '</button>';
  }

  // 마지막 종목 뒤에 파이프 + "+" 텍스트 버튼 (네비 스크롤 안에 포함)
  if (!isFirst) {
    html += '<span class="exercise-nav-pipe-separator">|</span>';
  }
  html += '<button class="ex-nav-btn ex-nav-add" onclick="showAddExerciseSheet()">+</button>';
  html += '</div>';  // exercise-nav-scroll 닫기
  html += '</div>';  // exercise-nav 닫기
  return html;
}

// ══ 종목 전환 ══
function switchExercise(exIdx) {
  if (!_currentSession) return;
  if (exIdx < 0 || exIdx >= _currentSession.exercises.length) return;
  _currentExerciseIndex = exIdx;

  // 전환된 종목의 부위로 부위 탭 자동 전환
  var meta = getExercise(_currentSession.exercises[exIdx].exerciseId);
  if (meta && _selectedParts.length > 1) {
    var newPart = meta.bodyPart;
    if (_headerFilterPart !== newPart && _selectedParts.indexOf(newPart) >= 0) {
      _headerFilterPart = newPart;
    }
  }

  renderExerciseCards();
}

// ══ 활성 종목이 보이도록 네비 자동 스크롤 ══
function scrollNavToActive() {
  var scroll = document.querySelector('.exercise-nav-scroll');
  var active = scroll ? scroll.querySelector('.ex-nav-btn.active') : null;
  if (scroll && active) {
    var scrollLeft = active.offsetLeft - scroll.offsetWidth / 2 + active.offsetWidth / 2;
    scroll.scrollTo({ left: scrollLeft, behavior: 'smooth' });
  }
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

function showAddExerciseSheet() {
  if (!_currentSession) return;
  _addExerciseMode = true;
  _selectedExercises = {};
  _selectedOrder = [];

  // 오버레이 표시 (운동 화면은 그대로 유지)
  var overlay = document.getElementById('addExerciseOverlay');
  var container = document.getElementById('addExerciseContent');
  if (!overlay || !container) return;

  overlay.style.display = 'block';
  container.className = 'workout-content workout-select-mode';

  var defaultPart = BODY_PARTS[0].id;

  var html =
    '<div class="ex-select-header" style="padding:20px 0 10px 0">' +
      '<button class="summary-msg-icon" onclick="cancelAddExercise()">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>' +
      '</button>' +
      '<span style="font-size:17px;font-weight:700;color:var(--dark)">종목 추가</span>' +
      '<div style="width:26px"></div>' +
    '</div>' +
    '<div class="part-selector" style="display:flex;flex-direction:column;flex:1;min-height:0">' +
      '<div class="exercise-select-tabs" id="exSelectTabs">';

  for (var i = 0; i < BODY_PARTS.length; i++) {
    var p = BODY_PARTS[i];
    var isActive = p.id === defaultPart;
    html += '<button class="exercise-select-tab' + (isActive ? ' active' : '') + '" data-part="' + p.id + '" onclick="switchSelectTab(\'' + p.id + '\')">' + p.name + '</button>';
  }

  html +=
      '</div>' +
      '<div class="ex-select-scroll">' +
        '<div class="exercise-select-chips" id="exSelectList"></div>' +
      '</div>' +
      '<div class="ex-select-chosen" id="exSelectChosen"></div>' +
    '</div>';

  container.innerHTML = html;
  updateBottomButton('addExercise');
  renderSelectList(defaultPart);

  // 히스토리에 push (브라우저 뒤로 버튼 대응)
  history.pushState({ screen: 'addExercise' }, '');
}

function addExerciseToSession(exerciseId) {
  if (!_currentSession) return;

  // 이미 세션에 있으면 무시
  for (var i = 0; i < _currentSession.exercises.length; i++) {
    if (_currentSession.exercises[i].exerciseId === exerciseId) return;
  }

  var meta = getExercise(exerciseId);
  if (!meta) return;

  // 이전 기록 기반 세트 생성
  var lastSets = getLastExerciseSets(exerciseId);
  var sets = [];
  var numSets = meta.defaultSets;
  if (lastSets && lastSets.length > numSets) numSets = lastSets.length;

  for (var s = 0; s < numSets; s++) {
    var prev = lastSets && lastSets[s] ? lastSets[s] : null;
    sets.push({
      weight: prev ? prev.weight : (meta.defaultWeight || 0),
      reps: prev ? prev.reps : meta.defaultReps,
      done: false,
      isPR: false
    });
  }

  var maxSort = 0;
  for (var i = 0; i < _currentSession.exercises.length; i++) {
    if (_currentSession.exercises[i].sortOrder > maxSort) {
      maxSort = _currentSession.exercises[i].sortOrder;
    }
  }

  _currentSession.exercises.push({
    exerciseId: exerciseId,
    sortOrder: maxSort + 1,
    sets: sets
  });

  // 부위 태그 추가 (새 부위면)
  if (_selectedParts.indexOf(meta.bodyPart) < 0) {
    _selectedParts.push(meta.bodyPart);
    _currentSession.tags = _selectedParts.slice();
  }

  // 추가된 종목으로 이동
  _currentExerciseIndex = _currentSession.exercises.length - 1;
  _headerFilterPart = meta.bodyPart;

  autoSaveSession();
  renderExerciseCards();
}

function cancelAddExercise() {
  _addExerciseMode = false;
  _selectedExercises = {};

  var overlay = document.getElementById('addExerciseOverlay');
  if (overlay) overlay.style.display = 'none';

  // 운동 화면 복원 (workoutContent는 그대로이므로 재렌더만)
  var workoutHeader = document.getElementById('workoutHeader');
  if (workoutHeader) workoutHeader.style.display = 'flex';
  updateWorkoutHeader(true);
  updateBottomButton('workout');
}

function confirmAddExercises() {
  if (!_currentSession) return;
  // ★ _selectedOrder 순서대로 추가
  for (var i = 0; i < _selectedOrder.length; i++) {
    addExerciseToSession(_selectedOrder[i]);
  }
  _addExerciseMode = false;
  _selectedExercises = {};

  var overlay = document.getElementById('addExerciseOverlay');
  if (overlay) overlay.style.display = 'none';

  var workoutHeader = document.getElementById('workoutHeader');
  if (workoutHeader) workoutHeader.style.display = 'flex';
  updateWorkoutHeader(true);
  updateBottomButton('workout');
  renderExerciseCards();
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
    '<div class="ex-card-header-standalone" id="exHeader-' + exIdx + '">' +
      '<div class="ex-card-header-left">' +
        '<div class="ex-card-color" style="background:#e85040"></div>' +
        '<div class="ex-card-name">' + meta.name + '</div>' +
      '</div>' +
      exIconHtml +
      (allDone && !isCardio ? '<span class="ex-card-check">✓</span>' : '') +
    '</div>';

  // 2. 동기부여 문구
  html += motivateHtml;

  if (isCardio) {
    var cTimer = _cardioTimers[exIdx];
    var cRunning = cTimer && cTimer.running;
    var cHasElapsed = cTimer && cTimer.elapsed > 0;
    var cDisplayTime = '00:00';
    if (cTimer) {
      var cMs = cTimer.elapsed;
      if (cTimer.running) cMs += Date.now() - cTimer.startedAt;
      cDisplayTime = formatCardioTime(cMs);
    }

    // 완료 세트와 미완료 세트 분리
    var doneSets = [];
    var hasUndone = false;
    for (var ci = 0; ci < exData.sets.length; ci++) {
      if (exData.sets[ci].done) {
        doneSets.push({ idx: ci, data: exData.sets[ci] });
      } else {
        hasUndone = true;
      }
    }

    html +=
      '<div class="ex-card' + (allDone ? ' ex-done' : '') + '">' +
        '<div class="ex-card-body">';

    // 완료 세트 칩 표시
    if (doneSets.length > 0) {
      html += '<div class="done-sets-summary">';
      for (var di = 0; di < doneSets.length; di++) {
        var ds = doneSets[di];
        html += '<span class="done-set-chip"><span class="chip-set-num">' + (ds.idx + 1) + '</span> ' + (ds.data.reps || 0) + '분</span>';
      }
      html += '</div>';

      // 칩 탭 시 수정할 수 있는 펼침 영역
      html += '<div class="done-sets-expanded" id="doneSetsExp-' + exIdx + '">';
      for (var di2 = 0; di2 < doneSets.length; di2++) {
        var ds2 = doneSets[di2];
        html +=
          '<div class="cardio-edit-row">' +
            '<span class="cardio-edit-label">' + (ds2.idx + 1) + '세트</span>' +
            '<input type="number" class="cardio-min-input" id="cardioEditMin-' + exIdx + '-' + ds2.idx + '" value="' + (ds2.data.reps || 0) + '" inputmode="numeric">' +
            '<span class="cardio-label">분</span>' +
            '<button class="set-check-btn done" onclick="updateCardioDone(' + exIdx + ',' + ds2.idx + ')">✓</button>' +
          '</div>';
      }
      html += '</div>';
    }

    // 타이머 진행 중
    if (cRunning) {
      html +=
          '<div class="cardio-timer-display">' +
            '<span class="cardio-timer-time" id="cardioTimerDisplay-' + exIdx + '">' + cDisplayTime + '</span>' +
          '</div>' +
          '<div class="cardio-timer-actions">' +
            '<button class="cardio-action-btn cardio-pause" onclick="pauseCardioTimer(' + exIdx + ')">일시정지</button>' +
            '<button class="cardio-action-btn cardio-complete" onclick="completeCardio(' + exIdx + ')">완료</button>' +
          '</div>';
    } else if (cHasElapsed) {
      // 일시정지 상태
      html +=
          '<div class="cardio-timer-display">' +
            '<span class="cardio-timer-time paused" id="cardioTimerDisplay-' + exIdx + '">' + cDisplayTime + '</span>' +
          '</div>' +
          '<div class="cardio-timer-actions">' +
            '<button class="cardio-action-btn cardio-resume" onclick="startCardioTimer(' + exIdx + ')">재개</button>' +
            '<button class="cardio-action-btn cardio-complete" onclick="completeCardio(' + exIdx + ')">완료</button>' +
          '</div>';
    } else {
      // 초기 또는 추가 세트 시작 상태
      html +=
          '<div class="cardio-start-area">' +
            '<button class="cardio-start-btn" onclick="startCardioTimer(' + exIdx + ')">▶ ' + (doneSets.length > 0 ? '다시 시작' : '시작') + '</button>' +
          '</div>' +
          '<div class="cardio-manual">' +
            '<span class="cardio-manual-label">또는 직접 입력</span>' +
            '<div class="cardio-input">' +
              '<input type="number" class="cardio-min-input" id="cardioMin-' + exIdx + '" ' +
                'value="" placeholder="' + (lastCardioMin > 0 ? lastCardioMin : '분') + '" inputmode="numeric">' +
              '<span class="cardio-label">분</span>' +
              '<button class="set-check-btn" onclick="completeCardio(' + exIdx + ')">✓</button>' +
            '</div>' +
          '</div>';
    }

    html +=
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

// ══ 운동 중 종목 삭제 ══
function removeExerciseFromSession(exIdx) {
  if (!_currentSession) return;
  if (_currentSession.exercises.length <= 1) return;

  // 유산소 타이머 정리
  if (_cardioTimers[exIdx]) {
    if (_cardioTimers[exIdx].intervalId) {
      clearInterval(_cardioTimers[exIdx].intervalId);
    }
    delete _cardioTimers[exIdx];
  }

  // 종목 제거
  _currentSession.exercises.splice(exIdx, 1);

  // 유산소 타이머 인덱스 재매핑 (삭제된 인덱스 이후 전부 -1)
  var newCardioTimers = {};
  var ctKeys = Object.keys(_cardioTimers);
  for (var i = 0; i < ctKeys.length; i++) {
    var oldIdx = parseInt(ctKeys[i]);
    if (oldIdx > exIdx) {
      newCardioTimers[oldIdx - 1] = _cardioTimers[oldIdx];
    } else {
      newCardioTimers[oldIdx] = _cardioTimers[oldIdx];
    }
  }
  _cardioTimers = newCardioTimers;

  // sortOrder 재정렬
  for (var i = 0; i < _currentSession.exercises.length; i++) {
    _currentSession.exercises[i].sortOrder = i;
  }

  // 부위 태그 재계산
  var tagSet = {};
  var tagList = [];
  for (var i = 0; i < _currentSession.exercises.length; i++) {
    var meta = getExercise(_currentSession.exercises[i].exerciseId);
    if (meta && !tagSet[meta.bodyPart]) {
      tagSet[meta.bodyPart] = true;
      tagList.push(meta.bodyPart);
    }
  }
  _selectedParts = tagList;
  _currentSession.tags = tagList.slice();

  // 현재 인덱스 보정
  if (_currentExerciseIndex >= _currentSession.exercises.length) {
    _currentExerciseIndex = _currentSession.exercises.length - 1;
  }
  if (_currentExerciseIndex < 0) _currentExerciseIndex = 0;

  // 부위 필터 보정 (필터 중인 부위가 사라졌으면 해제)
  if (_headerFilterPart && _selectedParts.indexOf(_headerFilterPart) < 0) {
    _headerFilterPart = null;
  }

  autoSaveSession();
  renderExerciseCards();
}

// ══ 종목 카드 헤더 롱프레스 → 액션시트 (종목 완료/삭제) ══
function bindExHeaderLongPress() {
  var headers = document.querySelectorAll('.ex-card-header-standalone');
  for (var i = 0; i < headers.length; i++) {
    (function(header) {
      var exIdx = parseInt(header.id.replace('exHeader-', ''));
      if (isNaN(exIdx)) return;

      var timer = null;
      var triggered = false;
      var startX = 0;
      var startY = 0;

      header.addEventListener('touchstart', function(e) {
        triggered = false;
        var touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        header.classList.add('long-pressing');

        timer = setTimeout(function() {
          triggered = true;
          timer = null;
          header.classList.remove('long-pressing');
          if (navigator.vibrate) navigator.vibrate(30);

          var exData = _currentSession.exercises[exIdx];
          var meta = getExercise(exData.exerciseId);
          var name = meta ? meta.name : '';

          var doneCount = 0;
          for (var k = 0; k < exData.sets.length; k++) {
            if (exData.sets[k].done) doneCount++;
          }

          var buttons = [];

          if (doneCount > 0) {
            buttons.push({
              text: '종목 완료',
              onClick: function() {
                showConfirm(name + ' 종목을 완료하시겠습니까?', function(confirmed) {
                  if (confirmed) {
                    completeExercise(exIdx);
                  }
                });
              }
            });
          }

          if (_currentSession.exercises.length > 1) {
            var deleteText = doneCount > 0 ? '종목 삭제 (' + doneCount + '세트 기록 포함)' : '종목 삭제';
            buttons.push({
              text: deleteText,
              cls: 'destructive',
              onClick: function() {
                showConfirm(name + ' 종목을 삭제하시겠습니까?', function(confirmed) {
                  if (confirmed) {
                    removeExerciseFromSession(exIdx);
                  }
                });
              }
            });
          }

          if (buttons.length === 0) {
            showConfirm('완료된 세트가 없습니다.\n세트를 먼저 완료해주세요.', function() {});
            return;
          }

          showActionSheet(name, buttons);
        }, 500);
      }, { passive: true });

      header.addEventListener('touchmove', function(e) {
        if (!timer) return;
        var touch = e.touches[0];
        var dx = Math.abs(touch.clientX - startX);
        var dy = Math.abs(touch.clientY - startY);
        if (dx > 15 || dy > 15) {
          clearTimeout(timer);
          timer = null;
          triggered = false;
          header.classList.remove('long-pressing');
        }
      }, { passive: true });

      header.addEventListener('touchend', function(e) {
        if (timer) { clearTimeout(timer); timer = null; }
        header.classList.remove('long-pressing');
        if (triggered) {
          e.preventDefault();
          e.stopPropagation();
          triggered = false;
        }
      }, { passive: false });

      header.addEventListener('touchcancel', function() {
        if (timer) { clearTimeout(timer); timer = null; }
        triggered = false;
        header.classList.remove('long-pressing');
      }, { passive: true });

      // PC 테스트용 마우스 지원
      header.addEventListener('mousedown', function(e) {
        triggered = false;
        startX = e.clientX;
        startY = e.clientY;
        header.classList.add('long-pressing');

        timer = setTimeout(function() {
          triggered = true;
          timer = null;
          header.classList.remove('long-pressing');

          var exData = _currentSession.exercises[exIdx];
          var meta = getExercise(exData.exerciseId);
          var name = meta ? meta.name : '';

          var doneCount = 0;
          for (var k = 0; k < exData.sets.length; k++) {
            if (exData.sets[k].done) doneCount++;
          }

          var buttons = [];

          if (doneCount > 0) {
            buttons.push({
              text: '종목 완료',
              onClick: function() {
                showConfirm(name + ' 종목을 완료하시겠습니까?', function(confirmed) {
                  if (confirmed) {
                    completeExercise(exIdx);
                  }
                });
              }
            });
          }

          if (_currentSession.exercises.length > 1) {
            var deleteText = doneCount > 0 ? '종목 삭제 (' + doneCount + '세트 기록 포함)' : '종목 삭제';
            buttons.push({
              text: deleteText,
              cls: 'destructive',
              onClick: function() {
                showConfirm(name + ' 종목을 삭제하시겠습니까?', function(confirmed) {
                  if (confirmed) {
                    removeExerciseFromSession(exIdx);
                  }
                });
              }
            });
          }

          if (buttons.length === 0) {
            showConfirm('완료된 세트가 없습니다.\n세트를 먼저 완료해주세요.', function() {});
            return;
          }

          showActionSheet(name, buttons);
        }, 500);
      });

      header.addEventListener('mouseup', function() {
        if (timer) { clearTimeout(timer); timer = null; }
        header.classList.remove('long-pressing');
        triggered = false;
      });

      header.addEventListener('mouseleave', function() {
        if (timer) { clearTimeout(timer); timer = null; }
        header.classList.remove('long-pressing');
        triggered = false;
      });
    })(headers[i]);
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

// ══ 카드 좌우 스와이프 종목 전환 ══
function bindCardSwipe() {
  var container = document.getElementById('exercise-cards');
  if (!container) return;

  var startX = 0;
  var startY = 0;
  var currentX = 0;
  var isSwiping = false;
  var decided = false;
  var swipeThreshold = 50;
  var card = container.querySelector('.swipe-card');
  var disabled = false;

  container.addEventListener('touchstart', function(e) {
    // 종목 네비 스크롤 영역에서 시작된 터치는 무시
    disabled = e.target.closest('.exercise-nav-scroll') ? true : false;
    if (disabled) return;

    // 왼쪽 가장자리(30px 이내)에서 시작된 터치는 스와이프 뒤로가기에 양보
    if (e.touches[0].clientX <= 30) {
      disabled = true;
      return;
    }

    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    currentX = 0;
    isSwiping = false;
    decided = false;
    if (card) card.classList.add('swiping');
  }, { passive: false });

  container.addEventListener('touchmove', function(e) {
    if (disabled) return;

    var dx = e.touches[0].clientX - startX;
    var dy = e.touches[0].clientY - startY;

    // 방향 미결정 상태: 세로가 더 크면 스와이프 포기 (세로 스크롤 허용)
    if (!decided) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      decided = true;
      if (Math.abs(dy) > Math.abs(dx)) {
        // 세로 스크롤 → 카드 스와이프 비활성
        isSwiping = false;
        if (card) card.classList.remove('swiping');
        return;
      }
      isSwiping = true;
    }

    if (!isSwiping) return;

    // 좌우 스와이프 확정 → 브라우저 기본 스크롤 차단
    e.preventDefault();
    currentX = dx;
    if (card) card.style.transform = 'translateX(' + dx + 'px)';
  }, { passive: false });

  container.addEventListener('touchend', function(e) {
    if (disabled) {
      disabled = false;
      return;
    }

    if (card) {
      card.classList.remove('swiping');
      card.style.transform = '';
    }

    if (!isSwiping) return;

    var exercises = _currentSession ? _currentSession.exercises : [];
    var filtered = exercises;
    if (_headerFilterPart !== null) {
      filtered = exercises.filter(function(ex) {
        var meta = getExercise(ex.exerciseId);
        return meta && meta.bodyPart === _headerFilterPart;
      });
    }

    if (currentX < -swipeThreshold) {
      // 왼쪽 스와이프 → 다음 종목
      if (_currentExerciseIndex < exercises.length - 1) {
        switchExercise(_currentExerciseIndex + 1);
      }
    } else if (currentX > swipeThreshold) {
      // 오른쪽 스와이프 → 이전 종목
      if (_currentExerciseIndex > 0) {
        switchExercise(_currentExerciseIndex - 1);
      }
    }
  }, { passive: true });
}

/* ── 종목 네비 드래그 순서 변경 (Phase 3-B-reorder) ── */
function bindNavLongPress() {
  const scrollEl = document.getElementById('exNavScroll');
  if (!scrollEl) return;

  const LONG_PRESS_MS = 500;
  let pressTimer = null;
  let isDragging = false;
  let dragIdx = -1;
  let ghostEl = null;
  let startX = 0;
  let startY = 0;
  let dropIdx = -1;
  let autoScrollTimer = null;

  // 종목 버튼들만 선택 (+ 버튼 제외)
  function getNavBtns() {
    return scrollEl.querySelectorAll('.ex-nav-btn:not(.ex-nav-add)');
  }

  function getExIdx(btn) {
    return parseInt(btn.getAttribute('data-idx'), 10);
  }

  // ── long-press 감지 ──
  scrollEl.addEventListener('touchstart', function(e) {
    const btn = e.target.closest('.ex-nav-btn:not(.ex-nav-add)');
    if (!btn) return;

    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;

    pressTimer = setTimeout(function() {
      // long-press 확정
      isDragging = true;
      dragIdx = getExIdx(btn);
      dropIdx = dragIdx;

      // 진동 피드백
      if (navigator.vibrate) navigator.vibrate(20);

      // 원본 반투명
      btn.classList.add('nav-dragging');

      // 고스트 생성
      ghostEl = btn.cloneNode(true);
      ghostEl.classList.add('nav-ghost');
      ghostEl.style.position = 'fixed';
      ghostEl.style.zIndex = '600';
      ghostEl.style.pointerEvents = 'none';
      ghostEl.style.opacity = '0.85';
      ghostEl.style.transform = 'scale(1.1)';
      ghostEl.style.fontWeight = '700';
      ghostEl.style.color = 'var(--accent)';
      ghostEl.style.background = 'var(--white)';
      ghostEl.style.padding = '6px 12px';
      ghostEl.style.borderRadius = '8px';
      ghostEl.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
      ghostEl.style.whiteSpace = 'nowrap';

      const rect = btn.getBoundingClientRect();
      ghostEl.style.left = rect.left + 'px';
      ghostEl.style.top = (rect.top - 4) + 'px';

      document.body.appendChild(ghostEl);

      // 스크롤 잠금
      scrollEl.style.overflow = 'hidden';

    }, LONG_PRESS_MS);
  }, { passive: true });

  // ── 이동 중 ──
  scrollEl.addEventListener('touchmove', function(e) {
    // long-press 전 이동 → 취소 (일반 스크롤)
    if (!isDragging && pressTimer) {
      const dx = Math.abs(e.touches[0].clientX - startX);
      const dy = Math.abs(e.touches[0].clientY - startY);
      if (dx > 10 || dy > 10) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      return;
    }

    if (!isDragging) return;

    e.preventDefault();

    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;

    // 고스트 위치 갱신
    if (ghostEl) {
      ghostEl.style.left = (touchX - 30) + 'px';
      ghostEl.style.top = (touchY - 20) + 'px';
    }

    // drop 위치 판정
    clearDropIndicators();
    const btns = getNavBtns();
    let newDropIdx = dragIdx;

    btns.forEach(function(b) {
      const bIdx = getExIdx(b);
      if (bIdx === dragIdx) return;

      const r = b.getBoundingClientRect();
      const midX = r.left + r.width / 2;

      if (touchX < midX && touchX > r.left - 20) {
        b.classList.add('nav-drop-before');
        newDropIdx = bIdx;
      } else if (touchX >= midX && touchX < r.right + 20) {
        b.classList.add('nav-drop-after');
        newDropIdx = bIdx + 1;
      }
    });

    dropIdx = newDropIdx;

    // 양 끝 자동 스크롤
    const scrollRect = scrollEl.getBoundingClientRect();
    const EDGE = 40;

    clearInterval(autoScrollTimer);
    if (touchX < scrollRect.left + EDGE) {
      autoScrollTimer = setInterval(function() {
        scrollEl.scrollLeft -= 8;
      }, 16);
    } else if (touchX > scrollRect.right - EDGE) {
      autoScrollTimer = setInterval(function() {
        scrollEl.scrollLeft += 8;
      }, 16);
    }

  }, { passive: false });

  // ── 드롭 ──
  scrollEl.addEventListener('touchend', function(e) {
    clearTimeout(pressTimer);
    pressTimer = null;
    clearInterval(autoScrollTimer);

    if (!isDragging) return;

    isDragging = false;

    // 정리
    clearDropIndicators();
    const btns = getNavBtns();
    btns.forEach(function(b) { b.classList.remove('nav-dragging'); });

    if (ghostEl) {
      ghostEl.remove();
      ghostEl = null;
    }

    scrollEl.style.overflow = '';

    // 순서 변경 실행
    if (dropIdx !== dragIdx && dropIdx !== dragIdx + 1) {
      moveExerciseByDrag(dragIdx, dropIdx);
    }

    dragIdx = -1;
    dropIdx = -1;
  }, { passive: true });

  // ── 취소 (터치 벗어남) ──
  scrollEl.addEventListener('touchcancel', function() {
    clearTimeout(pressTimer);
    pressTimer = null;
    clearInterval(autoScrollTimer);

    if (isDragging) {
      isDragging = false;
      clearDropIndicators();
      const btns = getNavBtns();
      btns.forEach(function(b) { b.classList.remove('nav-dragging'); });
      if (ghostEl) { ghostEl.remove(); ghostEl = null; }
      scrollEl.style.overflow = '';
    }
  }, { passive: true });

  function clearDropIndicators() {
    const btns = getNavBtns();
    btns.forEach(function(b) {
      b.classList.remove('nav-drop-before');
      b.classList.remove('nav-drop-after');
    });
  }
}

/* ── 드래그로 종목 순서 이동 (Phase 3-B-reorder) ── */
function moveExerciseByDrag(fromIdx, toIdx) {
  if (!_currentSession || !_currentSession.exercises) return;

  const exercises = _currentSession.exercises;
  if (fromIdx < 0 || fromIdx >= exercises.length) return;

  // 배열에서 추출
  const moved = exercises.splice(fromIdx, 1)[0];

  // toIdx 보정 (fromIdx 제거 후 인덱스 변동)
  let insertAt = toIdx;
  if (toIdx > fromIdx) insertAt--;
  if (insertAt < 0) insertAt = 0;
  if (insertAt > exercises.length) insertAt = exercises.length;

  // 삽입
  exercises.splice(insertAt, 0, moved);

  // sortOrder 재할당
  exercises.forEach(function(ex, i) { ex.sortOrder = i; });

  // 유산소 타이머 키 재매핑
  if (typeof _cardioTimers !== 'undefined' && _cardioTimers) {
    const newTimers = {};
    exercises.forEach(function(ex, i) {
      // 기존 타이머 인덱스 맵핑
      Object.keys(_cardioTimers).forEach(function(key) {
        const oldIdx = parseInt(key, 10);
        let newIdx = oldIdx;
        if (oldIdx === fromIdx) {
          newIdx = insertAt;
        } else if (fromIdx < insertAt && oldIdx > fromIdx && oldIdx <= insertAt) {
          newIdx = oldIdx - 1;
        } else if (fromIdx > insertAt && oldIdx >= insertAt && oldIdx < fromIdx) {
          newIdx = oldIdx + 1;
        }
        if (newIdx === i) newTimers[i] = _cardioTimers[key];
      });
    });
    Object.keys(_cardioTimers).forEach(function(k) { delete _cardioTimers[k]; });
    Object.keys(newTimers).forEach(function(k) { _cardioTimers[k] = newTimers[k]; });
  }

  // 현재 보고 있던 종목 인덱스 보정
  if (_currentExerciseIndex === fromIdx) {
    _currentExerciseIndex = insertAt;
  } else if (fromIdx < _currentExerciseIndex && insertAt >= _currentExerciseIndex) {
    _currentExerciseIndex--;
  } else if (fromIdx > _currentExerciseIndex && insertAt <= _currentExerciseIndex) {
    _currentExerciseIndex++;
  }

  // 재렌더링
  renderExerciseCards();
  autoSaveSession();
}

// ══ 운동 중 종목 순서 변경 ══
function moveExercise(fromIdx, toIdx) {
  if (!_currentSession) return;
  if (fromIdx < 0 || fromIdx >= _currentSession.exercises.length) return;
  if (toIdx < 0 || toIdx >= _currentSession.exercises.length) return;

  // 배열에서 꺼내서 새 위치에 삽입
  var item = _currentSession.exercises.splice(fromIdx, 1)[0];
  _currentSession.exercises.splice(toIdx, 0, item);

  // 유산소 타이머 인덱스도 재매핑
  var newTimers = {};
  var oldKeys = Object.keys(_cardioTimers);
  for (var i = 0; i < oldKeys.length; i++) {
    var oldIdx = parseInt(oldKeys[i]);
    var newIdx = oldIdx;
    if (oldIdx === fromIdx) {
      newIdx = toIdx;
    } else if (fromIdx < toIdx && oldIdx > fromIdx && oldIdx <= toIdx) {
      newIdx = oldIdx - 1;
    } else if (fromIdx > toIdx && oldIdx >= toIdx && oldIdx < fromIdx) {
      newIdx = oldIdx + 1;
    }
    newTimers[newIdx] = _cardioTimers[oldKeys[i]];
  }
  _cardioTimers = newTimers;

  // 현재 보고 있는 종목 인덱스 업데이트
  _currentExerciseIndex = toIdx;

  // sortOrder 재정렬
  for (var i = 0; i < _currentSession.exercises.length; i++) {
    _currentSession.exercises[i].sortOrder = i;
  }

  autoSaveSession();
  renderExerciseCards();
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

  // 맨몸 종목: weight를 체중으로 설정하여 볼륨에 반영
  if (isBodyweight) {
    w = getLatestWeight();
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

  // 자동저장
  autoSaveSession();
  updateHeaderVolume();

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

// ══ 유산소 스톱워치 ══
function startCardioTimer(exIdx) {
  var timer = _cardioTimers[exIdx];
  if (timer && timer.running) return;

  if (!timer) {
    _cardioTimers[exIdx] = { startedAt: Date.now(), elapsed: 0, running: true, intervalId: null };
  } else {
    _cardioTimers[exIdx].startedAt = Date.now();
    _cardioTimers[exIdx].running = true;
  }

  // 활성 세트가 없으면 새 미완료 세트 확보
  var exData = _currentSession.exercises[exIdx];
  var activeSetIdx = -1;
  for (var i = 0; i < exData.sets.length; i++) {
    if (!exData.sets[i].done) { activeSetIdx = i; break; }
  }
  if (activeSetIdx < 0) {
    exData.sets.push({ weight: 0, reps: 0, done: false, isPR: false });
  }

  if (_currentSession && _currentSession.exercises[exIdx]) {
    _currentSession.exercises[exIdx]._cardioTimer = {
      elapsed: _cardioTimers[exIdx].elapsed,
      startedAt: _cardioTimers[exIdx].startedAt,
      running: true
    };
  }
  autoSaveSession();

  _cardioTimers[exIdx].intervalId = setInterval(function() {
    updateCardioTimerDisplay(exIdx);
  }, 1000);

  renderExerciseCards();
}

function pauseCardioTimer(exIdx) {
  var timer = _cardioTimers[exIdx];
  if (!timer || !timer.running) return;

  timer.elapsed += Date.now() - timer.startedAt;
  timer.running = false;

  if (timer.intervalId) {
    clearInterval(timer.intervalId);
    timer.intervalId = null;
  }

  var totalSec = Math.floor(timer.elapsed / 1000);
  var totalMin = Math.round(totalSec / 60);
  if (_currentSession && _currentSession.exercises[exIdx]) {
    var exData = _currentSession.exercises[exIdx];
    var activeSetIdx = -1;
    for (var i = 0; i < exData.sets.length; i++) {
      if (!exData.sets[i].done) { activeSetIdx = i; break; }
    }
    if (activeSetIdx >= 0) {
      exData.sets[activeSetIdx].reps = totalMin;
    }
    _currentSession.exercises[exIdx]._cardioTimer = {
      elapsed: timer.elapsed,
      startedAt: null,
      running: false
    };
  }
  autoSaveSession();

  renderExerciseCards();
}

function updateCardioTimerDisplay(exIdx) {
  var timer = _cardioTimers[exIdx];
  if (!timer) return;

  var totalMs = timer.elapsed;
  if (timer.running) {
    totalMs += Date.now() - timer.startedAt;
  }

  var el = document.getElementById('cardioTimerDisplay-' + exIdx);
  if (el) {
    el.textContent = formatCardioTime(totalMs);
  }

  if (timer.running && _currentSession && _currentSession.exercises[exIdx]) {
    var totalMin = Math.round(totalMs / 60000);
    var exData = _currentSession.exercises[exIdx];
    var activeSetIdx = -1;
    for (var i = 0; i < exData.sets.length; i++) {
      if (!exData.sets[i].done) { activeSetIdx = i; break; }
    }
    if (activeSetIdx >= 0) {
      exData.sets[activeSetIdx].reps = totalMin;
    }
  }
}

function formatCardioTime(ms) {
  var totalSec = Math.floor(ms / 1000);
  var min = Math.floor(totalSec / 60);
  var sec = totalSec % 60;
  return String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}

function completeCardio(exIdx) {
  var exData = _currentSession.exercises[exIdx];
  var timer = _cardioTimers[exIdx];

  // 활성(미완료) 세트 찾기
  var activeSetIdx = -1;
  for (var i = 0; i < exData.sets.length; i++) {
    if (!exData.sets[i].done) { activeSetIdx = i; break; }
  }

  // 미완료 세트가 없으면 아무것도 안 함
  if (activeSetIdx < 0) return;

  // 스톱워치가 진행 중이면 정지
  if (timer && timer.running) {
    timer.elapsed += Date.now() - timer.startedAt;
    timer.running = false;
    if (timer.intervalId) {
      clearInterval(timer.intervalId);
      timer.intervalId = null;
    }
  }

  // 시간 결정: 스톱워치 값 우선, 없으면 수동 입력
  var min = 0;
  if (timer && timer.elapsed > 0) {
    min = Math.round(timer.elapsed / 60000);
    if (min < 1 && timer.elapsed > 0) min = 1;
  } else {
    var input = document.getElementById('cardioMin-' + exIdx);
    min = input ? (parseInt(input.value) || 0) : 0;
  }

  if (min <= 0) return;

  exData.sets[activeSetIdx].reps = min;
  exData.sets[activeSetIdx].done = true;

  // 타이머 상태 정리
  if (timer && timer.intervalId) {
    clearInterval(timer.intervalId);
    timer.intervalId = null;
  }
  delete _cardioTimers[exIdx];
  if (_currentSession.exercises[exIdx]._cardioTimer) {
    delete _currentSession.exercises[exIdx]._cardioTimer;
  }

  // 새 미완료 세트 자동 추가 (다음 직접 입력/타이머 시작용)
  exData.sets.push({ weight: 0, reps: 0, done: false, isPR: false });

  autoSaveSession();
  renderExerciseCards();
}

// ══ 유산소 시간 수정 ══
function updateCardioDone(exIdx, setIdx) {
  var exData = _currentSession.exercises[exIdx];
  if (!exData || !exData.sets[setIdx] || !exData.sets[setIdx].done) return;

  var input = document.getElementById('cardioEditMin-' + exIdx + '-' + setIdx);
  var min = input ? (parseInt(input.value) || 0) : 0;
  if (min <= 0) return;

  exData.sets[setIdx].reps = min;
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

// ══ 주기적 자동저장 (30초 간격) ══
function startPeriodicSave() {
  stopPeriodicSave();
  _autoSaveInterval = setInterval(function() {
    if (_currentSession && !_isFinishing) {
      autoSaveSession();
    }
  }, 30000);
}

function stopPeriodicSave() {
  if (_autoSaveInterval) {
    clearInterval(_autoSaveInterval);
    _autoSaveInterval = null;
  }
}

// ══ 운동 완료 확인 ══
function confirmFinishWorkout() {
  if (!_currentSession) return;

  var doneCount = 0;
  for (var i = 0; i < _currentSession.exercises.length; i++) {
    for (var j = 0; j < _currentSession.exercises[i].sets.length; j++) {
      if (_currentSession.exercises[i].sets[j].done) doneCount++;
    }
  }

  var msg = doneCount > 0
    ? doneCount + '세트 완료. 운동을 종료하시겠습니까?'
    : '완료된 세트가 없습니다. 운동을 종료하시겠습니까?';

  showConfirm(msg, function(confirmed) {
    if (confirmed) {
      finishWorkout();
    }
  });
}

// ══ 운동 완료 ══
function finishWorkout() {
  if (_isFinishing) {
    console.warn('이미 완료 처리 중입니다.');
    return;
  }
  if (!_currentSession) return;

  _isFinishing = true;

  _currentSession.endTime = Date.now();
  _currentSession.durationMin = Math.round((_currentSession.endTime - _currentSession.startTime) / 60000);
  _currentSession.totalCalories = estimateCalories(_currentSession);

  saveSession(_currentSession);
  localStorage.removeItem('wk_current_session');

  syncToServer(null, true);

  if (_workoutTimerInterval) clearInterval(_workoutTimerInterval);
  _workoutTimerInterval = null;
  stopPeriodicSave();

  // 유산소 타이머 정리
  var ctKeys = Object.keys(_cardioTimers);
  for (var ci = 0; ci < ctKeys.length; ci++) {
    if (_cardioTimers[ctKeys[ci]].intervalId) {
      clearInterval(_cardioTimers[ctKeys[ci]].intervalId);
    }
  }
  _cardioTimers = {};

  dismissRestTimer();

  var bottomBtn = document.getElementById('bottomBtn');
  if (bottomBtn) {
    bottomBtn.style.display = 'block';
    bottomBtn.style.visibility = 'visible';
    bottomBtn.style.opacity = '1';
  }

  var workoutHeader = document.getElementById('workoutHeader');
  if (workoutHeader) workoutHeader.style.display = 'none';

  renderWorkoutSummary(_currentSession);

  // 히스토리: replace + push 1개. popstate에서 pushState로 복원하므로 충분
  history.replaceState({ screen: 'summary' }, '');
  history.pushState({ screen: 'summary' }, '');

  _currentSession = null;
  _selectedParts = [];
  _workoutStartTime = null;
  _currentExerciseIndex = 0;
  _headerFilterPart = null;
  _isFinishing = false;
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

    // 유산소 타이머 상태 복원
    _cardioTimers = {};
    for (var i = 0; i < _currentSession.exercises.length; i++) {
      var ct = _currentSession.exercises[i]._cardioTimer;
      if (ct) {
        _cardioTimers[i] = {
          elapsed: ct.elapsed || 0,
          startedAt: ct.running ? Date.now() : null,
          running: ct.running || false,
          intervalId: null
        };
        // 진행 중이었으면 interval 재시작
        if (_cardioTimers[i].running) {
          (function(idx) {
            _cardioTimers[idx].intervalId = setInterval(function() {
              updateCardioTimerDisplay(idx);
            }, 1000);
          })(i);
        }
      }
    }

    // 타이머 재시작
    if (_workoutStartTime && !_workoutTimerInterval) {
      startWorkoutTimer();
    }
    startPeriodicSave();
    return true;
  }
  return false;
}

// ══ 뒤로가기 / 운동 취소 ══
function onWorkoutBack() {
  if (_editMode) {
    cancelEditMode();
  } else {
    // 진행 중인 세션이 있으면 LocalStorage에 저장 (일시정지)
    if (_currentSession) {
      autoSaveSession();
    }
    // 브라우저 히스토리 뒤로 가기 (popstate에서 home 전환 처리)
    history.back();
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
  stopPeriodicSave();

  // 유산소 타이머 정리
  var ctKeys = Object.keys(_cardioTimers);
  for (var ci = 0; ci < ctKeys.length; ci++) {
    if (_cardioTimers[ctKeys[ci]].intervalId) {
      clearInterval(_cardioTimers[ctKeys[ci]].intervalId);
    }
  }
  _cardioTimers = {};

  dismissRestTimer();

  // 상태 초기화
  _currentSession = null;
  _selectedParts = [];
  _workoutStartTime = null;
  _currentExerciseIndex = 0;
  _headerFilterPart = null;
  _isFinishing = false;

  showScreen('home', 'replace');
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

  // 수정 완료 후 원래 화면으로 (히스토리 대체)
  showScreen(returnScreen, 'replace');
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

  showScreen('stats', 'replace');
}
