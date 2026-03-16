/* ═══ app.js — 초기화, 진입점 ═══ */

function init() {
  // 더미 데이터 초기화 (없으면)
  initDummyData();

  // 진행 중인 세션 복원 (있으면)
  restoreSession();

  // 서버에서 데이터 동기화
  syncFromServer();

  // 초기 월 설정
  _currentYM = getYM();
  updateMonthTitle();

  // 메인 화면 표시
  showScreen('home');
}

window.onload = function() {
  init();
};
