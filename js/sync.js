/* ═══ sync.js — GAS 서버 동기화 ═══ */

var GAS_URL = 'https://script.google.com/macros/s/AKfycby9cBU92KAnTveGQWtALcbTmpExMKvSbtkvyC6vdWZttt8kEIEmxaTuTHan474rbzA3/exec';
var GAS_TOKEN = 'gorilla2026';
var _syncInProgress = false;

// ══ 서버에 데이터 저장 ══
function syncToServer(callback) {
  if (_syncInProgress) {
    if (callback) callback(false);
    return;
  }
  _syncInProgress = true;
  showSyncStatus('saving');

  var payload = {
    sessions: L(K.sessions) || [],
    prs: L(K.prs) || {},
    inbody: L(K.inbody) || [],
    customExercises: L(K.customExercises) || [],
    hiddenExercises: L(K.hiddenExercises) || [],
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
      showSyncStatus('saved');
      if (callback) callback(true);
    } else {
      console.error('Sync save error:', result.message);
      showSyncStatus('error');
      if (callback) callback(false);
    }
  })
  .catch(function(err) {
    _syncInProgress = false;
    console.error('Sync save failed:', err);
    showSyncStatus('error');
    if (callback) callback(false);
  });
}

// ══ 서버에서 데이터 불러오기 ══
function syncFromServer(callback) {
  if (_syncInProgress) {
    if (callback) callback(false);
    return;
  }
  _syncInProgress = true;
  showSyncStatus('loading');

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
        showSyncStatus('saved');
        syncToServer(callback);
        return;
      }

      // 서버 데이터를 로컬에 덮어쓰기
      if (p.sessions) S(K.sessions, p.sessions);
      if (p.prs) S(K.prs, p.prs);
      if (p.inbody) S(K.inbody, p.inbody);
      if (p.customExercises) S(K.customExercises, p.customExercises);
      if (p.hiddenExercises) S(K.hiddenExercises, p.hiddenExercises);
      if (p.settings) S(K.settings, p.settings);

      showSyncStatus('loaded');
      if (callback) callback(true);
    } else {
      console.error('Sync load error:', result.message);
      showSyncStatus('error');
      if (callback) callback(false);
    }
  })
  .catch(function(err) {
    _syncInProgress = false;
    console.error('Sync load failed:', err);
    showSyncStatus('error');
    if (callback) callback(false);
  });
}

// ══ 동기화 상태 표시 ══
function showSyncStatus(status) {
  var el = document.getElementById('syncStatus');
  if (!el) return;

  var text = '';
  var className = 'sync-status';

  switch (status) {
    case 'saving':
      text = '저장 중...';
      className += ' syncing';
      break;
    case 'saved':
      text = '저장 완료';
      className += ' success';
      break;
    case 'loading':
      text = '불러오는 중...';
      className += ' syncing';
      break;
    case 'loaded':
      text = '동기화 완료';
      className += ' success';
      break;
    case 'error':
      text = '동기화 실패';
      className += ' error';
      break;
    default:
      el.style.display = 'none';
      return;
  }

  el.textContent = text;
  el.className = className;
  el.style.display = 'block';

  if (status === 'saved' || status === 'loaded' || status === 'error') {
    setTimeout(function() {
      el.style.display = 'none';
    }, 2000);
  }
}
