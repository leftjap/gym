/* ═══ stats.js — 통계/기록 화면 ═══ */

var _statsYM = getYM();           // 통계 화면에서 보고 있는 월
var _statsSelectedDate = today(); // 통계 화면 캘린더에서 선택된 날짜

// ══ 통계 화면 전체 렌더 ══
function renderStatsScreen() {
  var container = document.getElementById('statsContent');
  if (!container) return;

  var html = '';

  // 헤더 (뒤로가기 + 월 이동)
  html += renderStatsHeader();

  // 요약문
  html += renderStatsSummary();

  // 월간 캘린더
  html += renderStatsMonthCal();

  // 선택된 날짜의 운동 카드
  html += '<div id="statsWorkoutCard" class="stats-workout-card"></div>';

  // 히어로 랭킹 + 월별 차트는 작업지시서 B, C에서 추가
  html += '<div id="statsHeroRanking"></div>';
  html += '<div id="statsMonthlyChart"></div>';

  // 하단 여백
  html += '<div style="height:40px"></div>';

  container.innerHTML = html;

  // 선택된 날짜 카드 렌더
  renderStatsWorkoutCard();
}

// ══ 헤더 ══
function renderStatsHeader() {
  var parts = _statsYM.split('-');
  var m = parseInt(parts[1]);

  return (
    '<div class="stats-header">' +
      '<button class="stats-header-back" onclick="showScreen(\'home\')">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>' +
      '</button>' +
      '<div class="stats-header-month">' +
        '<button class="stats-month-nav" onclick="changeStatsMonth(-1)">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>' +
        '</button>' +
        '<span class="stats-month-title">' + m + '월</span>' +
        '<button class="stats-month-nav" onclick="changeStatsMonth(1)">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>' +
        '</button>' +
      '</div>' +
      '<div style="width:36px"></div>' +
    '</div>'
  );
}

// ══ 월 이동 ══
function changeStatsMonth(delta) {
  var parts = _statsYM.split('-').map(Number);
  var y = parts[0];
  var m = parts[1] + delta;

  if (m < 1) { m = 12; y -= 1; }
  else if (m > 12) { m = 1; y += 1; }

  _statsYM = y + '-' + String(m).padStart(2, '0');
  _statsSelectedDate = null;
  renderStatsScreen();
}

// ══ 요약문 ══
function renderStatsSummary() {
  var summary = getMonthSummary(_statsYM);
  var parts = _statsYM.split('-');
  var m = parseInt(parts[1]);

  var mainText = '';
  var subText = '';

  if (summary.volume > 0) {
    mainText = m + '월에는 총 <strong>' + formatNum(summary.volume) + 'kg</strong> 들었어요';
    if (summary.count > 0) {
      subText = summary.count + '회 운동 · ' + formatDuration(summary.duration) + ' · ' + formatNum(summary.calories) + 'kcal';
    }
  } else {
    mainText = m + '월에는 아직 기록이 없어요';
    subText = '운동을 시작해보세요!';
  }

  return (
    '<div class="stats-summary">' +
      '<div class="stats-summary-main">' + mainText + '</div>' +
      '<div class="stats-summary-sub">' + subText + '</div>' +
    '</div>'
  );
}

