/* ═══ ui.js — 메인 화면, 캘린더, 화면 전환 ═══ */

var _currentYM = getYM(); // 현재 선택된 월
var _bottomSheetOpen = false;
var _selectedWeekDate = today(); // 주간 캘린더에서 선택된 날짜 (기본: 오늘)

// ══ 화면 전환 ══
function showScreen(screenId) {
  var mainView = document.getElementById('main-view');
  var workoutScreen = document.getElementById('screen-workout');
  var workoutHeader = document.getElementById('workoutHeader');

  if (screenId === 'home') {
    mainView.style.display = 'block';
    workoutScreen.style.display = 'none';
    workoutHeader.style.display = 'none';
    renderHome();
    window.scrollTo(0, 0);
  } else if (screenId === 'workout') {
    mainView.style.display = 'none';
    workoutScreen.style.display = 'block';
    workoutHeader.style.display = 'flex';
    renderWorkoutScreen();
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
  var isWeekStart = (dayOfWeek === 1); // 월요일

  var mainText = '';
  var subText = '';

  if (isWeekStart && thisWeekVol === 0) {
    if (lastWeekTotal > 0) {
      mainText = '지난주 총 <strong>' + formatNum(lastWeekTotal) + 'kg</strong> 들었어요';
    } else {
      mainText = '이번 주 첫 운동을 시작해보세요!';
    }
    subText = '새로운 한 주가 시작됐어요 💪';
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
    '<button class="summary-cal-btn" onclick="showScreen(\'stats\')">' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
    '</button>' +
    '<div class="summary-msg-main">' + mainText + '</div>' +
    '<div class="summary-msg-sub">' + subText + '</div>';
}

// ══ 직전 운동 카드 ══
function renderLastWorkoutCard() {
  var el = document.getElementById('lastWorkoutCard');
  if (!el) return;

  // 선택된 날짜의 세션 표시
  var sessions = getSessionsByDate(_selectedWeekDate);

  // 선택된 날짜에 세션이 없고 오늘이면 가장 최근 세션 표시
  if (sessions.length === 0 && _selectedWeekDate === today()) {
    var lastSession = getLastSession();
    if (lastSession) {
      sessions = [lastSession];
    }
  }

  if (sessions.length === 0) {
    el.innerHTML =
      '<div class="lw-empty">' +
        '<div class="lw-empty-icon">💪</div>' +
        '<div class="lw-empty-text">운동 기록이 없습니다</div>' +
      '</div>';
    return;
  }

  var html = '';
  for (var si = 0; si < sessions.length; si++) {
    var s = sessions[si];

    // 부위 태그
    var tagsHtml = '';
    for (var i = 0; i < s.tags.length; i++) {
      var part = getBodyPart(s.tags[i]);
      var name = part ? part.name : s.tags[i];
      tagsHtml += '<span class="lw-tag">' + name + '</span>';
    }

    // 종목 칩
    var exChipsHtml = '';
    for (var i = 0; i < s.exercises.length; i++) {
      var ex = s.exercises[i];
      var exInfo = getExercise(ex.exerciseId);
      if (!exInfo) continue;

      var doneSets = 0;
      var hasPR = false;
      for (var j = 0; j < ex.sets.length; j++) {
        if (ex.sets[j].done) doneSets++;
        if (ex.sets[j].isPR) hasPR = true;
      }

      // 유산소(cardio)는 reps를 분으로 표기
      var setsLabel = '';
      if (exInfo.equipment === 'cardio') {
        var totalMin = 0;
        for (var m = 0; m < ex.sets.length; m++) {
          if (ex.sets[m].done) totalMin += ex.sets[m].reps || 0;
        }
        setsLabel = totalMin + '분';
      } else {
        setsLabel = doneSets + '세트';
      }

      exChipsHtml +=
        '<div class="lw-ex-chip">' +
          '<span>' + exInfo.name + '</span>' +
          '<span class="lw-ex-sets">' + setsLabel + '</span>' +
          (hasPR ? '<span class="lw-ex-pr">PR</span>' : '') +
        '</div>';
    }

    html +=
      '<div class="lw-card" onclick="openBottomSheet(\'' + s.date + '\')">' +
        '<div class="lw-header">' +
          '<span class="lw-date">' + formatDate(s.date) + '</span>' +
          '<div class="lw-tags">' + tagsHtml + '</div>' +
        '</div>' +
        '<div class="lw-stats">' +
          '<div class="lw-stat">' +
            '<span class="lw-stat-num">' + formatNum(s.totalVolume || 0) + '<small>kg</small></span>' +
            '<span class="lw-stat-label">볼륨</span>' +
          '</div>' +
          '<div class="lw-stat">' +
            '<span class="lw-stat-num">' + formatNum(s.totalCalories || 0) + '<small>kcal</small></span>' +
            '<span class="lw-stat-label">칼로리</span>' +
          '</div>' +
          '<div class="lw-stat">' +
            '<span class="lw-stat-num">' + (s.durationMin || 0) + '<small>분</small></span>' +
            '<span class="lw-stat-label">시간</span>' +
          '</div>' +
        '</div>' +
        '<div class="lw-exercises">' + exChipsHtml + '</div>' +
      '</div>';
  }

  el.innerHTML = html;
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
    var isSelected = dateStr === _selectedWeekDate;
    var vol = getDayVolume(dateStr);
    var hasPR = hasPROnDate(dateStr);

    var dayClass = 'week-day';
    if (isToday) dayClass += ' today';
    if (isSelected) dayClass += ' selected';

    var volClass = 'week-day-vol';
    if (vol === 0) volClass += ' empty';
    else if (hasPR) volClass += ' has-pr';

    var volText = vol > 0 ? formatNum(vol) : '';

    html +=
      '<div class="' + dayClass + '" onclick="selectWeekDate(\'' + dateStr + '\')">' +
        '<div class="week-day-dow">' + dows[i] + '</div>' +
        '<div class="week-day-num">' + dayNum + '</div>' +
        '<div class="' + volClass + '">' + volText + '</div>' +
      '</div>';
  }
  html += '</div>';

  el.innerHTML = html;
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
