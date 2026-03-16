/* ═══ ui.js — 메인 화면, 캘린더, 화면 전환 ═══ */

var _currentYM = getYM(); // 현재 선택된 월
var _bottomSheetOpen = false;
var _selectedWeekDate = today(); // 주간 캘린더에서 선택된 날짜 (기본: 오늘)

// ══ 화면 전환 ══
function showScreen(screenId) {
  var mainView = document.getElementById('main-view');
  var workoutScreen = document.getElementById('screen-workout');
  var statsScreen = document.getElementById('screen-stats');
  var settingsScreen = document.getElementById('screen-settings');
  var workoutHeader = document.getElementById('workoutHeader');
  var bottomBtn = document.getElementById('bottomBtn');

  // 모든 화면 숨기기
  mainView.style.display = 'none';
  workoutScreen.style.display = 'none';
  if (statsScreen) statsScreen.style.display = 'none';
  if (settingsScreen) settingsScreen.style.display = 'none';
  if (workoutHeader) workoutHeader.style.display = 'none';

  if (screenId === 'home') {
    mainView.style.display = 'block';
    if (bottomBtn) bottomBtn.style.display = 'block';
    renderHome();

    var savedSession = L('wk_current_session');
    if (savedSession && savedSession.endTime === null) {
      updateBottomButton('continue');
    } else {
      updateBottomButton('start');
    }
    window.scrollTo(0, 0);
  } else if (screenId === 'workout') {
    workoutScreen.style.display = 'block';
    if (bottomBtn) bottomBtn.style.display = 'block';
    renderWorkoutScreen();
  } else if (screenId === 'stats') {
    if (statsScreen) statsScreen.style.display = 'block';
    if (bottomBtn) bottomBtn.style.display = 'none';
    renderStatsScreen();
    window.scrollTo(0, 0);
  } else if (screenId === 'settings') {
    if (settingsScreen) settingsScreen.style.display = 'block';
    if (bottomBtn) bottomBtn.style.display = 'none';
    renderSettings();
    window.scrollTo(0, 0);
  }
}

function startWorkoutFlow() {
  showScreen('workout');
}

// ══ 홈 화면 ══
function renderHome() {
  renderSummaryMsg();
  renderWeekCal();
  renderLastWorkoutCard();
}

// ══ 요약 메시지 ══
function renderSummaryMsg() {
  var el = document.getElementById('summaryMsg');
  if (!el) return;

  var thisWeekVol = getThisWeekVolume();
  var lastWeekVol = getLastWeekVolumeAtSamePoint();
  var lastWeekTotal = getLastWeekTotalVolume();

  var now = new Date();
  var dayOfWeek = now.getDay();
  var isWeekStart = (dayOfWeek === 1);

  var mainText = '';
  var subText = '';

  if (isWeekStart && thisWeekVol === 0) {
    if (lastWeekTotal > 0) {
      mainText = '지난주 총 <strong>' + formatNum(lastWeekTotal) + 'kg</strong> 들었어요';
    } else {
      mainText = '이번 주 첫 운동을 시작해보세요!';
    }
    subText = '새로운 한 주가 시작됐어요';
  } else if (thisWeekVol > 0) {
    mainText = '이번 주 총 <strong>' + formatNum(thisWeekVol) + 'kg</strong> 들었어요';

    var diff = thisWeekVol - lastWeekVol;
    if (lastWeekVol === 0) {
      subText = '이번 주도 꾸준히 하고 있어요!';
    } else if (diff > 0) {
      subText = '지난주보다 <span class="vol-up">' + formatNum(diff) + 'kg</span> 더 들고 있어요';
    } else if (diff < 0) {
      subText = '지난주보다 <span class="vol-down">' + formatNum(Math.abs(diff)) + 'kg</span> 덜 들고 있어요';
    } else {
      subText = '지난주와 같은 페이스예요!';
    }
  } else {
    mainText = '이번 주 첫 운동을 시작해보세요!';
    if (lastWeekTotal > 0) {
      subText = '지난주에는 ' + formatNum(lastWeekTotal) + 'kg 들었어요';
    } else {
      subText = '운동 기록이 쌓이면 여기에 요약이 표시됩니다';
    }
  }

  el.innerHTML =
    '<div class="summary-msg-row">' +
      '<div class="summary-msg-main">' + mainText + '</div>' +
      '<div class="summary-msg-icons">' +
        '<button class="summary-msg-icon" onclick="showScreen(\'stats\')">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
        '</button>' +
        '<button class="summary-msg-icon" onclick="showScreen(\'settings\')">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>' +
        '</button>' +
      '</div>' +
    '</div>' +
    '<div class="summary-msg-sub">' + subText + '</div>';
}

