/* ═══ ui.js — 화면 전환, 대시보드, 캘린더 ═══ */

var activeScreen = 'home';
var _calendarYM = getYM(); // 캘린더 현재 월

// ══ 화면 전환 ══
function showScreen(screenId) {
  activeScreen = screenId;
  var screens = document.querySelectorAll('.screen');
  for (var i = 0; i < screens.length; i++) {
    screens[i].classList.remove('active');
  }
  document.getElementById('screen-' + screenId).classList.add('active');

  // 탭바 활성화
  var tabs = document.querySelectorAll('.tab-item');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.remove('on');
  }
  var tabMap = { home: 0, workout: 1, stats: 2 };
  if (tabMap[screenId] !== undefined) {
    tabs[tabMap[screenId]].classList.add('on');
  }

  // 화면별 렌더
  if (screenId === 'home') renderHome();
  else if (screenId === 'workout') renderWorkoutScreen();
  else if (screenId === 'stats') renderStats();

  window.scrollTo(0, 0);
}

// ══ 홈 화면 ══
function renderHome() {
  renderWeekSummary();
  renderStreak();
  renderRecentPRs();
  renderCalendar(_calendarYM);
}

function renderWeekSummary() {
  var s = getWeekSummary();
  var el = document.getElementById('weekSummary');
  if (!el) return;
  el.innerHTML =
    '<div class="today-stat">' +
      '<div class="stat-num">' + s.count + '</div>' +
      '<div class="stat-unit">운동 횟수</div>' +
    '</div>' +
    '<div class="today-stat">' +
      '<div class="stat-num">' + formatNum(s.volume) + '</div>' +
      '<div class="stat-unit">총 볼륨 kg</div>' +
    '</div>' +
    '<div class="today-stat">' +
      '<div class="stat-num">' + formatDuration(s.duration) + '</div>' +
      '<div class="stat-unit">운동 시간</div>' +
    '</div>' +
    '<div class="today-stat">' +
      '<div class="stat-num">' + formatNum(s.calories) + '</div>' +
      '<div class="stat-unit">kcal</div>' +
    '</div>';
}

function renderStreak() {
  var streak = getStreak();
  var el = document.getElementById('streakNum');
  if (el) el.textContent = streak;
}

function renderRecentPRs() {
  var prs = getRecentPRs(3);
  var el = document.getElementById('recentPRs');
  if (!el) return;

  if (prs.length === 0) {
    el.innerHTML = '<div class="empty-msg">아직 기록이 없습니다</div>';
    return;
  }

  var html = '';
  for (var i = 0; i < prs.length; i++) {
    var pr = prs[i];
    var ex = getExercise(pr.exerciseId);
    var name = ex ? ex.name : pr.exerciseId;
    html +=
      '<div class="pr-item">' +
        '<div class="pr-badge">🏆</div>' +
        '<div class="pr-info">' +
          '<div class="pr-name">' + name + '</div>' +
          '<div class="pr-detail">' + pr.weight + 'kg × ' + pr.reps + '회</div>' +
        '</div>' +
        '<div class="pr-date">' + formatDate(pr.date) + '</div>' +
      '</div>';
  }
  el.innerHTML = html;
}

