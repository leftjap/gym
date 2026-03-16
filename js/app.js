/* ═══ app.js — 초기화, 진입점 ═══ */

function init() {
  // 더미 데이터 초기화 (없으면)
  initDummyData();

  // 진행 중인 세션 복원 (있으면)
  restoreSession();

  // 초기 월 설정
  _currentYM = getYM();
  updateMonthTitle();

  // 메인 화면 표시 (동기화 전 일단 로컬 데이터로)
  showScreen('home');

  // 서버에서 데이터 동기화 → 완료 후 화면 갱신
  syncFromServer(function(success) {
    if (success) {
      showScreen('home');
    }
  });
}

window.onload = function() {
  init();
};