// ══ 직전 운동 카드 ══
function renderLastWorkoutCard() {
  var el = document.getElementById('lastWorkoutCard');
  if (!el) return;

  // 선택된 날짜의 세션
  var sessions = getSessionsByDate(_selectedWeekDate);

  // 선택된 날짜에 세션이 없고 오늘이면 가장 최근 세션 1건
  var displayDate = _selectedWeekDate;
  if (sessions.length === 0 && _selectedWeekDate === today()) {
    var lastSession = getLastSession();
    if (lastSession) {
      sessions = [lastSession];
      displayDate = lastSession.date;
    }
  }

  // 세션 ID 기준 중복 제거
  var seen = {};
  var uniqueSessions = [];
  for (var i = 0; i < sessions.length; i++) {
    if (!seen[sessions[i].id]) {
      seen[sessions[i].id] = true;
      uniqueSessions.push(sessions[i]);
    }
  }
  sessions = uniqueSessions;

  if (sessions.length === 0) {
    el.innerHTML =
      '<div class="lw-empty">' +
        '<div class="lw-empty-text">운동 기록이 없습니다</div>' +
      '</div>';
    return;
  }

  // ── 병합: 볼륨/칼로리/시간 합산 ──
  var totalVolume = 0;
  var totalCalories = 0;
  var totalDuration = 0;

  // 부위 태그 합집합 (순서 유지)
  var tagSet = {};
  var tagList = [];

  // 종목별 세트 합산 {exerciseId: {doneSets, hasPR, totalMin(유산소)}}
  var exMap = {};
  var exOrder = []; // 종목 등장 순서

  for (var si = 0; si < sessions.length; si++) {
    var s = sessions[si];
    totalVolume += s.totalVolume || 0;
    totalCalories += s.totalCalories || 0;
    totalDuration += s.durationMin || 0;

    // 태그 합집합
    for (var ti = 0; ti < s.tags.length; ti++) {
      if (!tagSet[s.tags[ti]]) {
        tagSet[s.tags[ti]] = true;
        tagList.push(s.tags[ti]);
      }
    }

    // 종목별 합산
    for (var ei = 0; ei < s.exercises.length; ei++) {
      var ex = s.exercises[ei];
      var exId = ex.exerciseId;

      if (!exMap[exId]) {
        exMap[exId] = { doneSets: 0, hasPR: false, totalMin: 0 };
        exOrder.push(exId);
      }

      for (var ji = 0; ji < ex.sets.length; ji++) {
        var set = ex.sets[ji];
        if (set.done) {
          var exInfo = getExercise(exId);
          if (exInfo && exInfo.equipment === 'cardio') {
            exMap[exId].totalMin += set.reps || 0;
          }
          exMap[exId].doneSets++;
        }
        if (set.isPR) {
          exMap[exId].hasPR = true;
        }
      }
    }
  }

  // ── 렌더 ──

  // 부위 태그 HTML
  var tagsHtml = '';
  for (var i = 0; i < tagList.length; i++) {
    var part = getBodyPart(tagList[i]);
    var name = part ? part.name : tagList[i];
    tagsHtml += '<span class="lw-tag">' + name + '</span>';
  }

  // 종목 칩 HTML (완료 세트가 0인 종목 제외)
  var exChipsHtml = '';
  for (var i = 0; i < exOrder.length; i++) {
    var exId = exOrder[i];
    var data = exMap[exId];
    if (data.doneSets === 0) continue; // 세트 0인 종목 제외

    var exInfo = getExercise(exId);
    if (!exInfo) continue;

    var setsLabel = '';
    if (exInfo.equipment === 'cardio') {
      setsLabel = data.totalMin + '분';
    } else {
      setsLabel = data.doneSets + '세트';
    }

    exChipsHtml +=
      '<div class="lw-ex-chip">' +
        '<span>' + exInfo.name + '</span>' +
        '<span class="lw-ex-sets">' + setsLabel + '</span>' +
        (data.hasPR ? '<span class="lw-ex-pr">PR</span>' : '') +
      '</div>';
  }

  var html =
    '<div class="lw-card">' +
      '<div class="lw-header">' +
        '<span class="lw-date">' + formatDate(displayDate) + '</span>' +
        '<div class="lw-tags">' + tagsHtml + '</div>' +
      '</div>' +
      '<div class="lw-stats">' +
        '<div class="lw-stat">' +
          '<span class="lw-stat-num">' + formatNum(totalVolume) + '<small>kg</small></span>' +
          '<span class="lw-stat-label">볼륨</span>' +
        '</div>' +
        '<div class="lw-stat">' +
          '<span class="lw-stat-num">' + formatNum(totalCalories) + '<small>kcal</small></span>' +
          '<span class="lw-stat-label">칼로리</span>' +
        '</div>' +
        '<div class="lw-stat">' +
          '<span class="lw-stat-num">' + totalDuration + '<small>분</small></span>' +
          '<span class="lw-stat-label">시간</span>' +
        '</div>' +
      '</div>' +
      '<div class="lw-exercises">' + exChipsHtml + '</div>' +
    '</div>';

  el.innerHTML = html;

  // ── 홈 화면 종목 칩 롱프레스 바인딩 ──
  var homeChips = el.querySelectorAll('.lw-ex-chip');
  for (var ci = 0; ci < homeChips.length; ci++) {
    (function(chip) {
      var exName = chip.querySelector('span') ? chip.querySelector('span').textContent : '';

      bindLongPress(chip, function() {
        // 해당 날짜의 세션과 종목 찾기
        var chipSessions = getSessionsByDate(displayDate);
        var targetSessionId = '';
        var targetExerciseId = '';

        for (var si = 0; si < chipSessions.length; si++) {
          for (var ei = 0; ei < chipSessions[si].exercises.length; ei++) {
            var exInfo = getExercise(chipSessions[si].exercises[ei].exerciseId);
            if (exInfo && exInfo.name === exName) {
              targetSessionId = chipSessions[si].id;
              targetExerciseId = chipSessions[si].exercises[ei].exerciseId;
              break;
            }
          }
          if (targetSessionId) break;
        }

        if (!targetSessionId || !targetExerciseId) return;

        showActionSheet(exName, [
          {
            text: '기록 수정',
            onClick: function() {
              if (typeof enterEditMode === 'function') {
                enterEditMode(targetSessionId, targetExerciseId);
              }
            }
          },
          {
            text: '이 종목 삭제',
            cls: 'destructive',
            onClick: function() {
              showConfirm('기록을 삭제하시겠습니까?', function(confirmed) {
                if (confirmed) {
                  if (typeof deleteExerciseFromSession === 'function') {
                    deleteExerciseFromSession(targetSessionId, targetExerciseId);
                  }
                  if (typeof syncToServer === 'function') syncToServer(null, true);
                  renderLastWorkoutCard();
                }
              });
            }
          }
        ]);
      }, 600);
    })(homeChips[ci]);
  }
}