// ══ 캘린더 ══
function renderCalendar(ym) {
  _calendarYM = ym || getYM();
  var el = document.getElementById('calendar');
  if (!el) return;

  var sessions = getSessionsByMonth(_calendarYM);
  // 날짜별 태그 매핑
  var dayTags = {};
  for (var i = 0; i < sessions.length; i++) {
    var day = sessions[i].date;
    if (!dayTags[day]) dayTags[day] = [];
    for (var j = 0; j < sessions[i].tags.length; j++) {
      var t = sessions[i].tags[j];
      if (dayTags[day].indexOf(t) < 0) dayTags[day].push(t);
    }
  }

  var [y, m] = _calendarYM.split('-').map(Number);
  var daysInMonth = getDaysInMonth(_calendarYM);
  var firstDay = getFirstDayOfMonth(_calendarYM);
  var todayStr = today();

  // 헤더
  var prevYM = m === 1 ? (y - 1) + '-12' : y + '-' + String(m - 1).padStart(2, '0');
  var nextYM = m === 12 ? (y + 1) + '-01' : y + '-' + String(m + 1).padStart(2, '0');

  var html =
    '<div class="cal-header">' +
      '<button class="cal-nav" onclick="renderCalendar(\'' + prevYM + '\')">‹</button>' +
      '<span class="cal-title">' + y + '년 ' + m + '월</span>' +
      '<button class="cal-nav" onclick="renderCalendar(\'' + nextYM + '\')">›</button>' +
    '</div>';

  // 요일 헤더
  html += '<div class="cal-grid">';
  var dows = ['일', '월', '화', '수', '목', '금', '토'];
  for (var i = 0; i < 7; i++) {
    html += '<div class="cal-dow">' + dows[i] + '</div>';
  }

  // 빈 칸 (1일 이전)
  for (var i = 0; i < firstDay; i++) {
    html += '<div class="cal-day empty"></div>';
  }

  // 날짜
  for (var d = 1; d <= daysInMonth; d++) {
    var dateStr = _calendarYM + '-' + String(d).padStart(2, '0');
    var isToday = dateStr === todayStr;
    var tags = dayTags[dateStr] || [];

    var dayClass = 'cal-day';
    if (isToday) dayClass += ' today';
    if (tags.length > 0) dayClass += ' has-workout';

    var dots = '';
    if (tags.length > 0) {
      dots = '<div class="cal-dots">';
      for (var t = 0; t < tags.length && t < 3; t++) {
        var part = getBodyPart(tags[t]);
        var color = part ? part.color : '#999';
        dots += '<span class="cal-dot" style="background:' + color + '"></span>';
      }
      dots += '</div>';
    }

    html +=
      '<div class="' + dayClass + '" onclick="renderDayDetail(\'' + dateStr + '\')">' +
        '<span class="cal-day-num">' + d + '</span>' +
        dots +
      '</div>';
  }

  html += '</div>';

  // 날짜 상세 슬롯
  html += '<div id="dayDetail"></div>';

  el.innerHTML = html;
}

function renderDayDetail(dateStr) {
  var el = document.getElementById('dayDetail');
  if (!el) return;

  var sessions = getSessionsByDate(dateStr);
  if (sessions.length === 0) {
    el.innerHTML = '';
    return;
  }

  var html = '<div class="day-detail"><div class="day-detail-title">' + formatDate(dateStr) + '</div>';

  for (var i = 0; i < sessions.length; i++) {
    var s = sessions[i];
    var tagNames = [];
    for (var j = 0; j < s.tags.length; j++) {
      var part = getBodyPart(s.tags[j]);
      tagNames.push(part ? part.name : s.tags[j]);
    }
    html +=
      '<div class="day-session">' +
        '<div class="day-session-tags">' + tagNames.join(' · ') + '</div>' +
        '<div class="day-session-stats">' +
          formatNum(s.totalVolumeExWarmup || 0) + 'kg · ' +
          formatDuration(s.durationMin || 0) + ' · ' +
          formatNum(s.totalCalories || 0) + 'kcal' +
        '</div>' +
      '</div>';
  }

  html += '</div>';
  el.innerHTML = html;
}

// ══ 히스토리 ══
function renderHistory() {
  var el = document.getElementById('historyList');
  if (!el) return;

  var sessions = getSessions().slice(0, 20);
  if (sessions.length === 0) {
    el.innerHTML = '<div class="empty-msg">아직 운동 기록이 없습니다</div>';
    return;
  }

  var html = '';
  for (var i = 0; i < sessions.length; i++) {
    var s = sessions[i];
    var tagHtml = '';
    for (var j = 0; j < s.tags.length; j++) {
      var part = getBodyPart(s.tags[j]);
      if (part) {
        tagHtml += '<span class="history-tag" style="background:' + part.bg + ';color:' + part.color + '">' + part.name + '</span>';
      }
    }
    html +=
      '<div class="history-item" onclick="showSessionDetail(\'' + s.id + '\')">' +
        '<div class="hi-top">' +
          '<div class="hi-date">' + formatDate(s.date) + '</div>' +
          '<div class="hi-tags">' + tagHtml + '</div>' +
        '</div>' +
        '<div class="hi-summary">' +
          formatNum(s.totalVolumeExWarmup || 0) + 'kg · ' +
          formatDuration(s.durationMin || 0) + ' · ' +
          formatNum(s.totalCalories || 0) + 'kcal' +
        '</div>' +
      '</div>';
  }
  el.innerHTML = html;
}

function showSessionDetail(sessionId) {
  // TODO: 세션 상세 보기 (2차)
}
