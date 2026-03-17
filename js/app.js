/* ═══ app.js — 초기화, 진입점 ═══ */

function init() {
  // 진행 중인 세션 복원 (있으면)
  restoreSession();

  // 초기 월 설정
  _currentYM = getYM();
  updateMonthTitle();

  // 메인 화면 표시 (로컬 데이터로 즉시)
  showScreen('home');

  // 서버 동기화 — silent 모드 (성공 시 토스트 없음, 실패 시 인라인 배너)
  syncFromServer(function(success) {
    if (success) {
      // 서버 데이터 반영 후 홈 화면만 갱신 (화면 전환 없이)
      renderHome();
    }
  }, true);
}

window.onload = function() {
  init();
};