// ══ 주간 캘린더 ══
function renderWeekCal() {
  var el = document.getElementById('weekCal');
  if (!el) return;

  var weekStart = getWeekStartDate();
  var todayStr = today();
  var dows = ['월', '화', '수', '목', '금', '토', '일'];

  var html = '';
  html += '<div class="week-cal">';
  for (var i = 0; i < 7; i++) {
    var d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    var dateStr = getLocalYMD(d);
    var dayNum = d.getDate();

    var isToday = dateStr === todayStr;
    var isFuture = dateStr > todayStr;
    var isSelected = dateStr === _selectedWeekDate;
    var vol = getDayVolume(dateStr);
    var hasPR = hasPROnDate(dateStr);

    var dayClass = 'week-day';
    if (isToday) dayClass += ' today';
    if (isSelected && !isFuture) dayClass += ' selected';
    if (isFuture) dayClass += ' future';

    var volClass = 'week-day-vol';
    if (vol === 0) volClass += ' empty';
    else if (hasPR) volClass += ' has-pr';

    var volText = vol > 0 ? formatNum(vol) : '';

    var onclick = isFuture ? '' : ' onclick="selectWeekDate(\'' + dateStr + '\')"';

    html +=
      '<div class="' + dayClass + '"' + onclick + '>' +
        '<div class="week-day-dow">' + dows[i] + '</div>' +
        '<div class="week-day-body">' +
          '<div class="week-day-num">' + dayNum + '</div>' +
          '<div class="' + volClass + '">' + volText + '</div>' +
        '</div>' +
      '</div>';
  }
  html += '</div>';

  el.innerHTML = html;

  // ── 주간 캘린더 롱프레스 바인딩 (날짜 선택 + 기록 삭제) ──
  var weekDays = el.querySelectorAll('.week-day:not(.future)');
  for (var wi = 0; wi < weekDays.length; wi++) {
    (function(dayEl, idx) {
      var d = new Date(weekStart);
      d.setDate(d.getDate() + idx);
      var dateStr = getLocalYMD(d);

      bindLongPress(dayEl, function() {
        // 먼저 해당 날짜를 선택 상태로
        selectWeekDate(dateStr);

        var daySessions = getSessionsByDate(dateStr);
        if (daySessions.length === 0) return;

        showConfirm('기록을 모두 삭제하시겠습니까?', function(confirmed) {
          if (confirmed) {
            if (typeof deleteSessionsByDate === 'function') {
              deleteSessionsByDate(dateStr);
            }
            if (typeof syncToServer === 'function') syncToServer(null, true);
            renderHome();
          }
        });
      }, 600);
    })(weekDays[wi], wi);
  }
}

