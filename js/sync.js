// ═══ PROJECT: gym ═══

/* ═══ sync.js — GAS 서버 동기화 ═══ */

var GAS_URL = 'https://script.google.com/macros/s/AKfycby9cBU92KAnTveGQWtALcbTmpExMKvSbtkvyC6vdWZttt8kEIEmxaTuTHan474rbzA3/exec';
var GAS_TOKEN = 'gym2026';
var _syncInProgress = false;
var _syncRetryCount = 0;
var _syncRetryTimer = null;

// ══ 서버에 데이터 저장 ══
function syncToServer(callback, silent) {
  if (_syncInProgress) {
    if (callback) callback(false);
    return;
  }

  // 빈 LS 보호: 서버 복원 전 업로드 차단
  if (window._blockSyncToServer) {
    console.log('syncToServer: 빈 LS 보호 — 서버 복원 전 업로드 차단');
    if (callback) callback(false);
    return;
  }

  if (!navigator.onLine) {
    if (!silent) showSyncToast('offline');
    if (callback) callback(false);
    return;
  }

  _syncInProgress = true;
  // 새 저장 요청이 오면 기존 재시도 취소
  clearTimeout(_syncRetryTimer);
  _syncRetryCount = 0;

  if (!silent) showSyncToast('saving');

  var payload = {
    sessions: L(K.sessions) || [],
    prs: L(K.prs) || {},
    inbody: L(K.inbody) || [],
    customExercises: L(K.customExercises) || [],
    hiddenExercises: L(K.hiddenExercises) || [],
    exerciseIcons: L(K.exerciseIcons) || {},
    exerciseOrder: L('wk_exercise_order') || {},
    partOverrides: L(K.partOverrides) || {},
    settings: L(K.settings) || {},
    lastSync: new Date().toISOString()
  };

  var body = JSON.stringify({
    token: GAS_TOKEN,
    action: 'save',
    payload: payload
  });

  fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: body
  })
  .then(function(res) { return res.json(); })
  .then(function(result) {
    _syncInProgress = false;
    if (result.status === 'ok') {
      saveLastSyncTime();
      _syncRetryCount = 0;
      if (!silent) showSyncToast('saved');
      if (callback) callback(true);
    } else {
      console.error('Sync save error:', result.message);
      if (!silent) showSyncToast('error');
      _scheduleSyncRetry(silent);
      if (callback) callback(false);
    }
  })
  .catch(function(err) {
    _syncInProgress = false;
    console.error('Sync save failed:', err);
    if (!silent) showSyncToast('error');
    _scheduleSyncRetry(silent);
    if (callback) callback(false);
  });
}

function _scheduleSyncRetry(silent) {
  var delays = [5000, 15000, 45000];
  if (_syncRetryCount >= delays.length) {
    console.warn('syncToServer 재시도 한도 초과 (' + delays.length + '회)');
    return;
  }
  var delay = delays[_syncRetryCount];
  _syncRetryCount++;
  console.log('syncToServer 재시도 ' + _syncRetryCount + '/' + delays.length + ' (' + (delay / 1000) + '초 후)');
  _syncRetryTimer = setTimeout(function() {
    syncToServer(null, silent);
  }, delay);
}

