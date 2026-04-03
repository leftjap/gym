// ═══ PROJECT: gym ═══

/* ═══ sync.js — GAS 서버 동기화 ═══ */

var GAS_URL = 'https://script.google.com/macros/s/AKfycby9cBU92KAnTveGQWtALcbTmpExMKvSbtkvyC6vdWZttt8kEIEmxaTuTHan474rbzA3/exec';
var _syncInProgress = false;
var _syncRetryCount = 0;
var _syncRetryTimer = null;

function _getIdToken() {
  return localStorage.getItem('wk_id_token') || '';
}

// ══ 서버에 데이터 저장 ══
function syncToServer(callback, silent) {
  if (_syncInProgress) {
    if (callback) callback(false);
    return;
  }

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

  var idToken = _getIdToken();
  if (!idToken) {
    if (callback) callback(false);
    return;
  }

  _syncInProgress = true;
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
    idToken: idToken,
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
      if (result.message === 'Unauthorized') {
        window._syncUnauthorized = true;
        if (callback) callback(false);
        return;
      }
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
    console.warn('syncToServer 재시도 한도 초과 (' + delays.length + '회) — _blockSyncToServer 미해제 유지');
    window._syncRetryExhausted = true;
    return;
  }
  var delay = delays[_syncRetryCount];
  _syncRetryCount++;
  console.log('syncToServer 재시도 ' + _syncRetryCount + '/' + delays.length + ' (' + (delay / 1000) + '초 후)');
  _syncRetryTimer = setTimeout(function() {
    syncToServer(null, silent);
  }, delay);
}

// ══ 서버에서 데이터 불러오기 (server‑wins) ══
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

  var idToken = _getIdToken();
  if (!idToken) {
    if (callback) callback(false);
    return;
  }

  _syncInProgress = true;
  if (!silent) showSyncToast('loading');

  var body = JSON.stringify({
    idToken: idToken,
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

      // 🛡️ server‑wins 불변 조건
      // - 서버가 유일한 진실. 로컬을 서버 데이터로 교체 (병합 없음)
      // - 급감 가드: 로컬 >0 && 서버 =0 → 교체 차단 + syncToServer
      // - 세션 가드: 운동 진행 중(_currentSession) → sessions 교체 건너뜀

      var serverSessions = p.sessions || [];
      var localSessions = L(K.sessions) || [];

      // ── 급감 가드 ──
      if (localSessions.length > 0 && serverSessions.length === 0) {
        console.warn('syncFromServer 급감 가드: sessions 로컬 ' + localSessions.length + '건 → 서버 0건. 교체 차단 → syncToServer');
        saveLastSyncTime();
        if (!silent) showSyncToast('saved');
        syncToServer(callback, silent);
        return;
      }

      // ── 세션 가드: 운동 진행 중이면 sessions만 건너뜀 ──
      if (typeof _currentSession !== 'undefined' && _currentSession && !_currentSession.endTime) {
        console.log('syncFromServer: 운동 진행 중 — sessions 교체 건너뜀');
      } else {
        S(K.sessions, serverSessions);
      }

      // ── 나머지 키: 서버 데이터로 단순 교체 ──
      if (p.prs) S(K.prs, p.prs);
      if (p.inbody) S(K.inbody, p.inbody);
      if (p.customExercises) S(K.customExercises, p.customExercises);
      if (p.hiddenExercises !== undefined) S(K.hiddenExercises, p.hiddenExercises);
      if (p.exerciseOrder) S('wk_exercise_order', p.exerciseOrder);
      if (p.partOverrides !== undefined) S(K.partOverrides, p.partOverrides);
      if (p.settings) S(K.settings, p.settings);
      if (p.exerciseIcons) S(K.exerciseIcons, p.exerciseIcons);

      // ── 진행 중 세션 정합성 확인 ──
      var currentSession = L('wk_current_session');
      if (currentSession && currentSession.id) {
        var loadedSessions = L(K.sessions) || [];
        for (var ci = 0; ci < loadedSessions.length; ci++) {
          if (loadedSessions[ci].id === currentSession.id && loadedSessions[ci].endTime) {
            localStorage.removeItem('wk_current_session');
            if (typeof _currentSession !== 'undefined') {
              _currentSession = null;
            }
            break;
          }
        }
      }

      saveLastSyncTime();
      if (!silent) showSyncToast('loaded');
      if (callback) callback(true);
    } else {
      console.error('Sync load error:', result.message);
      if (result.message === 'Unauthorized') {
        window._syncUnauthorized = true;
        if (callback) callback(false);
        return;
      }
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

var _syncToastTimer = null;

function showSyncToast(status) {
  var el = document.getElementById('syncStatus');
  if (!el) return;

  if (_syncToastTimer) {
    clearTimeout(_syncToastTimer);
    _syncToastTimer = null;
  }

  var text = '';
  var icon = '';
  var className = 'sync-toast';

  switch (status) {
    case 'saving':
      icon = '↑'; text = '서버에 저장 중...'; className += ' syncing'; break;
    case 'saved':
      icon = '✓'; text = '저장 완료'; className += ' success'; break;
    case 'loading':
      icon = '↓'; text = '서버에서 불러오는 중...'; className += ' syncing'; break;
    case 'loaded':
      icon = '✓'; text = '동기화 완료'; className += ' success'; break;
    case 'error':
      icon = '✕'; text = '동기화 실패 · 네트워크를 확인하세요'; className += ' error'; break;
    case 'offline':
      icon = '⊘'; text = '오프라인 상태입니다'; className += ' error'; break;
    default:
      el.style.display = 'none'; el.className = 'sync-toast'; return;
  }

  el.innerHTML = '<span class="sync-toast-icon">' + icon + '</span><span>' + text + '</span>';
  el.className = className;
  el.style.display = 'flex';

  requestAnimationFrame(function() { el.classList.add('show'); });

  if (status !== 'saving' && status !== 'loading') {
    _syncToastTimer = setTimeout(function() {
      el.classList.remove('show');
      setTimeout(function() { el.style.display = 'none'; }, 300);
    }, 2500);
  }
}

function showSyncFailBanner() {
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
    if (success) { showScreen('home'); }
  }, false);
}

function _flushBeforeUnload() {
  if (window._beaconFlushed) return;
  window._beaconFlushed = true;

  try {
    if (typeof _currentSession !== 'undefined' && _currentSession && !_isFinishing) {
      autoSaveSession();
    }
  } catch (e) {}

  try {
    var sessions = L(K.sessions);
    if (!sessions || sessions.length === 0) return;
    var idToken = _getIdToken();
    if (!idToken) return;
    var payload = JSON.stringify({
      action: 'save',
      idToken: idToken,
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