function selectWeekDate(dateStr) {
  _selectedWeekDate = dateStr;
  renderWeekCal();
  renderLastWorkoutCard();
}

// ══ 월간 캘린더 ══
function renderMonthCal() {
  var el = document.getElementById('monthCal');
  if (!el) return;

  var sessions = getSessionsByMonth(_currentYM);
  var dayTags = {};
  for (var i = 0; i < sessions.length; i++) {
    var day = sessions[i].date;
    if (!dayTags[day]) dayTags[day] = [];
    for (var j = 0; j < sessions[i].tags.length; j++) {
      var t = sessions[i].tags[j];
      if (dayTags[day].indexOf(t) < 0) dayTags[day].push(t);
    }
  }

  var [y, m] = _currentYM.split('-').map(Number);
  var daysInMonth = getDaysInMonth(_currentYM);
  var firstDay = getFirstDayOfMonth(_currentYM);
  var todayStr = today();

  var html = '<div class="month-cal">';

  // 요일 헤더
  html += '<div class="month-cal-grid">';
  var dows = ['일', '월', '화', '수', '목', '금', '토'];
  for (var i = 0; i < 7; i++) {
    html += '<div class="month-cal-dow">' + dows[i] + '</div>';
  }

  // 빈 칸
  for (var i = 0; i < firstDay; i++) {
    html += '<div class="month-cal-day empty"></div>';
  }

  // 날짜
  for (var d = 1; d <= daysInMonth; d++) {
    var dateStr = _currentYM + '-' + String(d).padStart(2, '0');
    var isToday = dateStr === todayStr;
    var tags = dayTags[dateStr] || [];

    var dayClass = 'month-cal-day';
    if (isToday) dayClass += ' today';
    if (tags.length > 0) dayClass += ' has-workout';

    var dots = '';
    if (tags.length > 0) {
      dots = '<div class="month-cal-dots">';
      for (var t = 0; t < tags.length && t < 3; t++) {
        var part = getBodyPart(tags[t]);
        var color = part ? part.color : '#999';
        dots += '<span class="month-cal-dot" style="background:' + color + '"></span>';
      }
      dots += '</div>';
    }

    html +=
      '<div class="' + dayClass + '" onclick="openBottomSheet(\'' + dateStr + '\')">' +
        '<span class="month-cal-day-num">' + d + '</span>' +
        dots +
      '</div>';
  }

  html += '</div>';
  html += '</div>';

  el.innerHTML = html;
}

