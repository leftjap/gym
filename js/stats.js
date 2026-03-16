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

  // 히어로 랭킹
  html += renderStatsHeroRanking();

  // 월별 볼륨 차트
  html += renderStatsMonthlyChart();

  // 하단 여백
  html += '<div style="height:40px"></div>';

  container.innerHTML = html;

  // ── 캘린더 날짜 롱프레스 바인딩 ──
  var calCells = container.querySelectorAll('.stats-cal-cell:not(.empty):not(.future)');
  for (var ci = 0; ci < calCells.length; ci++) {
    (function(cell) {
      var dateStr = cell.getAttribute('data-date');
      if (!dateStr) return;
      bindLongPress(cell, function() {
        var sessions = getSessionsByDate(dateStr);
        if (sessions.length === 0) return; // 기록 없으면 무반응

        // 부위 태그 텍스트 생성
        var tagNames = [];
        for (var i = 0; i < sessions.length; i++) {
          for (var j = 0; j < sessions[i].tags.length; j++) {
            var p = getBodyPart(sessions[i].tags[j]);
            var name = p ? p.name : sessions[i].tags[j];
            if (tagNames.indexOf(name) < 0) tagNames.push(name);
          }
        }
        var tagText = tagNames.length > 0 ? tagNames.join(' · ') : '';

        showConfirm(
          '기록을 모두 삭제하시겠습니까?',
          function(confirmed) {
            if (confirmed) {
              deleteSessionsByDate(dateStr);
              if (typeof syncToServer === 'function') syncToServer();
              _statsSelectedDate = null;
              renderStatsScreen();
            }
          }
        );
      }, 600);
    })(calCells[ci]);
  }

  // 선택된 날짜 카드 렌더
  renderStatsWorkoutCard();
}

