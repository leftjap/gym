/* ═══ settings.js — 설정 화면, 종목 관리 ═══ */

var _settingsSelectedPart = 'chest'; // 설정 화면에서 선택된 부위

// ══ 설정 화면 렌더 ══
function renderSettings() {
  var container = document.getElementById('settingsContent');
  if (!container) return;

  var html =
    '<div class="settings-header">' +
      '<button class="settings-back" onclick="showScreen(\'home\')">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>' +
      '</button>' +
      '<span class="settings-title">종목 관리</span>' +
      '<div style="width:36px"></div>' +
    '</div>';

  // 부위 탭
  html += '<div class="settings-part-tabs">';
  for (var i = 0; i < BODY_PARTS.length; i++) {
    var p = BODY_PARTS[i];
    var isActive = p.id === _settingsSelectedPart;
    html +=
      '<button class="settings-part-tab' + (isActive ? ' active' : '') + '" ' +
        'onclick="selectSettingsPart(\'' + p.id + '\')">' +
        p.name +
      '</button>';
  }
  html += '</div>';

  // 종목 목록
  html += '<div class="settings-exercise-list" id="settingsExList">';
  html += renderSettingsExerciseList();
  html += '</div>';

  // 종목 추가 버튼
  html +=
    '<div class="settings-add-area">' +
      '<button class="settings-add-btn" onclick="openAddExerciseForm()">+ 종목 추가</button>' +
    '</div>';

  // 동기화 섹션
  html +=
    '<div class="settings-sync-section">' +
      '<div class="settings-sync-title">데이터 동기화</div>' +
      '<button class="settings-sync-btn" onclick="syncToServer()">서버에 저장</button>' +
      '<button class="settings-sync-btn" onclick="syncFromServer()">서버에서 불러오기</button>' +
    '</div>';

  // 종목 추가 폼 (숨김)
  html += '<div id="addExerciseForm" style="display:none;"></div>';

  container.innerHTML = html;
}

// ══ 부위 탭 전환 ══
function selectSettingsPart(partId) {
  _settingsSelectedPart = partId;
  renderSettings();
}

// ══ 종목 목록 렌더 ══
function renderSettingsExerciseList() {
  var partId = _settingsSelectedPart;
  var hidden = getHiddenExercises();

  // 기본 종목 (숨긴 것 포함해서 모두 표시, 숨김 상태를 토글로 표시)
  var baseExercises = EXERCISES.filter(function(e) { return e.bodyPart === partId; })
    .sort(function(a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });

  // 커스텀 종목
  var customExercises = getCustomExercises().filter(function(e) { return e.bodyPart === partId; });

  var html = '';

  if (baseExercises.length > 0) {
    html += '<div class="settings-section-label">기본 종목</div>';
    for (var i = 0; i < baseExercises.length; i++) {
      var ex = baseExercises[i];
      var isHidden = hidden.indexOf(ex.id) >= 0;
      html +=
        '<div class="settings-ex-item' + (isHidden ? ' hidden-ex' : '') + '">' +
          '<div class="settings-ex-info">' +
            '<div class="settings-ex-name">' + ex.name + '</div>' +
            '<div class="settings-ex-meta">' +
              (EQUIPMENT[ex.equipment] || ex.equipment) +
              ' · ' + ex.defaultSets + '세트 · ' + ex.defaultReps + '회' +
              (ex.defaultWeight ? ' · ' + ex.defaultWeight + 'kg' : '') +
            '</div>' +
          '</div>' +
          '<button class="settings-ex-toggle' + (isHidden ? '' : ' active') + '" ' +
            'onclick="onToggleHideExercise(\'' + ex.id + '\')">' +
            '<div class="settings-toggle-knob"></div>' +
          '</button>' +
        '</div>';
    }
  }

  if (customExercises.length > 0) {
    html += '<div class="settings-section-label">추가한 종목</div>';
    for (var i = 0; i < customExercises.length; i++) {
      var ex = customExercises[i];
      html +=
        '<div class="settings-ex-item">' +
          '<div class="settings-ex-info">' +
            '<div class="settings-ex-name">' + ex.name + '</div>' +
            '<div class="settings-ex-meta">' +
              (EQUIPMENT[ex.equipment] || ex.equipment) +
              ' · ' + ex.defaultSets + '세트 · ' + ex.defaultReps + '회' +
              (ex.defaultWeight ? ' · ' + ex.defaultWeight + 'kg' : '') +
            '</div>' +
          '</div>' +
          '<button class="settings-ex-delete" onclick="onDeleteCustomExercise(\'' + ex.id + '\')">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '</button>' +
        '</div>';
    }
  }

  if (baseExercises.length === 0 && customExercises.length === 0) {
    html += '<div class="settings-empty">이 부위에 등록된 종목이 없습니다</div>';
  }

  return html;
}