// ══ 서버에서 데이터 불러오기 (ID 기반 병합) ══
function syncFromServer(callback, silent) {
  if (_syncInProgress) {
    if (callback) callback(false);
    return;
  }

  if (!navigator.onLine) {
    if (!silent) showSyncToast('offline');
    if (callback) callback(false);
    return;
  }

  _syncInProgress = true;
  if (!silent) showSyncToast('loading');

  var body = JSON.stringify({
    token: GAS_TOKEN,
    action: 'load'
  });

  fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: body
  })
  .then(function(res) { return res.json(); })
  .then(function(result) {
    _syncInProgress = false;
    if (result.status === 'ok' && result.payload) {
      var p = result.payload;

      var serverSessions = p.sessions || [];
      var localSessions = L(K.sessions) || [];

      // 서버 비어있고 로컬에 데이터 있으면 → 로컬을 서버에 업로드
      if (serverSessions.length === 0 && localSessions.length > 0) {
        saveLastSyncTime();
        if (!silent) showSyncToast('saved');
        syncToServer(callback, silent);
        return;
      }

      // ── 세션 ID 기반 병합 ──
      var localMap = {};
      for (var i = 0; i < localSessions.length; i++) {
        localMap[localSessions[i].id] = localSessions[i];
      }

      var merged = [];
      var usedIds = {};

      // 1) 서버 세션 순회: 로컬에도 있으면 endTime 비교, 없으면 추가
      for (var j = 0; j < serverSessions.length; j++) {
        var ss = serverSessions[j];
        if (!ss.id) continue;
        var ls = localMap[ss.id];
        if (ls) {
          // 양쪽에 존재 → endTime이 큰 쪽 채택
          var sEnd = ss.endTime || 0;
          var lEnd = ls.endTime || 0;
          merged.push(sEnd > lEnd ? ss : ls);
        } else {
          // 서버에만 존재 → 빈 세션 필터링 후 추가
          if (ss.totalVolume > 0 || ss.durationMin > 0 || ss.totalCalories > 5) {
            merged.push(ss);
          }
        }
        usedIds[ss.id] = true;
      }

      // 2) 로컬에만 있는 세션 유지
      for (var k = 0; k < localSessions.length; k++) {
        if (!usedIds[localSessions[k].id]) {
          merged.push(localSessions[k]);
        }
      }

      // 정렬: 날짜 내림차순, 같은 날짜면 startTime 내림차순
      merged.sort(function(a, b) {
        var dc = (b.date || '').localeCompare(a.date || '');
        if (dc !== 0) return dc;
        return (b.startTime || 0) - (a.startTime || 0);
      });

      S(K.sessions, merged);

      // ── 진행 중 세션 무효화: 서버에 완료 기록이 있으면 로컬 current_session 삭제 ──
      var currentSession = L('wk_current_session');
      if (currentSession && currentSession.id) {
        for (var ci = 0; ci < merged.length; ci++) {
          if (merged[ci].id === currentSession.id && merged[ci].endTime) {
            localStorage.removeItem('wk_current_session');
            if (typeof _currentSession !== 'undefined') {
              _currentSession = null;
            }
            break;
          }
        }
      }

      // ── PR: 서버와 로컬 병합 (exerciseId별, 더 높은 기록 유지) ──
      if (p.prs) {
        var localPrs = L(K.prs) || {};
        var serverPrs = p.prs;
        var mergedPrs = {};
        // 로컬 PR 복사
        var prKeys = Object.keys(localPrs);
        for (var pi = 0; pi < prKeys.length; pi++) {
          mergedPrs[prKeys[pi]] = localPrs[prKeys[pi]];
        }
        // 서버 PR 병합
        var sPrKeys = Object.keys(serverPrs);
        for (var si = 0; si < sPrKeys.length; si++) {
          var exId = sPrKeys[si];
          if (!mergedPrs[exId]) {
            mergedPrs[exId] = serverPrs[exId];
          } else {
            // 양쪽에 있으면 서버 항목 중 로컬에 없는 것만 추가
            var localArr = mergedPrs[exId];
            var serverArr = serverPrs[exId];
            if (Array.isArray(serverArr) && Array.isArray(localArr)) {
              var localSessIds = {};
              for (var li = 0; li < localArr.length; li++) {
                localSessIds[localArr[li].sessionId || ''] = true;
              }
              for (var sj = 0; sj < serverArr.length; sj++) {
                if (!localSessIds[serverArr[sj].sessionId || '']) {
                  localArr.push(serverArr[sj]);
                }
              }
              mergedPrs[exId] = localArr;
            }
          }
        }
        S(K.prs, mergedPrs);
      }

      // ── 기타 데이터: 서버가 있으면 적용 ──
      if (p.inbody) S(K.inbody, p.inbody);
      if (p.customExercises) S(K.customExercises, p.customExercises);
      if (p.hiddenExercises !== undefined) S(K.hiddenExercises, p.hiddenExercises);
      if (p.exerciseOrder) S('wk_exercise_order', p.exerciseOrder);
      if (p.partOverrides !== undefined) S(K.partOverrides, p.partOverrides);
      if (p.settings) S(K.settings, p.settings);

      // exerciseIcons: 서버와 로컬 병합 (로컬 우선)
      var serverIcons = p.exerciseIcons || {};
      var localIcons = L(K.exerciseIcons) || {};
      var mergedIcons = {};
      var iconKeys = Object.keys(serverIcons);
      for (var ik = 0; ik < iconKeys.length; ik++) {
        mergedIcons[iconKeys[ik]] = serverIcons[iconKeys[ik]];
      }
      var localIconKeys = Object.keys(localIcons);
      for (var ik2 = 0; ik2 < localIconKeys.length; ik2++) {
        if (localIcons[localIconKeys[ik2]]) {
          mergedIcons[localIconKeys[ik2]] = localIcons[localIconKeys[ik2]];
        }
      }
      S(K.exerciseIcons, mergedIcons);

      saveLastSyncTime();

      // 병합 후 로컬에만 있던 세션이 있으면 서버에도 반영
      if (merged.length > serverSessions.length) {
        syncToServer(null, true);
      }

      if (!silent) showSyncToast('loaded');
      if (callback) callback(true);
    } else {
      console.error('Sync load error:', result.message);
      if (!silent) showSyncToast('error');
      if (callback) callback(false);
    }
  })
  .catch(function(err) {
    _syncInProgress = false;
    console.error('Sync load failed:', err);
    if (silent) showSyncFailBanner();
    else showSyncToast('error');
    if (callback) callback(false);
  });
}