// ══ 헤더 ══
function renderStatsHeader() {
  var parts = _statsYM.split('-');
  var m = parseInt(parts[1]);
  var currentYM = getYM();
  var isCurrentMonth = _statsYM === currentYM;

  var nextBtnClass = 'stats-month-nav' + (isCurrentMonth ? ' disabled' : '');

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
        '<button class="' + nextBtnClass + '" onclick="changeStatsMonth(1)">' +
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

  var newYM = y + '-' + String(m).padStart(2, '0');

  // 미래 월 이동 차단
  var currentYM = getYM();
  if (newYM > currentYM) return;

  _statsYM = newYM;
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

  var firstDayMon = firstDay === 0 ? 6 : firstDay - 1;

  var dows = ['월', '화', '수', '목', '금', '토', '일'];

  var html = '<div class="stats-cal">';

  html += '<div class="stats-cal-dow-row">';
  for (var i = 0; i < 7; i++) {
    html += '<div class="stats-cal-dow">' + dows[i] + '</div>';
  }
  html += '</div>';

  html += '<div class="stats-cal-grid">';

  for (var i = 0; i < firstDayMon; i++) {
    html += '<div class="stats-cal-cell empty"></div>';
  }

  for (var d = 1; d <= daysInMonth; d++) {
    var dateStr = _statsYM + '-' + String(d).padStart(2, '0');
    var isToday = dateStr === todayStr;
    var isSelected = dateStr === _statsSelectedDate;
    var isFuture = dateStr > todayStr;
    var vol = dayVolumes[dateStr] || 0;
    var hasPR = prDates[dateStr] || false;

    var cellClass = 'stats-cal-cell';
    if (isToday) cellClass += ' today';
    if (isSelected && !isFuture) cellClass += ' selected';
    if (isFuture) cellClass += ' future';

    var volClass = 'stats-cal-vol';
    if (vol === 0) volClass += ' empty';
    else if (hasPR) volClass += ' has-pr';

    var volText = vol > 0 ? formatNum(vol) : '';

    var onclick = isFuture ? '' : ' onclick="selectStatsDate(\'' + dateStr + '\')"';

    html +=
      '<div class="' + cellClass + '" data-date="' + dateStr + '"' + onclick + '>' +
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

// ══ 부위별 볼륨 랭킹 (히어로 카드) ══
function renderStatsHeroRanking() {
  var rankings = getMonthExerciseVolumes(_statsYM);
  var parts = _statsYM.split('-');
  var m = parseInt(parts[1]);

  if (rankings.length === 0) {
    return '';
  }

  var html = '<div class="stats-hero">';

  // 요약문
  var topEx = rankings[0];
  html +=
    '<div class="stats-hero-summary">' +
      m + '월에는 <strong>' + topEx.name + '</strong>을 가장 많이 했어요' +
    '</div>';

  // 1위 카드 — 아이콘이 있으면 이미지, 없으면 넘버링
  var firstIcon = getExerciseIcon(topEx.exerciseId);
  var firstBadgeHtml;
  if (firstIcon) {
    firstBadgeHtml = '<img src="' + firstIcon + '" class="stats-hero-first-icon" alt="" onerror="this.outerHTML=\'<div class=\\\'stats-hero-first-badge\\\'>1</div>\'">';
  } else {
    firstBadgeHtml = '<div class="stats-hero-first-badge">1</div>';
  }

  html +=
    '<div class="stats-hero-first">' +
      '<div class="stats-hero-first-left">' +
        firstBadgeHtml +
        '<div class="stats-hero-first-info">' +
          '<div class="stats-hero-first-name">' + topEx.name + '</div>' +
          '<div class="stats-hero-first-meta">' + topEx.percentage + '%</div>' +
        '</div>' +
      '</div>' +
      '<div class="stats-hero-first-vol">' + formatNum(topEx.volume) + '<small>kg</small></div>' +
    '</div>';

  // 2~7위 (2열)
  if (rankings.length > 1) {
    html += '<div class="stats-hero-grid">';
    for (var i = 1; i < rankings.length && i < 7; i++) {
      var r = rankings[i];
      var icon = getExerciseIcon(r.exerciseId);
      var rankBadgeHtml;
      if (icon) {
        rankBadgeHtml = '<img src="' + icon + '" class="stats-hero-card-icon" alt="" onerror="this.outerHTML=\'<div class=\\\'stats-hero-card-rank\\\'>' + (i + 1) + '</div>\'">';
      } else {
        rankBadgeHtml = '<div class="stats-hero-card-rank">' + (i + 1) + '</div>';
      }
      html +=
        '<div class="stats-hero-card">' +
          rankBadgeHtml +
          '<div class="stats-hero-card-info">' +
            '<div class="stats-hero-card-name">' + r.name + '</div>' +
            '<div class="stats-hero-card-vol">' + formatNum(r.volume) + '<small>kg</small></div>' +
          '</div>' +
        '</div>';
    }
    html += '</div>';
  }

  html += '</div>';
  return html;
}

// ══ 월별 볼륨 바 차트 ══
function renderStatsMonthlyChart() {
  var data = getRecentMonthlyVolumes(6, _statsYM);

  // 모든 월의 볼륨이 0이면 표시하지 않음
  var hasData = false;
  for (var i = 0; i < data.length; i++) {
    if (data[i].volume > 0) { hasData = true; break; }
  }
  if (!hasData) return '';

  // 최대값 구하기 (바 높이 비율 계산용)
  var maxVol = 0;
  for (var i = 0; i < data.length; i++) {
    if (data[i].volume > maxVol) maxVol = data[i].volume;
  }

  var html =
    '<div class="stats-monthly">' +
      '<div class="stats-monthly-title">월별 볼륨</div>' +
      '<div class="stats-monthly-chart">';

  for (var i = 0; i < data.length; i++) {
    var d = data[i];
    var heightPct = maxVol > 0 ? Math.max((d.volume / maxVol) * 100, d.volume > 0 ? 4 : 0) : 0;
    var barClass = 'stats-monthly-bar' + (d.isCurrent ? ' current' : '');
    var volLabel = d.volume > 0 ? formatNum(d.volume) : '';

    html +=
      '<div class="stats-monthly-col">' +
        '<div class="stats-monthly-val">' + volLabel + '</div>' +
        '<div class="stats-monthly-bar-wrap">' +
          '<div class="' + barClass + '" style="height:' + heightPct + '%"></div>' +
        '</div>' +
        '<div class="stats-monthly-label">' + d.month + '월</div>' +
      '</div>';
  }

  html +=
      '</div>' +
    '</div>';

  return html;
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

    // 해당 종목이 포함된 세션 ID 찾기
    var chipSessionId = '';
    for (var si2 = 0; si2 < sessions.length; si2++) {
      for (var ei2 = 0; ei2 < sessions[si2].exercises.length; ei2++) {
        if (sessions[si2].exercises[ei2].exerciseId === exId) {
          chipSessionId = sessions[si2].id;
          break;
        }
      }
      if (chipSessionId) break;
    }

    exChipsHtml +=
      '<div class="lw-ex-chip" data-session-id="' + chipSessionId + '" data-exercise-id="' + exId + '">' +
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

  // ── 종목 칩 롱프레스 바인딩 ──
  var chips = el.querySelectorAll('.lw-ex-chip');
  for (var ci = 0; ci < chips.length; ci++) {
    (function(chip) {
      var sessionId = chip.getAttribute('data-session-id');
      var exerciseId = chip.getAttribute('data-exercise-id');
      if (!sessionId || !exerciseId) return;

      var exInfo = getExercise(exerciseId);
      var exName = exInfo ? exInfo.name : exerciseId;

      bindLongPress(chip, function() {
        showActionSheet(exName, [
          {
            text: '기록 수정',
            onClick: function() {
              enterEditMode(sessionId, exerciseId);
            }
          },
          {
            text: '이 종목 삭제',
            cls: 'destructive',
            onClick: function() {
              showConfirm(exName + ' 기록을 삭제하시겠습니까?\n삭제된 기록은 복구할 수 없습니다.', function(confirmed) {
                if (confirmed) {
                  deleteExerciseFromSession(sessionId, exerciseId);
                  if (typeof syncToServer === 'function') syncToServer();
                  renderStatsWorkoutCard();
                  renderStatsScreen();
                }
              });
            }
          }
        ]);
      }, 600);
    })(chips[ci]);
  }
}