// ══ 바텀시트 ══
function openBottomSheet(dateStr) {
  var overlay = document.getElementById('bottomSheetOverlay');
  var sheet = document.getElementById('bottomSheet');
  var content = document.getElementById('bottomSheetContent');

  var sessions = getSessionsByDate(dateStr);
  if (sessions.length === 0) {
    content.innerHTML = '<div class="empty-msg">운동 기록이 없습니다</div>';
  } else {
    var html = '<div class="bs-date">' + formatDate(dateStr) + '</div>';
    for (var i = 0; i < sessions.length; i++) {
      var s = sessions[i];
      var tagNames = [];
      for (var j = 0; j < s.tags.length; j++) {
        var part = getBodyPart(s.tags[j]);
        tagNames.push(part ? part.name : s.tags[j]);
      }
      html +=
        '<div class="bs-session">' +
          '<div class="bs-tags">' + tagNames.join(' · ') + '</div>' +
          '<div class="bs-stats">' +
            '<span>' + formatNum(s.totalVolumeExWarmup || 0) + 'kg</span>' +
            '<span>·</span>' +
            '<span>' + formatDuration(s.durationMin || 0) + '</span>' +
            '<span>·</span>' +
            '<span>' + formatNum(s.totalCalories || 0) + 'kcal</span>' +
          '</div>' +
        '</div>';
    }
    content.innerHTML = html;
  }

  overlay.style.display = 'block';
  sheet.style.display = 'block';
  _bottomSheetOpen = true;
}

function closeBottomSheet() {
  var overlay = document.getElementById('bottomSheetOverlay');
  var sheet = document.getElementById('bottomSheet');
  overlay.style.display = 'none';
  sheet.style.display = 'none';
  _bottomSheetOpen = false;
}

// ══ 커스텀 확인 모달 ══
var _confirmCallback = null;

function showConfirm(message, onResult) {
  var overlay = document.getElementById('confirmModal');
  var msgEl = document.getElementById('confirmModalMsg');

  if (!overlay || !msgEl) return;

  msgEl.textContent = message;
  _confirmCallback = onResult;
  overlay.style.display = 'flex';
}

function hideConfirm(result) {
  var overlay = document.getElementById('confirmModal');
  if (overlay) {
    overlay.style.display = 'none';
  }

  if (_confirmCallback) {
    _confirmCallback(result);
    _confirmCallback = null;
  }
}

// ══ 월 전환 ══
function changeMonth(delta) {
  var [y, m] = _currentYM.split('-').map(Number);
  m += delta;

  if (m < 1) {
    m = 12;
    y -= 1;
  } else if (m > 12) {
    m = 1;
    y += 1;
  }

  _currentYM = y + '-' + String(m).padStart(2, '0');
  updateMonthTitle();
  renderHome();
}

