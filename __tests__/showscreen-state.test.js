'use strict';
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { resetStorage } = require('./_setup');

// ── 최소 DOM mock ──
function makeMockEl(id, display) {
  return {
    id: id,
    style: { display: display || 'none' },
    scrollTo: function() {},
    innerHTML: '',
    querySelector: function() { return null; },
    querySelectorAll: function() { return []; },
    classList: { add: function(){}, remove: function(){}, contains: function(){ return false; } },
    addEventListener: function() {}
  };
}

const _screens = {};

function setupDOM() {
  _screens['main-view'] = makeMockEl('main-view');
  _screens['screen-workout'] = makeMockEl('screen-workout');
  _screens['screen-stats'] = makeMockEl('screen-stats');
  _screens['screen-settings'] = makeMockEl('screen-settings');
  _screens['workoutHeader'] = makeMockEl('workoutHeader');
  _screens['bottomBtn'] = makeMockEl('bottomBtn');
  _screens['summaryMsg'] = makeMockEl('summaryMsg');
  _screens['weekCal'] = makeMockEl('weekCal');
  _screens['lastWorkoutCard'] = makeMockEl('lastWorkoutCard');

  global.document.getElementById = function(id) { return _screens[id] || null; };
}

// ── 필요한 전역 스텁 ──
global.history = { pushState: function(){}, replaceState: function(){}, back: function(){} };
global.window.scrollTo = function(){};
global._workoutTimerInterval = null;
global.clearInterval = function(t) { global._workoutTimerInterval = null; };
global.renderHome = function() {};
global.renderWorkoutScreen = function() {};
global.renderStatsScreen = function() {};
global.renderSettings = function() {};
global.updateBottomButton = function() {};
global.ensureWorkoutHeader = function() {};
global.L = global.L || function(k) { try { return JSON.parse(localStorage.getItem(k)); } catch(e) { return null; } };

// showScreen 함수를 직접 정의 (ui.js에서 추출한 핵심 로직)
function showScreen(screenId, historyAction) {
  if (!historyAction) historyAction = 'push';
  var mainView = document.getElementById('main-view');
  var workoutScreen = document.getElementById('screen-workout');
  var statsScreen = document.getElementById('screen-stats');
  var settingsScreen = document.getElementById('screen-settings');
  var workoutHeader = document.getElementById('workoutHeader');
  var bottomBtn = document.getElementById('bottomBtn');

  mainView.style.display = 'none';
  workoutScreen.style.display = 'none';
  if (statsScreen) statsScreen.style.display = 'none';
  if (settingsScreen) settingsScreen.style.display = 'none';
  if (workoutHeader) workoutHeader.style.display = 'none';

  if (screenId !== 'workout') {
    if (typeof _workoutTimerInterval !== 'undefined' && _workoutTimerInterval) {
      clearInterval(_workoutTimerInterval);
      _workoutTimerInterval = null;
    }
  }

  if (screenId === 'home') {
    mainView.style.display = 'block';
    if (bottomBtn) bottomBtn.style.display = 'block';
  } else if (screenId === 'workout') {
    workoutScreen.style.display = 'block';
    if (bottomBtn) bottomBtn.style.display = 'block';
  } else if (screenId === 'stats') {
    if (statsScreen) statsScreen.style.display = 'block';
    if (bottomBtn) bottomBtn.style.display = 'none';
  } else if (screenId === 'settings') {
    if (settingsScreen) settingsScreen.style.display = 'block';
    if (bottomBtn) bottomBtn.style.display = 'none';
  }

  if (historyAction === 'push') {
    history.pushState({ screen: screenId }, '');
  } else if (historyAction === 'replace') {
    history.replaceState({ screen: screenId }, '');
  }
}

describe('gym showScreen 화면 전환 상태', function() {

  beforeEach(function() {
    setupDOM();
    global._workoutTimerInterval = null;
  });

  it('8-1: home 전환 — main-view만 표시, 나머지 숨김', function() {
    showScreen('home');
    assert.equal(_screens['main-view'].style.display, 'block');
    assert.equal(_screens['screen-workout'].style.display, 'none');
    assert.equal(_screens['screen-stats'].style.display, 'none');
    assert.equal(_screens['screen-settings'].style.display, 'none');
  });

  it('8-2: workout 전환 — workout만 표시', function() {
    showScreen('workout');
    assert.equal(_screens['screen-workout'].style.display, 'block');
    assert.equal(_screens['main-view'].style.display, 'none');
    assert.equal(_screens['screen-stats'].style.display, 'none');
    assert.equal(_screens['screen-settings'].style.display, 'none');
  });

  it('8-3: stats 전환 — stats만 표시, bottomBtn 숨김', function() {
    showScreen('stats');
    assert.equal(_screens['screen-stats'].style.display, 'block');
    assert.equal(_screens['main-view'].style.display, 'none');
    assert.equal(_screens['bottomBtn'].style.display, 'none');
  });

  it('8-4: settings 전환 — settings만 표시, bottomBtn 숨김', function() {
    showScreen('settings');
    assert.equal(_screens['screen-settings'].style.display, 'block');
    assert.equal(_screens['main-view'].style.display, 'none');
    assert.equal(_screens['bottomBtn'].style.display, 'none');
  });

  it('8-5: 항상 정확히 1개 화면만 표시', function() {
    var screens = ['home', 'workout', 'stats', 'settings'];
    var screenEls = {
      home: 'main-view',
      workout: 'screen-workout',
      stats: 'screen-stats',
      settings: 'screen-settings'
    };

    for (var i = 0; i < screens.length; i++) {
      showScreen(screens[i]);
      var visibleCount = 0;
      for (var key in screenEls) {
        if (_screens[screenEls[key]].style.display !== 'none') visibleCount++;
      }
      assert.equal(visibleCount, 1, screens[i] + ' 전환 시 표시 화면 1개');
    }
  });

  it('8-6: workout→home 전환 시 _workoutTimerInterval 정리', function() {
    global._workoutTimerInterval = 12345;
    showScreen('home');
    assert.equal(global._workoutTimerInterval, null, '타이머 인터벌 정리됨');
  });
});
