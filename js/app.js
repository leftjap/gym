/* ═══ app.js — 초기화, 진입점 ═══ */

function hideLoadingScreen() {
  var loading = document.getElementById('loadingScreen');
  if (!loading) return;
  loading.classList.add('fade-out');
  setTimeout(function() {
    loading.style.display = 'none';
  }, 500);
}

function init() {
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
    if (success) {
      renderHome();
    }
    hideLoadingScreen();
  }, true);
}

// ══ 탭 비활성화/종료 시 세션 즉시 저장 ══
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'hidden') {
    if (typeof _currentSession !== 'undefined' && _currentSession && !_isFinishing) {
      autoSaveSession();
    }
  }
});

window.addEventListener('beforeunload', function() {
  if (typeof _currentSession !== 'undefined' && _currentSession && !_isFinishing) {
    autoSaveSession();
  }
});

window.onload = function() {
  init();
};