function updateMonthTitle() {
  var [y, m] = _currentYM.split('-').map(Number);
  var el = document.getElementById('monthTitle');
  if (el) el.textContent = m + '월';
}

// ══ 하단 고정 버튼 상태 관리 ══
var _bottomBtnState = 'start'; // 'start' | 'continue' | 'partSelect' | 'partSelectReady' | 'workout' | 'summary'
var _longPressTimer = null;
var _longPressTriggered = false;

function updateBottomButton(state) {
  _bottomBtnState = state;
  var btn = document.getElementById('bottomBtn');
  if (!btn) return;

  // 기존 이벤트 정리
  btn.onclick = null;
  btn.onmousedown = null;
  btn.onmouseup = null;
  btn.onmouseleave = null;
  btn.ontouchstart = null;
  btn.ontouchend = null;
  btn.ontouchcancel = null;

  btn.style.display = 'block';

  switch (state) {
    case 'start':
      btn.textContent = 'START WORKOUT';
      btn.disabled = false;
      btn.style.background = 'var(--dark)';
      btn.style.color = 'var(--white)';
      btn.onclick = onBottomBtnClick;
      break;
    case 'continue':
      btn.textContent = 'CONTINUE WORKOUT';
      btn.disabled = false;
      btn.style.background = '#e85040';
      btn.style.color = 'var(--white)';
      // 길게 누르기 이벤트 등록 (클릭도 여기서 처리)
      setupLongPress(btn);
      break;
    case 'partSelect':
      btn.textContent = 'START';
      btn.disabled = true;
      btn.style.background = 'var(--border-gray)';
      btn.style.color = 'var(--icon-inactive)';
      btn.onclick = onBottomBtnClick;
      break;
    case 'partSelectReady':
      btn.textContent = 'START';
      btn.disabled = false;
      btn.style.background = 'var(--dark)';
      btn.style.color = 'var(--white)';
      btn.onclick = onBottomBtnClick;
      break;
    case 'workout':
      btn.textContent = 'FINISH WORKOUT';
      btn.disabled = false;
      btn.style.background = 'var(--dark)';
      btn.style.color = 'var(--white)';
      btn.onclick = onBottomBtnClick;
      break;
    case 'summary':
      btn.textContent = 'DONE';
      btn.disabled = false;
      btn.style.background = 'var(--dark)';
      btn.style.color = 'var(--white)';
      btn.onclick = onBottomBtnClick;
      break;
    case 'editSave':
      btn.textContent = 'SAVE CHANGES';
      btn.disabled = false;
      btn.style.background = 'var(--dark)';
      btn.style.color = 'var(--white)';
      btn.onclick = onBottomBtnClick;
      break;
  }
}

function setupLongPress(btn) {
  var startLongPress = function(e) {
    _longPressTriggered = false;
    _longPressTimer = setTimeout(function() {
      _longPressTriggered = true;
      // 길게 누르면 취소 옵션
      showConfirm('운동을 취소하시겠습니까?\n기록이 저장되지 않습니다.', function(confirmed) {
        if (confirmed) {
          cancelWorkout();
        }
      });
    }, 800);
  };

  var endLongPress = function(e) {
    if (_longPressTimer) {
      clearTimeout(_longPressTimer);
      _longPressTimer = null;
    }
    // 길게 누르기가 실행되지 않았으면 일반 클릭 처리
    if (!_longPressTriggered) {
      onBottomBtnClick();
    }
    _longPressTriggered = false;
  };

  var cancelLongPress = function() {
    if (_longPressTimer) {
      clearTimeout(_longPressTimer);
      _longPressTimer = null;
    }
    _longPressTriggered = false;
  };

  // 터치 이벤트
  btn.ontouchstart = startLongPress;
  btn.ontouchend = endLongPress;
  btn.ontouchcancel = cancelLongPress;

  // 마우스 이벤트 (데스크톱 테스트용)
  btn.onmousedown = startLongPress;
  btn.onmouseup = endLongPress;
  btn.onmouseleave = cancelLongPress;
}