// ══ 월간 캘린더 (주간 캘린더 스타일 적용) ══
function renderStatsMonthCal() {
  var daysInMonth = getDaysInMonth(_statsYM);
  var firstDay = getFirstDayOfMonth(_statsYM);
  var todayStr = today();
  var dayVolumes = getMonthDayVolumes(_statsYM);
  var prDates = getMonthPRDates(_statsYM);

  // 월요일 시작으로 변환 (일=0 → 6, 월=1 → 0, ...)
  var firstDayMon = firstDay === 0 ? 6 : firstDay - 1;

  var dows = ['월', '화', '수', '목', '금', '토', '일'];

  var html = '<div class="stats-cal">';

  // 요일 헤더
  html += '<div class="stats-cal-dow-row">';
  for (var i = 0; i < 7; i++) {
    html += '<div class="stats-cal-dow">' + dows[i] + '</div>';
  }
  html += '</div>';

  // 날짜 그리드
  html += '<div class="stats-cal-grid">';

  // 빈 칸
  for (var i = 0; i < firstDayMon; i++) {
    html += '<div class="stats-cal-cell empty"></div>';
  }

  // 날짜
  for (var d = 1; d <= daysInMonth; d++) {
    var dateStr = _statsYM + '-' + String(d).padStart(2, '0');
    var isToday = dateStr === todayStr;
    var isSelected = dateStr === _statsSelectedDate;
    var vol = dayVolumes[dateStr] || 0;
    var hasPR = prDates[dateStr] || false;

    var cellClass = 'stats-cal-cell';
    if (isToday) cellClass += ' today';
    if (isSelected) cellClass += ' selected';

    var volClass = 'stats-cal-vol';
    if (vol === 0) volClass += ' empty';
    else if (hasPR) volClass += ' has-pr';

    var volText = vol > 0 ? formatNum(vol) : '';

    html +=
      '<div class="' + cellClass + '" onclick="selectStatsDate(\'' + dateStr + '\')">' +
        '<div class="stats-cal-body">' +
          '<div class="stats-cal-num">' + d + '</div>' +
          '<div class="' + volClass + '">' + volText + '</div>' +
        '</div>' +
      '</div>';
  }

  html += '</div>';
  html += '</div>';

  return html;
}

// ══ 날짜 선택 ══
function selectStatsDate(dateStr) {
  _statsSelectedDate = dateStr;
  renderStatsScreen();
}

// ══ 선택된 날짜의 운동 카드 ══
function renderStatsWorkoutCard() {
  var el = document.getElementById('statsWorkoutCard');
  if (!el) return;

  if (!_statsSelectedDate) {
    el.innerHTML = '';
    return;
  }

  var sessions = getSessionsByDate(_statsSelectedDate);

  if (sessions.length === 0) {
    el.innerHTML = '';
    return;
  }

  // 병합 로직 (홈 화면과 동일)
  var seen = {};
  var uniqueSessions = [];
  for (var i = 0; i < sessions.length; i++) {
    if (!seen[sessions[i].id]) {
      seen[sessions[i].id] = true;
      uniqueSessions.push(sessions[i]);
    }
  }
  sessions = uniqueSessions;

  var totalVolume = 0;
  var totalCalories = 0;
  var totalDuration = 0;
  var tagSet = {};
  var tagList = [];
  var exMap = {};
  var exOrder = [];

  for (var si = 0; si < sessions.length; si++) {
    var s = sessions[si];
    totalVolume += s.totalVolume || 0;
    totalCalories += s.totalCalories || 0;
    totalDuration += s.durationMin || 0;

    for (var ti = 0; ti < s.tags.length; ti++) {
      if (!tagSet[s.tags[ti]]) {
        tagSet[s.tags[ti]] = true;
        tagList.push(s.tags[ti]);
      }
    }

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
        if (set.isPR) exMap[exId].hasPR = true;
      }
    }
  }

  var tagsHtml = '';
  for (var i = 0; i < tagList.length; i++) {
    var part = getBodyPart(tagList[i]);
    tagsHtml += '<span class="lw-tag">' + (part ? part.name : tagList[i]) + '</span>';
  }

  var exChipsHtml = '';
  for (var i = 0; i < exOrder.length; i++) {
    var exId = exOrder[i];
    var data = exMap[exId];
    if (data.doneSets === 0) continue;
    var exInfo = getExercise(exId);
    if (!exInfo) continue;

    var setsLabel = exInfo.equipment === 'cardio' ? data.totalMin + '분' : data.doneSets + '세트';

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
        '<span class="lw-date">' + formatDate(_statsSelectedDate) + '</span>' +
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
}
