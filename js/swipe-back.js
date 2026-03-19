/* ═══ swipe-back.js — iOS 스타일 스와이프 뒤로가기 ═══ */

(function() {
  'use strict';

  // ── 설정 ──
  var EDGE_WIDTH    = 30;   // 왼쪽 가장자리 인식 영역 (px)
  var THRESHOLD     = 0.35; // 화면 너비의 35% 이상 밀면 확정
  var PEEK_OFFSET   = 80;   // 홈 화면 뒤에서 시작하는 오프셋 (px)

  // ── 상태 ──
  var _tracking     = false;
  var _startX       = 0;
  var _startY       = 0;
  var _currentX     = 0;
  var _decided      = false; // 수평/수직 방향 결정 완료
  var _isHorizontal = false; // 수평 스와이프인지
  var _screenEl     = null;  // 현재 스와이프 중인 화면 요소
  var _overlay      = null;  // 딤 오버레이
  var _mainView     = null;  // 홈 화면 요소
  var _screenWidth  = 0;

  // ── 스와이프 가능한 화면인지 판단 ──
  function getSwipeableScreen() {
    // 현재 보이는 화면 찾기
    var stats    = document.getElementById('screen-stats');
    var settings = document.getElementById('screen-settings');
    var workout  = document.getElementById('screen-workout');

    if (stats && stats.style.display !== 'none') {
      return { el: stats, back: 'home' };
    }
    if (settings && settings.style.display !== 'none') {
      return { el: settings, back: 'home' };
    }
    if (workout && workout.style.display !== 'none') {
      // 운동 진행 중이면 onWorkoutBack() 호출, 아니면 home 으로
      var screenType = typeof _currentSession !== 'undefined' && _currentSession !== null ? 'workout-back' : 'home';
      return { el: workout, back: screenType };
    }

    return null;
  }

  // ── 오버레이 생성 ──
  function createOverlay() {
    var overlay = document.getElementById('swipeBackOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'swipeBackOverlay';
      overlay.className = 'swipe-back-overlay';
      document.getElementById('app').appendChild(overlay);
    }
    return overlay;
  }

  // ── 터치 시작 ──
  function onTouchStart(e) {
    var touch = e.touches[0];

    // 왼쪽 가장자리에서만 시작
    if (touch.clientX > EDGE_WIDTH) return;

    var swipeable = getSwipeableScreen();
    if (!swipeable) return;

    _tracking     = true;
    _decided      = false;
    _isHorizontal = false;
    _startX       = touch.clientX;
    _startY       = touch.clientY;
    _currentX     = touch.clientX;
    _screenEl     = swipeable.el;
    _screenWidth  = window.innerWidth;
    _mainView     = document.getElementById('main-view');
    _overlay      = createOverlay();
  }

  // ── 터치 이동 ──
  function onTouchMove(e) {
    if (!_tracking || !_screenEl) return;

    var touch  = e.touches[0];
    var deltaX = touch.clientX - _startX;
    var deltaY = touch.clientY - _startY;

    // 방향 판정 (최초 10px 이동 시 결정)
    if (!_decided) {
      if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) return;
      _decided = true;
      _isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);

      if (!_isHorizontal) {
        // 수직 스크롤이면 추적 중단
        _tracking = false;
        return;
      }

      // 수평 스와이프 확정 — 화면 준비
      _screenEl.classList.add('swiping');
      _overlay.classList.add('visible');

      // 홈 화면을 뒤에 보이게
      if (_mainView) {
        _mainView.style.display = 'block';
        _mainView.classList.add('swipe-peek');
      }
    }

    if (!_isHorizontal) return;

    // 왼→오른 방향만 (deltaX > 0)
    var translateX = Math.max(0, deltaX);
    _currentX = touch.clientX;

    // 현재 화면 이동
    _screenEl.style.transform = 'translateX(' + translateX + 'px)';

    // 홈 화면: -80px → 0px 으로 비례 이동
    if (_mainView) {
      var progress = Math.min(translateX / _screenWidth, 1);
      var peekX = -PEEK_OFFSET * (1 - progress);
      _mainView.style.transform = 'translateX(' + peekX + 'px)';
    }

    // 오버레이 투명도: 스와이프할수록 옅어짐
    if (_overlay) {
      var overlayOpacity = 0.1 * (1 - Math.min(translateX / _screenWidth, 1));
      _overlay.style.opacity = overlayOpacity;
    }

    // 스크롤 방지
    e.preventDefault();
  }

  // ── 터치 종료 ──
  function onTouchEnd(e) {
    if (!_tracking || !_screenEl || !_isHorizontal) {
      _tracking = false;
      return;
    }

    var deltaX    = _currentX - _startX;
    var progress  = deltaX / _screenWidth;
    var confirmed = progress >= THRESHOLD;

    // 애니메이션 클래스 추가
    _screenEl.classList.add('swipe-animating');
    if (_mainView) _mainView.classList.add('swipe-animating');

    if (confirmed) {
      // ── 뒤로가기 확정: 화면 오른쪽 끝으로 슬라이드 아웃 ──
      _screenEl.style.transform = 'translateX(' + _screenWidth + 'px)';
      if (_mainView) _mainView.style.transform = 'translateX(0px)';
      if (_overlay) _overlay.style.opacity = '0';

      // 애니메이션 완료 후 실제 화면 전환
      var screenEl = _screenEl;
      var mainView = _mainView;
      var overlay  = _overlay;
      var swipeable = getSwipeableScreen();

      setTimeout(function() {
        cleanup(screenEl, mainView, overlay);
        // 설정 화면에서 운동으로 돌아가는 경우 분기
        if (typeof _settingsReturnTo !== 'undefined' && _settingsReturnTo === 'workout' &&
            screenEl === document.getElementById('screen-settings')) {
          goBackFromSettings();
        } else if (swipeable && swipeable.back === 'workout-back') {
          // 운동 화면에서 뒤로가기 시 onWorkoutBack() 호출 (세션 저장 포함)
          onWorkoutBack();
        } else {
          showScreen('home');
        }
      }, 300);
    } else {
      // ── 취소: 원위치로 스프링 백 ──
      _screenEl.style.transform = 'translateX(0px)';
      if (_mainView) _mainView.style.transform = 'translateX(-' + PEEK_OFFSET + 'px)';
      if (_overlay) _overlay.style.opacity = '0.1';

      var screenEl = _screenEl;
      var mainView = _mainView;
      var overlay  = _overlay;

      setTimeout(function() {
        cleanup(screenEl, mainView, overlay);
      }, 300);
    }

    _tracking = false;
  }

  // ── 정리 ──
  function cleanup(screenEl, mainView, overlay) {
    if (screenEl) {
      screenEl.classList.remove('swiping', 'swipe-animating');
      screenEl.style.transform = '';
    }
    if (mainView) {
      mainView.classList.remove('swipe-peek', 'swipe-animating');
      mainView.style.transform = '';
      // showScreen이 display를 관리하므로 여기서 건드리지 않음
    }
    if (overlay) {
      overlay.classList.remove('visible');
      overlay.style.opacity = '';
    }
  }

  // ── 이벤트 등록 ──
  document.addEventListener('touchstart', onTouchStart, { passive: true });
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd, { passive: true });
  document.addEventListener('touchcancel', function() {
    if (_tracking && _screenEl && _isHorizontal) {
      _screenEl.classList.add('swipe-animating');
      _screenEl.style.transform = 'translateX(0px)';
      if (_mainView) {
        _mainView.classList.add('swipe-animating');
        _mainView.style.transform = 'translateX(-' + PEEK_OFFSET + 'px)';
      }
      setTimeout(function() {
        cleanup(_screenEl, _mainView, _overlay);
      }, 300);
    }
    _tracking = false;
  }, { passive: true });

})();
