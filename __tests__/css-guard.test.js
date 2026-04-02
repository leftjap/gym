// ═══ CSS Guard: gym B-57 PROTECT 속성 정적 검증 ═══
// style.css의 iOS PWA 보호 속성(safe-area, position, z-index)이 존재하는지 검증한다.
// AGENTS.md: "iOS PWA CSS 속성은 절대 삭제 금지, B-57 PROTECT 주석 필수"
'use strict';
var test = require('node:test');
var assert = require('node:assert/strict');
var fs = require('fs');
var path = require('path');

var css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf-8');

// 셀렉터 뒤 500자 이내의 CSS 텍스트를 반환한다.
// 별도 블록 추출 없이 근접 범위만 잘라낸다.
function nearBlock(src, selector) {
  var idx = src.indexOf(selector);
  if (idx === -1) return null;
  return src.substring(idx, Math.min(idx + 500, src.length));
}

test.describe('CSS Guard: gym 보호 속성 검증', function () {

  test.it('G-1: .screens-container — padding-bottom + safe-area-inset-bottom', function () {
    var near = nearBlock(css, '.screens-container');
    assert.ok(near !== null, '.screens-container 셀렉터를 찾을 수 없습니다');
    assert.ok(near.indexOf('padding-bottom') !== -1, '.screens-container 근처에 padding-bottom이 없습니다');
    assert.ok(near.indexOf('safe-area-inset-bottom') !== -1, '.screens-container 근처에 safe-area-inset-bottom이 없습니다');
  });

  test.it('G-2: .rest-timer-bar — position fixed + z-index 150', function () {
    var near = nearBlock(css, '.rest-timer-bar');
    assert.ok(near !== null, '.rest-timer-bar 셀렉터를 찾을 수 없습니다');
    assert.ok(near.indexOf('position') !== -1 && near.indexOf('fixed') !== -1, '.rest-timer-bar 근처에 position fixed가 없습니다');
    assert.ok(near.indexOf('z-index') !== -1 && near.indexOf('150') !== -1, '.rest-timer-bar 근처에 z-index 150이 없습니다');
  });

  test.it('G-3: .workout-content — safe-area-inset-top', function () {
    var near = nearBlock(css, '.workout-content');
    assert.ok(near !== null, '.workout-content 셀렉터를 찾을 수 없습니다');
    assert.ok(near.indexOf('safe-area-inset-top') !== -1, '.workout-content 근처에 safe-area-inset-top이 없습니다');
  });

  test.it('G-4: B-57 PROTECT 주석 최소 4개', function () {
    var count = 0;
    var searchFrom = 0;
    while (true) {
      var idx = css.indexOf('B-57 PROTECT', searchFrom);
      if (idx === -1) break;
      count++;
      searchFrom = idx + 1;
    }
    assert.ok(count >= 4, 'B-57 PROTECT 주석이 ' + count + '개입니다 (최소 4개 필요)');
  });

  test.it('G-5: .workout-header — position fixed + safe-area-inset-top', function () {
    var near = nearBlock(css, '.workout-header');
    assert.ok(near !== null, '.workout-header 셀렉터를 찾을 수 없습니다');
    assert.ok(near.indexOf('position') !== -1 && near.indexOf('fixed') !== -1, '.workout-header 근처에 position fixed가 없습니다');
    assert.ok(near.indexOf('safe-area-inset-top') !== -1, '.workout-header 근처에 safe-area-inset-top이 없습니다');
  });

  test.it('G-6: .stats-header — safe-area-inset-top', function () {
    var near = nearBlock(css, '.stats-header');
    assert.ok(near !== null, '.stats-header 셀렉터를 찾을 수 없습니다');
    assert.ok(near.indexOf('safe-area-inset-top') !== -1, '.stats-header 근처에 safe-area-inset-top이 없습니다');
  });

  test.it('G-7: .settings-header — safe-area-inset-top', function () {
    var near = nearBlock(css, '.settings-header');
    assert.ok(near !== null, '.settings-header 셀렉터를 찾을 수 없습니다 — style.css 셀렉터명 확인 필요');
    assert.ok(near.indexOf('safe-area-inset-top') !== -1, '.settings-header 근처에 safe-area-inset-top이 없습니다');
  });
});
