/* ═══ swipe-back.js — iOS 스타일 스와이프 뒤로가기 ═══ */

(function() {
  'use strict';

  // ── 설정 ──
  var EDGE_WIDTH    = 30;   // 왼쪽 가장자리 인식 영역 (px)
  var THRESHOLD     = 0.35; // 화면 너비의 35% 이상 밀면 확정
  var PEEK_OFFSET   = 80;   // 뒤 화면이 시작하는 오프셋 (px)

  // ── 상태 ──
  var _tracking     = false;
  var _blocking     = false;
  var _startX       = 0;
  var _startY       = 0;
  var _currentX     = 0;
  var _decided      = false;
  var _isHorizontal = false;
  var _screenEl     = null;
  var _overlay      = null;
  var _peekEl       = null;
  var _peekElOriginalDisplay = '';
  var _screenWidth  = 0;
  var _backTarget   = null;

  // ── 스와이프 차단 대상인지 판단 ──
  function shouldBlockSwipe() {
    if (document.querySelector('.workout-summary')) return true;
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
      // 종목 추가 모드이면 추가 모드만 닫기
      if (typeof _addExerciseMode !== 'undefined' && _addExerciseMode) {
        return { el: workout, back: 'add-exercise-back' };
      }
      return { el: workout, back: 'workout-back' };
    }

    return null;
  }

  // ── peek 대상 화면 결정 ──
  function getPeekElement(backTarget) {
    if (backTarget === 'settings-to-workout') {
      return document.getElementById('screen-workout');
    }
    if (backTarget === 'add-exercise-back') {
      // 종목 추가 → 운동 화면 복귀이므로 peek 불필요
      return null;
    }
    return document.getElementById('main-view');
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

    if (touch.clientX > EDGE_WIDTH) return;

    if (shouldBlockSwipe()) {
      _blocking = true;
      _tracking = false;
      e.preventDefault();
      return;
    }

    _blocking = false;

    var swipeable = getSwipeableScreen();
    if (!swipeable) return;

    // 스와이프 가능 화면에서도 preventDefault → iOS 네이티브 에지 스와이프 차단
    e.preventDefault();

    _tracking     = true;
    _decided      = false;
    _isHorizontal = false;
    _startX       = touch.clientX;
    _startY       = touch.clientY;
    _currentX     = touch.clientX;
    _screenEl     = swipeable.el;
    _backTarget   = swipeable.back;
    _screenWidth  = window.innerWidth;
    _peekEl       = getPeekElement(swipeable.back);
    _peekElOriginalDisplay = _peekEl ? _peekEl.style.display : '';
    _overlay      = createOverlay();
  }

  // ── 터치 이동 ──
  function onTouchMove(e) {
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

      if (_peekEl) {
        _peekEl.style.display = 'block';
        _peekEl.classList.add('swipe-peek');
      }
    }

    if (!_isHorizontal) return;

    var translateX = Math.max(0, deltaX);
    _currentX = touch.clientX;

    _screenEl.style.transform = 'translateX(' + translateX + 'px)';

    if (_peekEl) {
      var progress = Math.min(translateX / _screenWidth, 1);
      var peekX = -PEEK_OFFSET * (1 - progress);
      _peekEl.style.transform = 'translateX(' + peekX + 'px)';
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
    if (_peekEl) _peekEl.classList.add('swipe-animating');

    var screenEl   = _screenEl;
    var peekEl     = _peekEl;
    var overlay    = _overlay;
    var backTarget = _backTarget;
    var origDisplay = _peekElOriginalDisplay;

    if (confirmed) {
      screenEl.style.transform = 'translateX(' + _screenWidth + 'px)';
      if (peekEl) peekEl.style.transform = 'translateX(0px)';
      if (overlay) overlay.style.opacity = '0';

      setTimeout(function() {
        cleanup(screenEl, peekEl, overlay, origDisplay, true);

        if (backTarget === 'settings-to-workout') {
          _settingsReturnTo = null;
        }

        if (backTarget === 'add-exercise-back') {
          // 종목 추가 모드만 닫고 운동 화면으로 복귀
          screenEl.style.transform = '';
          cancelAddExercise();
          return;
        }

        history.back();
      }, 300);
    } else {
      screenEl.style.transform = 'translateX(0px)';
      if (peekEl) peekEl.style.transform = 'translateX(-' + PEEK_OFFSET + 'px)';
      if (overlay) overlay.style.opacity = '0.1';

      setTimeout(function() {
        cleanup(screenEl, peekEl, overlay, origDisplay, false);
      }, 300);
    }

    _tracking = false;
  }

  // ── 정리 ──
  function cleanup(screenEl, peekEl, overlay, origDisplay, confirmed) {
    if (screenEl) {
      screenEl.classList.remove('swiping', 'swipe-animating');
      screenEl.style.transform = '';
    }
    if (peekEl) {
      peekEl.classList.remove('swipe-peek', 'swipe-animating');
      peekEl.style.transform = '';
      if (!confirmed) {
        peekEl.style.display = origDisplay;
      }
    }
    if (overlay) {
      overlay.classList.remove('visible');
      overlay.style.opacity = '';
    }
  }

  // ── 이벤트 등록 ──
  document.addEventListener('touchstart', onTouchStart, { passive: false });
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd, { passive: true });
  document.addEventListener('touchcancel', function() {
    if (_blocking) {
      _blocking = false;
      return;
    }
    if (_tracking && _screenEl && _isHorizontal) {
      var screenEl = _screenEl;
      var peekEl = _peekEl;
      var overlay = _overlay;
      var origDisplay = _peekElOriginalDisplay;

      screenEl.classList.add('swipe-animating');
      screenEl.style.transform = 'translateX(0px)';
      if (peekEl) {
        peekEl.classList.add('swipe-animating');
        peekEl.style.transform = 'translateX(-' + PEEK_OFFSET + 'px)';
      }
      setTimeout(function() {
        cleanup(screenEl, peekEl, overlay, origDisplay, false);
      }, 300);
    }
    _tracking = false;
  }, { passive: true });

})();
