/* ═══ app.js — 초기화, 진입점 ═══ */

function init() {
  // 데이터 마이그레이션 (부위/종목 ID 변환, 1회만 실행)
  migrateData();

  // 진행 중인 세션 복원 (있으면)
  restoreSession();

  // 초기 월 설정
  _currentYM = getYM();
  updateMonthTitle();

  // 메인 화면 표시 (로컬 데이터로 즉시)
  showScreen('home');

  // 서버 더미 데이터 정리 (1회만 실행)
  // 서버에 남아있는 옛 더미 데이터를 로컬(현재 상태)로 덮어씀
  var serverCleaned = L('wk_server_cleaned_v1');
  if (!serverCleaned) {
    syncToServer(function(success) {
      if (success) {
        S('wk_server_cleaned_v1', true);
      }
    }, true);
    return; // 첫 실행 시 서버 정리만 하고 syncFromServer는 건너뜀
  }

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