function onBottomBtnClick() {
  switch (_bottomBtnState) {
    case 'start':
      startWorkoutFlow();
      break;
    case 'continue':
      // 진행 중인 세션 복원하고 운동 화면으로
      restoreSession();
      showScreen('workout');
      updateBottomButton('workout');
      break;
    case 'partSelectReady':
      startWorkout();
      break;
    case 'workout':
      finishWorkout();
      break;
    case 'summary':
      showScreen('home');
      break;
    case 'partSelect':
      // disabled 상태, 동작 없음
      break;
    case 'editSave':
      saveEditChanges();
      break;
  }
}

// ══ 액션시트 (iOS 스타일) ══
function showActionSheet(title, buttons) {
  var overlay = document.getElementById('actionSheetOverlay');
  var sheet = document.getElementById('actionSheet');
  if (!overlay || !sheet) return;

  var html = '<div class="action-sheet-group">';
  if (title) {
    html += '<div class="action-sheet-title">' + title + '</div>';
  }
  for (var i = 0; i < buttons.length; i++) {
    var b = buttons[i];
    var btnClass = 'action-sheet-btn' + (b.cls ? ' ' + b.cls : '');
    html += '<button class="' + btnClass + '" data-idx="' + i + '">' + b.text + '</button>';
  }
  html += '</div>';
  html += '<button class="action-sheet-cancel" onclick="hideActionSheet()">취소</button>';

  sheet.innerHTML = html;

  var btns = sheet.querySelectorAll('.action-sheet-btn');
  for (var i = 0; i < btns.length; i++) {
    (function(idx) {
      btns[idx].onclick = function() {
        hideActionSheet();
        setTimeout(function() {
          if (buttons[idx] && buttons[idx].onClick) buttons[idx].onClick();
        }, 250);
      };
    })(i);
  }

  requestAnimationFrame(function() {
    overlay.classList.add('visible');
    sheet.classList.add('visible');
  });
}

function hideActionSheet() {
  var overlay = document.getElementById('actionSheetOverlay');
  var sheet = document.getElementById('actionSheet');
  if (overlay) overlay.classList.remove('visible');
  if (sheet) sheet.classList.remove('visible');
  setTimeout(function() {
    if (sheet) sheet.innerHTML = '';
  }, 300);
}

// ══ 롱프레스 헬퍼 (텍스트 선택/콜아웃 차단) ══
function bindLongPress(el, callback, ms) {
  var timer = null;
  var triggered = false;
  var startX = 0;
  var startY = 0;
  var pressClass = 'long-pressing';

  el.addEventListener('touchstart', function(e) {
    triggered = false;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    el.classList.add(pressClass);
    timer = setTimeout(function() {
      triggered = true;
      el.classList.remove(pressClass);
      callback(e);
    }, ms || 600);
  }, { passive: true });

  el.addEventListener('touchmove', function(e) {
    if (!timer) return;
    var dx = Math.abs(e.touches[0].clientX - startX);
    var dy = Math.abs(e.touches[0].clientY - startY);
    if (dx > 10 || dy > 10) {
      clearTimeout(timer);
      timer = null;
      triggered = false;
      el.classList.remove(pressClass);
    }
  }, { passive: true });

  el.addEventListener('touchend', function(e) {
    if (timer) { clearTimeout(timer); timer = null; }
    el.classList.remove(pressClass);
    if (triggered) { e.preventDefault(); triggered = false; }
  }, { passive: false });

  el.addEventListener('touchcancel', function() {
    if (timer) { clearTimeout(timer); timer = null; }
    triggered = false;
    el.classList.remove(pressClass);
  }, { passive: true });
}
