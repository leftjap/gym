// ═══ PROJECT: gym ═══

/* ═══ app.js — 인증, 초기화, 진입점 ═══ */

var GOOGLE_CLIENT_ID = '910366325974-3ollm3pose37r1fvv8ngnd0v09f2p57l.apps.googleusercontent.com';

function handleCredentialResponse(response) {
  try {
    var jwt = response.credential;
    localStorage.setItem('wk_id_token', jwt);
    document.getElementById('lockScreen').style.display = 'none';
    startApp();
  } catch (e) {
    document.getElementById('lockErr').textContent = '로그인 처리 중 오류가 발생했습니다.';
  }
}

function hideLoadingScreen() {
  var loading = document.getElementById('loadingScreen');
  if (!loading) return;
  loading.classList.add('fade-out');
  setTimeout(function() {
    loading.style.display = 'none';
  }, 500);
}

function startApp() {
  // iOS Safari 저장공간 보호 요청
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(function() {});
  }
  // 빈 LS 보호: 세션 데이터 없으면 서버 복원 완료까지 save 차단
  var _lsEmpty = !(L(K.sessions) && (L(K.sessions)).length > 0);
  if (_lsEmpty) {
    window._blockSyncToServer = true;
  }
  // 데이터 마이그레이션 (부위/종목 ID 변환, 1회만 실행)
  migrateData();

  // 인바디 초기 데이터 (기록이 없으면 1건 추가)
  var inbodyArr = L(K.inbody) || [];
  if (inbodyArr.length === 0) {
    addInbodyRecord({ date: '2026-03-27', weight: 73, height: 173 });
  }

  // 진행 중인 세션 복원 (있으면 메모리에 올림)
  restoreSession();

  // 초기 월 설정
  _currentYM = getYM();
  updateMonthTitle();

  // 항상 홈 화면 표시 (진행 중 세션이 있으면 CONTINUE 버튼 자동 표시)
  showScreen('home', 'replace');

  // 서버 동기화 — silent 모드
  syncFromServer(function(success) {
    // 빈 LS 보호 해제: 서버 데이터 수신 완료
    window._blockSyncToServer = false;
    if (success) {
      renderHome();
    } else if (success === false) {
      // Unauthorized 체크: sync에서 설정한 플래그 확인
      if (window._syncUnauthorized) {
        window._syncUnauthorized = false;
        localStorage.removeItem('wk_id_token');
        document.getElementById('lockScreen').style.display = '';
        document.getElementById('lockErr').textContent = '접근 권한이 없는 계정입니다.';
        return;
      }
    }
    hideLoadingScreen();
  }, true);
}

window.onload = function() {
  var isLocal = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
  if (isLocal || localStorage.getItem('wk_id_token')) {
    document.getElementById('lockScreen').style.display = 'none';
    startApp();
  } else {
    document.getElementById('lockScreen').style.display = '';
    document.getElementById('loadingScreen').style.display = 'none';
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse
    });
    google.accounts.id.renderButton(
      document.getElementById('googleSignInBtn'),
      { theme: 'outline', size: 'large', width: 280 }
    );
  }
};

// ══ 탭 비활성화/종료 시 세션 즉시 저장 ══
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'hidden') {
    if (typeof _currentSession !== 'undefined' && _currentSession && !_isFinishing) {
      autoSaveSession();
    }
  }
});

window.addEventListener('beforeunload', function() {
  _flushBeforeUnload();
});

// iOS PWA: pagehide가 beforeunload보다 신뢰도 높음
window.addEventListener('pagehide', function() {
  _flushBeforeUnload();
});