// ══ 기본 종목 숨김 토글 ══
function onToggleHideExercise(id) {
  toggleHideExercise(id);
  renderSettings();
}

// ══ 커스텀 종목 삭제 ══
function onDeleteCustomExercise(id) {
  showConfirm('이 종목을 삭제하시겠습니까?', function(confirmed) {
    if (confirmed) {
      deleteCustomExercise(id);
      renderSettings();
    }
  });
}

// ══ 종목 추가 폼 ══
function openAddExerciseForm() {
  var el = document.getElementById('addExerciseForm');
  if (!el) return;

  // 장비 옵션 (cardio 제외)
  var eqKeys = Object.keys(EQUIPMENT);

  var html =
    '<div class="settings-form">' +
      '<div class="settings-form-title">종목 추가</div>' +
      '<div class="form-group">' +
        '<label>종목 이름 *</label>' +
        '<input type="text" id="newExName" placeholder="예: 덤벨 플라이">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>부위</label>' +
        '<div class="settings-form-part">' + (getBodyPart(_settingsSelectedPart) || {}).name + '</div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>장비</label>' +
        '<div class="settings-eq-tabs" id="newExEquipment">';

  for (var i = 0; i < eqKeys.length; i++) {
    var k = eqKeys[i];
    var isFirst = (i === 0);
    html +=
      '<button class="settings-eq-tab' + (isFirst ? ' active' : '') + '" ' +
        'data-eq="' + k + '" onclick="selectEquipmentTab(this, \'' + k + '\')">' +
        EQUIPMENT[k] +
      '</button>';
  }

  html +=
        '</div>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-group form-half">' +
          '<label>기본 세트</label>' +
          '<input type="number" id="newExSets" value="3" inputmode="numeric">' +
        '</div>' +
        '<div class="form-group form-half">' +
          '<label>기본 횟수</label>' +
          '<input type="number" id="newExReps" value="10" inputmode="numeric">' +
        '</div>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-group form-half">' +
          '<label>기본 중량 (kg)</label>' +
          '<input type="number" id="newExWeight" value="20" step="0.5" inputmode="decimal">' +
        '</div>' +
        '<div class="form-group form-half">' +
          '<label>휴식 (초)</label>' +
          '<input type="number" id="newExRest" value="60" inputmode="numeric">' +
        '</div>' +
      '</div>' +
      '<div class="form-actions">' +
        '<button class="btn-cancel" onclick="closeAddExerciseForm()">취소</button>' +
        '<button class="btn-save" onclick="saveNewExercise()">추가</button>' +
      '</div>' +
    '</div>';

  el.innerHTML = html;
  el.style.display = 'block';
  el.scrollIntoView({ behavior: 'smooth' });
}

var _selectedEquipment = 'barbell';

function selectEquipmentTab(btnEl, eq) {
  _selectedEquipment = eq;
  var tabs = btnEl.parentElement.querySelectorAll('.settings-eq-tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.remove('active');
  }
  btnEl.classList.add('active');
}

function saveNewExercise() {
  var name = (document.getElementById('newExName').value || '').trim();
  if (!name) {
    showConfirm('종목 이름을 입력하세요', function() {});
    return;
  }

  var exercise = {
    name: name,
    bodyPart: _settingsSelectedPart,
    equipment: _selectedEquipment,
    defaultSets: parseInt(document.getElementById('newExSets').value) || 3,
    defaultReps: parseInt(document.getElementById('newExReps').value) || 10,
    defaultWeight: parseFloat(document.getElementById('newExWeight').value) || 0,
    defaultRestSec: parseInt(document.getElementById('newExRest').value) || 60,
    met: 4
  };

  addCustomExercise(exercise);
  closeAddExerciseForm();
  renderSettings();
}

function closeAddExerciseForm() {
  var el = document.getElementById('addExerciseForm');
  if (el) {
    el.style.display = 'none';
    el.innerHTML = '';
  }
  _selectedEquipment = 'barbell';
}