// ══ 마지막 동기화 시각 저장/조회 ══
function saveLastSyncTime() {
  S('wk_last_sync', new Date().toISOString());
}

function getLastSyncTime() {
  return L('wk_last_sync') || null;
}

function formatSyncTime(isoStr) {
  if (!isoStr) return '없음';
  var d = new Date(isoStr);
  var m = d.getMonth() + 1;
  var day = d.getDate();
  var h = String(d.getHours()).padStart(2, '0');
  var min = String(d.getMinutes()).padStart(2, '0');
  return m + '월 ' + day + '일 ' + h + ':' + min;
}

// ══ 동기화 토스트 (수동 동기화용 — 하단 토스트) ══
var _syncToastTimer = null;

function showSyncToast(status) {
  var el = document.getElementById('syncStatus');
  if (!el) return;

  // 기존 타이머 클리어
  if (_syncToastTimer) {
    clearTimeout(_syncToastTimer);
    _syncToastTimer = null;
  }

  var text = '';
  var icon = '';
  var className = 'sync-toast';

  switch (status) {
    case 'saving':
      icon = '↑';
      text = '서버에 저장 중...';
      className += ' syncing';
      break;
    case 'saved':
      icon = '✓';
      text = '저장 완료';
      className += ' success';
      break;
    case 'loading':
      icon = '↓';
      text = '서버에서 불러오는 중...';
      className += ' syncing';
      break;
    case 'loaded':
      icon = '✓';
      text = '동기화 완료';
      className += ' success';
      break;
    case 'error':
      icon = '✕';
      text = '동기화 실패 · 네트워크를 확인하세요';
      className += ' error';
      break;
    case 'offline':
      icon = '⊘';
      text = '오프라인 상태입니다';
      className += ' error';
      break;
    default:
      el.style.display = 'none';
      el.className = 'sync-toast';
      return;
  }

  el.innerHTML = '<span class="sync-toast-icon">' + icon + '</span><span>' + text + '</span>';
  el.className = className;
  el.style.display = 'flex';

  // show 클래스 추가 (애니메이션용)
  requestAnimationFrame(function() {
    el.classList.add('show');
  });

  // 진행 중이 아닌 상태는 2.5초 후 자동 사라짐
  if (status !== 'saving' && status !== 'loading') {
    _syncToastTimer = setTimeout(function() {
      el.classList.remove('show');
      setTimeout(function() {
        el.style.display = 'none';
      }, 300);
    }, 2500);
  }
}

// ══ 자동 동기화 실패 시 홈 인라인 배너 ══
function showSyncFailBanner() {
  // 이미 배너가 있으면 중복 생성 방지
  if (document.getElementById('syncFailBanner')) return;

  var mainView = document.getElementById('main-view');
  if (!mainView) return;

  var banner = document.createElement('div');
  banner.id = 'syncFailBanner';
  banner.className = 'sync-fail-banner';
  banner.innerHTML =
    '<span class="sync-fail-text">동기화 실패</span>' +
    '<button class="sync-fail-retry" onclick="retrySyncFromBanner()">재시도</button>' +
    '<button class="sync-fail-close" onclick="closeSyncFailBanner()">✕</button>';

  mainView.insertBefore(banner, mainView.firstChild);
}

function closeSyncFailBanner() {
  var el = document.getElementById('syncFailBanner');
  if (el) el.remove();
}

function retrySyncFromBanner() {
  closeSyncFailBanner();
  syncFromServer(function(success) {
    if (success) {
      showScreen('home');
    }
  }, false); // 재시도는 수동이므로 silent=false
}

// ═══ 비상 플러시: 페이지 이탈 시 미동기화 데이터 서버 전송 ═══
function _flushBeforeUnload() {
  if (window._beaconFlushed) return;
  window._beaconFlushed = true;

  // 1. 진행 중인 세션을 LS에 즉시 저장
  try {
    if (typeof _currentSession !== 'undefined' && _currentSession && !_isFinishing) {
      autoSaveSession();
    }
  } catch (e) {}

  // 2. sendBeacon으로 서버 push 시도
  try {
    var sessions = L(K.sessions);
    if (!sessions || sessions.length === 0) return;
    var payload = JSON.stringify({
      action: 'save',
      token: GAS_TOKEN,
      payload: {
        sessions: sessions,
        prs: L(K.prs) || {},
        inbody: L(K.inbody) || [],
        customExercises: L(K.customExercises) || [],
        hiddenExercises: L(K.hiddenExercises) || [],
        exerciseIcons: L(K.exerciseIcons) || {},
        exerciseOrder: L('wk_exercise_order') || {},
        partOverrides: L(K.partOverrides) || {},
        settings: L(K.settings) || {}
      }
    });
    if (payload.length <= 65536) {
      navigator.sendBeacon(GAS_URL, payload);
    }
  } catch (e) {}
}
