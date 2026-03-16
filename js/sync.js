/* ═══ sync.js — GAS 서버 동기화 ═══ */

var GAS_URL = 'https://script.google.com/macros/s/AKfycby9cBU92KAnTveGQWtALcbTmpExMKvSbtkvyC6vdWZttt8kEIEmxaTuTHan474rbzA3/exec';
var GAS_TOKEN = 'gorilla2026';
var _syncInProgress = false;

// ══ 서버에 데이터 저장 ══
// silent: true이면 성공 시 토스트 미표시 (자동 동기화용)
function syncToServer(callback, silent) {
  if (_syncInProgress) {
    if (callback) callback(false);
    return;
  }

  // 오프라인이면 시도하지 않음
  if (!navigator.onLine) {
    if (!silent) showSyncToast('offline');
    if (callback) callback(false);
    return;
  }

  _syncInProgress = true;
  if (!silent) showSyncToast('saving');

  var payload = {
    sessions: L(K.sessions) || [],
    prs: L(K.prs) || {},
    inbody: L(K.inbody) || [],
    customExercises: L(K.customExercises) || [],
    hiddenExercises: L(K.hiddenExercises) || [],
    exerciseIcons: L(K.exerciseIcons) || {},
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
      if (!silent) showSyncToast('saved');
      if (callback) callback(true);
    } else {
      console.error('Sync save error:', result.message);
      if (!silent) showSyncToast('error');
      if (callback) callback(false);
    }
  })
  .catch(function(err) {
    _syncInProgress = false;
    console.error('Sync save failed:', err);
    if (!silent) showSyncToast('error');
    if (callback) callback(false);
  });
}

// ══ 서버에서 데이터 불러오기 ══
function syncFromServer(callback, silent) {
  if (_syncInProgress) {
    if (callback) callback(false);
    return;
  }

  // 오프라인이면 시도하지 않음
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

      // 서버 데이터가 비어있으면 (첫 사용) 로컬 → 서버로 업로드
      var serverSessions = p.sessions || [];
      var localSessions = L(K.sessions) || [];

      if (serverSessions.length === 0 && localSessions.length > 0) {
        saveLastSyncTime();
        if (!silent) showSyncToast('saved');
        syncToServer(callback, silent);
        return;
      }

      // 서버 데이터를 로컬에 덮어쓰기
      if (p.sessions) S(K.sessions, p.sessions);
      if (p.prs) S(K.prs, p.prs);
      if (p.inbody) S(K.inbody, p.inbody);
      if (p.customExercises) S(K.customExercises, p.customExercises);
      if (p.hiddenExercises) S(K.hiddenExercises, p.hiddenExercises);
      if (p.exerciseIcons) S(K.exerciseIcons, p.exerciseIcons);
      if (p.settings) S(K.settings, p.settings);

      saveLastSyncTime();
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
    // 자동 동기화 실패 시 홈에 인라인 배너 표시
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
