/* ═══ ui.js — 메인 화면, 캘린더, 화면 전환 ═══ */

var _currentYM = getYM(); // 현재 선택된 월
var _bottomSheetOpen = false;

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
  renderHeroCard();
  renderWeekCal();
  renderMonthCal();
}

// ══ 요약 메시지 ══
function renderSummaryMsg() {
  var el = document.getElementById('summaryMsg');
  if (!el) return;

  var summary = getMonthSummary(_currentYM);
  var vol = summary.volume;
  var [y, m] = _currentYM.split('-').map(Number);

  var volumeText = vol > 0 ? '<strong>' + formatNum(vol) + 'kg</strong>' : '0kg';
  var subText = vol === 0
    ? '아직 운동 기록이 없습니다'
    : '계속해서 운동해보세요!';

  el.innerHTML =
    '<div class="summary-msg-main">' + m + '월에는 ' + volumeText + ' 들었어요</div>' +
    '<div class="summary-msg-sub">' + subText + '</div>';
}

// ══ 히어로 카드 ══
function renderHeroCard() {
  var el = document.getElementById('heroCard');
  if (!el) return;

  var sessions = getSessionsByMonth(_currentYM);
  if (sessions.length === 0) {
    el.innerHTML =
      '<div class="hero-empty">' +
        '<div class="hero-empty-icon">💪</div>' +
        '<div class="hero-empty-text">첫 운동을 시작해보세요!</div>' +
      '</div>';
    return;
  }

  // 부위별 볼륨 집계
  var partVolumes = {};
  for (var i = 0; i < sessions.length; i++) {
    var tags = sessions[i].tags || [];
    for (var j = 0; j < tags.length; j++) {
      var partId = tags[j];
      partVolumes[partId] = (partVolumes[partId] || 0) + (sessions[i].totalVolumeExWarmup || 0);
    }
  }

  // 최다 부위 찾기
  var maxPart = null, maxVolume = 0;
  var parts = Object.keys(partVolumes);
  for (var i = 0; i < parts.length; i++) {
    if (partVolumes[parts[i]] > maxVolume) {
      maxVolume = partVolumes[parts[i]];
      maxPart = parts[i];
    }
  }

  var partInfo = getBodyPart(maxPart);
  var partName = partInfo ? partInfo.name : maxPart;

  // 해당 부위의 상위 종목 2개
  var topExercises = [];
  var exVolumes = {};
  for (var i = 0; i < sessions.length; i++) {
    for (var j = 0; j < sessions[i].exercises.length; j++) {
      var ex = sessions[i].exercises[j];
      var exInfo = getExercise(ex.exerciseId);
      if (exInfo && sessions[i].tags.indexOf(maxPart) >= 0) {
        var exVol = 0;
        for (var k = 0; k < ex.sets.length; k++) {
          if (ex.sets[k].done) {
            exVol += (ex.sets[k].weight || 0) * (ex.sets[k].reps || 0);
          }
        }
        exVolumes[ex.exerciseId] = (exVolumes[ex.exerciseId] || 0) + exVol;
      }
    }
  }

  var exIds = Object.keys(exVolumes).sort(function(a, b) {
    return exVolumes[b] - exVolumes[a];
  });
  for (var i = 0; i < Math.min(2, exIds.length); i++) {
    var ex = getExercise(exIds[i]);
    if (ex) {
      topExercises.push({
        name: ex.name,
        volume: exVolumes[exIds[i]]
      });
    }
  }

  var exHtml = '';
  for (var i = 0; i < topExercises.length; i++) {
    exHtml +=
      '<div class="hero-exercise">' +
        '<div class="hero-ex-name">' + topExercises[i].name + '</div>' +
        '<div class="hero-ex-vol">' + formatNum(topExercises[i].volume) + 'kg</div>' +
      '</div>';
  }

  el.innerHTML =
    '<div class="hero-card-inner">' +
      '<div class="hero-part-name">가장 많이 한 부위</div>' +
      '<div class="hero-part-title">' + partName + '</div>' +
      '<div class="hero-part-vol">' + formatNum(maxVolume) + 'kg</div>' +
      '<div class="hero-exercises">' + exHtml + '</div>' +
    '</div>';
}

// ══ 주간 캘린더 ══
function renderWeekCal() {
  var el = document.getElementById('weekCal');
  if (!el) return;

  var weekStart = getWeekStartDate();
  var today_ = today();
  var dows = ['일', '월', '화', '수', '목', '금', '토'];

  var html = '<div class="week-cal">';
  for (var i = 0; i < 7; i++) {
    var d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    var dateStr = getLocalYMD(d);
    var dayNum = d.getDate();
    var dowIdx = d.getDay();
    var dow = dows[dowIdx];

    var isToday = dateStr === today_;
    var sessions = getSessionsByDate(dateStr);
    var hasWorkout = sessions.length > 0;

    var dayClass = 'week-day';
    if (isToday) dayClass += ' today';

    var dot = '';
    if (hasWorkout) {
      dot = '<div class="week-day-dot"></div>';
    }

    html +=
      '<div class="' + dayClass + '">' +
        '<div class="week-day-num">' + dayNum + '</div>' +
        '<div class="week-day-dow">' + dow + '</div>' +
        dot +
      '</div>';
  }
  html += '</div>';

  el.innerHTML = html;
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
