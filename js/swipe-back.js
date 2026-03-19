/* ═══ swipe-back.js — iOS 스타일 스와이프 뒤로가기 ═══ */

(function() {
  'use strict';

  // ── 설정 ──
  var EDGE_WIDTH    = 30;   // 왼쪽 가장자리 인식 영역 (px)
  var THRESHOLD     = 0.35; // 화면 너비의 35% 이상 밀면 확정
  var PEEK_OFFSET   = 80;   // 홈 화면 뒤에서 시작하는 오프셋 (px)

  // ── 상태 ──
  var _tracking     = false;
  var _blocking     = false; // 차단 모드 (에지 터치를 먹어서 네이티브 스와이프 방지)
  var _startX       = 0;
  var _startY       = 0;
  var _currentX     = 0;
  var _decided      = false;
  var _isHorizontal = false;
  var _screenEl     = null;
  var _overlay      = null;
  var _mainView     = null;
  var _screenWidth  = 0;
  var _backTarget   = null;

  // ── 스와이프 차단 대상인지 판단 ──
  function shouldBlockSwipe() {
    // 요약 화면
    if (document.querySelector('.workout-summary')) return true;
    // 홈 화면 (main-view가 보이고 다른 화면이 안 보일 때)
    var mainView = document.getElementById('main-view');
    var workout  = document.getElementById('screen-workout');
    var stats    = document.getElementById('screen-stats');
    var settings = document.getElementById('screen-settings');
    if (mainView && mainView.style.display !== 'none') {
      var otherVisible = (workout && workout.style.display !== 'none') ||
                         (stats && stats.style.display !== 'none') ||
                         (settings && settings.style.display !== 'none');
      if (!otherVisible) return true;
    }
    return false;
  }

  // ── 스와이프 가능한 화면인지 판단 ──
  function getSwipeableScreen() {
    var stats    = document.getElementById('screen-stats');
    var settings = document.getElementById('screen-settings');
    var workout  = document.getElementById('screen-workout');

    if (stats && stats.style.display !== 'none') {
      return { el: stats, back: 'home' };
    }
    if (settings && settings.style.display !== 'none') {
      if (typeof _settingsReturnTo !== 'undefined' && _settingsReturnTo === 'workout') {
        return { el: settings, back: 'settings-to-workout' };
      }
      return { el: settings, back: 'home' };
    }
    if (workout && workout.style.display !== 'none') {
      return { el: workout, back: 'workout-back' };
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

    // 왼쪽 가장자리에서만 처리
    if (touch.clientX > EDGE_WIDTH) return;

    // 차단 대상 화면이면 touchstart에서 바로 preventDefault
    // iOS Safari는 touchstart에서 preventDefault해야 네이티브 에지 스와이프가 차단됨
    if (shouldBlockSwipe()) {
      _blocking = true;
      _tracking = false;
      e.preventDefault();
      return;
    }

    _blocking = false;

    var swipeable = getSwipeableScreen();
    if (!swipeable) return;

    _tracking     = true;
    _decided      = false;
    _isHorizontal = false;
    _startX       = touch.clientX;
    _startY       = touch.clientY;
    _currentX     = touch.clientX;
    _screenEl     = swipeable.el;
    _backTarget   = swipeable.back;
    _screenWidth  = window.innerWidth;
    _mainView     = document.getElementById('main-view');
    _overlay      = createOverlay();
  }

  // ── 터치 이동 ──
  function onTouchMove(e) {
    // 차단 모드: 보조 방어선
    if (_blocking) {
      e.preventDefault();
      return;
    }

    if (!_tracking || !_screenEl) return;

    var touch  = e.touches[0];
    var deltaX = touch.clientX - _startX;
    var deltaY = touch.clientY - _startY;

    if (!_decided) {
      if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) return;
      _decided = true;
      _isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);

      if (!_isHorizontal) {
        _tracking = false;
        return;
      }

      _screenEl.classList.add('swiping');
      _overlay.classList.add('visible');

      if (_mainView) {
        _mainView.style.display = 'block';
        _mainView.classList.add('swipe-peek');
      }
    }

    if (!_isHorizontal) return;

    var translateX = Math.max(0, deltaX);
    _currentX = touch.clientX;

    _screenEl.style.transform = 'translateX(' + translateX + 'px)';

    if (_mainView) {
      var progress = Math.min(translateX / _screenWidth, 1);
      var peekX = -PEEK_OFFSET * (1 - progress);
      _mainView.style.transform = 'translateX(' + peekX + 'px)';
    }

    if (_overlay) {
      var overlayOpacity = 0.1 * (1 - Math.min(translateX / _screenWidth, 1));
      _overlay.style.opacity = overlayOpacity;
    }

    e.preventDefault();
  }

  // ── 터치 종료 ──
  function onTouchEnd(e) {
    if (_blocking) {
      _blocking = false;
      return;
    }

    if (!_tracking || !_screenEl || !_isHorizontal) {
      _tracking = false;
      return;
    }

    var deltaX    = _currentX - _startX;
    var progress  = deltaX / _screenWidth;
    var confirmed = progress >= THRESHOLD;

    _screenEl.classList.add('swipe-animating');
    if (_mainView) _mainView.classList.add('swipe-animating');

    if (confirmed) {
      _screenEl.style.transform = 'translateX(' + _screenWidth + 'px)';
      if (_mainView) _mainView.style.transform = 'translateX(0px)';
      if (_overlay) _overlay.style.opacity = '0';

      var screenEl = _screenEl;
      var mainView = _mainView;
      var overlay  = _overlay;
      var backTarget = _backTarget;

      setTimeout(function() {
        cleanup(screenEl, mainView, overlay);

        if (backTarget === 'settings-to-workout') {
          goBackFromSettings();
        } else if (backTarget === 'workout-back') {
          onWorkoutBack();
        } else {
          showScreen('home');
        }
      }, 300);
    } else {
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
    }
    if (overlay) {
      overlay.classList.remove('visible');
      overlay.style.opacity = '';
    }
  }

  // ── 이벤트 등록 ──
  // touchstart: passive:false 필수 — iOS Safari에서 preventDefault()로 에지 스와이프 차단하려면
  document.addEventListener('touchstart', onTouchStart, { passive: false });
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd, { passive: true });
  document.addEventListener('touchcancel', function() {
    if (_blocking) {
      _blocking = false;
      return;
    }
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
