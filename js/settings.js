/* ═══ settings.js — 설정 화면, 종목 관리 ═══ */

var _settingsSelectedPart = 'chest'; // 설정 화면에서 선택된 부위
var _settingsReturnTo = null; // 설정 화면에서 뒤로가기 시 돌아갈 화면 ('home' | 'workout' | null)

// ══ 특정 부위를 선택한 상태로 설정 화면 열기 ══
function openSettingsForPart(partId) {
  _settingsSelectedPart = partId;
  _settingsReturnTo = 'workout';
  showScreen('settings');
}

// ══ 설정 화면 렌더 ══
function renderSettings() {
  var container = document.getElementById('settingsContent');
  if (!container) return;

  var html =
    '<div class="settings-header">' +
      '<button class="settings-back" onclick="goBackFromSettings()">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>' +
      '</button>' +
      '<span class="settings-title">종목 관리</span>' +
      '<div style="width:36px"></div>' +
    '</div>';

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

  html += '<div class="settings-exercise-list" id="settingsExList">';
  html += renderSettingsExerciseList();
  html += '</div>';

  html +=
    '<div class="settings-add-area">' +
      '<button class="settings-add-btn" onclick="openAddExerciseForm()">+ 종목 추가</button>' +
    '</div>';

  var lastSync = getLastSyncTime();
  var syncTimeText = formatSyncTime(lastSync);
  var onlineStatus = navigator.onLine ? '온라인' : '오프라인';
  var onlineClass = navigator.onLine ? 'online' : 'offline';

  html +=
    '<div class="settings-sync-section">' +
      '<div class="settings-sync-header">' +
        '<div class="settings-sync-title">데이터 동기화</div>' +
        '<div class="settings-sync-status-row">' +
          '<span class="settings-sync-dot ' + onlineClass + '"></span>' +
          '<span class="settings-sync-status-text">' + onlineStatus + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="settings-sync-time">마지막 동기화: ' + syncTimeText + '</div>' +
    '</div>';

  html += '<div id="addExerciseForm" style="display:none;"></div>';

  container.innerHTML = html;

  // 드래그 순서 변경 바인딩
  bindSettingsExerciseDrag();
}

// ══ 설정 화면 뒤로가기 ══
function goBackFromSettings() {
  _settingsReturnTo = null;
  history.back();
}

// ══ 부위 탭 전환 ══
function selectSettingsPart(partId) {
  _settingsSelectedPart = partId;
  renderSettings();
}

// ══ 종목 목록 렌더 ══
function renderSettingsExerciseList() {
  var partId = _settingsSelectedPart;
  var allExercises = getExercisesByPart(partId);
  var hidden = getHiddenExercises();
  var overrides = getPartOverrides();

  // 숨김 종목도 포함하여 표시 (오버라이드 반영)
  var hiddenBase = EXERCISES.filter(function(e) {
    var effectivePart = overrides[e.id] || e.bodyPart;
    return effectivePart === partId && hidden.indexOf(e.id) >= 0;
  });

  // 합치기: getExercisesByPart는 숨김 제외이므로, 숨김 종목을 뒤에 추가
  var displayList = allExercises.concat(hiddenBase);

  var html = '';

  if (displayList.length === 0) {
    html += '<div class="settings-empty">이 부위에 등록된 종목이 없습니다</div>';
    return html;
  }

  for (var i = 0; i < displayList.length; i++) {
    var ex = displayList[i];
    var isHidden = hidden.indexOf(ex.id) >= 0;
    var isCustom = isCustomExercise(ex.id);
    var iconUrl = getExerciseIcon(ex.id);
    var iconHtml = iconUrl
      ? '<img src="' + iconUrl + '" class="settings-ex-icon" alt="" onerror="this.style.display=\'none\'">'
      : '';

    // 원래 부위에서 이동해온 종목인지 표시
    var originalEx = EXERCISES.find(function(e) { return e.id === ex.id; });
    var movedFromHtml = '';
    if (originalEx && overrides[ex.id]) {
      var origPart = getBodyPart(originalEx.bodyPart);
      if (origPart) {
        movedFromHtml = ' · <span style="color:var(--accent)">' + origPart.name + '에서 이동</span>';
      }
    }

    html +=
      '<div class="settings-ex-item' + (isHidden ? ' hidden-ex' : '') + '" data-exercise-id="' + ex.id + '"' + (isHidden ? ' data-hidden="true"' : '') + '>' +
        '<div class="settings-ex-info" data-ex-id="' + ex.id + '">' +
          '<div class="settings-ex-name-row">' +
            iconHtml +
            '<span class="settings-ex-name">' + ex.name + '</span>' +
          '</div>' +
          '<div class="settings-ex-meta">' +
            (EQUIPMENT[ex.equipment] || ex.equipment) +
            ' · ' + ex.defaultSets + '세트 · ' + ex.defaultReps + '회' +
            (ex.defaultWeight ? ' · ' + ex.defaultWeight + 'kg' : '') +
            movedFromHtml +
          '</div>' +
        '</div>' +
        '<button class="settings-ex-toggle' + (isHidden ? '' : ' active') + '" ' +
          'onclick="event.stopPropagation(); onToggleHideExercise(\'' + ex.id + '\')">' +
          '<div class="settings-toggle-knob"></div>' +
        '</button>' +
      '</div>';
  }

  return html;
}

function bindSettingsExerciseDrag() {
  var listEl = document.getElementById('settingsExList');
  if (!listEl) return;

  var items = listEl.querySelectorAll('.settings-ex-item');
  for (var i = 0; i < items.length; i++) {
    (function(item) {
      var exId = item.getAttribute('data-exercise-id');
      if (!exId) return;

      var timer = null;
      var isDragging = false;
      var wasDragged = false;
      var startY = 0;
      var startX = 0;
      var ghostEl = null;
      var placeholder = null;
      var allItems = [];
      var currentIdx = -1;
      var originalIdx = -1;
      var hoveredPartTab = null;

      item.addEventListener('touchstart', function(e) {
        if (item.getAttribute('data-hidden') === 'true') return;

        isDragging = false;
        wasDragged = false;
        hoveredPartTab = null;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        item.classList.add('long-pressing');

        timer = setTimeout(function() {
          timer = null;
          isDragging = true;
          wasDragged = true;
          item.classList.remove('long-pressing');
          if (navigator.vibrate) navigator.vibrate(30);

          allItems = Array.prototype.slice.call(listEl.querySelectorAll('.settings-ex-item'));
          originalIdx = allItems.indexOf(item);
          currentIdx = originalIdx;

          var rect = item.getBoundingClientRect();
          ghostEl = item.cloneNode(true);
          ghostEl.className = 'settings-ex-item settings-ex-drag-ghost';
          ghostEl.style.position = 'fixed';
          ghostEl.style.top = rect.top + 'px';
          ghostEl.style.left = rect.left + 'px';
          ghostEl.style.width = rect.width + 'px';
          ghostEl.style.zIndex = '9999';
          ghostEl.style.pointerEvents = 'none';
          ghostEl.style.opacity = '0.9';
          ghostEl.style.transform = 'scale(1.02)';
          ghostEl.style.boxShadow = '0 8px 24px rgba(0,0,0,0.18)';
          ghostEl.style.background = 'var(--white)';
          ghostEl.style.borderRadius = '8px';
          ghostEl.style.transition = 'none';
          document.body.appendChild(ghostEl);

          ghostEl._startGhostTop = rect.top;
          ghostEl._startTouchY = startY;

          placeholder = document.createElement('div');
          placeholder.className = 'settings-ex-drag-placeholder';
          placeholder.style.height = rect.height + 'px';
          item.parentNode.insertBefore(placeholder, item);
          item.style.display = 'none';
        }, 500);
      }, { passive: true });

      item.addEventListener('touchmove', function(e) {
        var dx = Math.abs(e.touches[0].clientX - startX);
        var dy = Math.abs(e.touches[0].clientY - startY);

        if (!isDragging && timer) {
          if (dx > 10 || dy > 10) {
            clearTimeout(timer);
            timer = null;
            item.classList.remove('long-pressing');
          }
          return;
        }

        if (!isDragging || !ghostEl) return;
        e.preventDefault();

        var touchX = e.touches[0].clientX;
        var touchY = e.touches[0].clientY;
        ghostEl.style.top = (ghostEl._startGhostTop + (touchY - ghostEl._startTouchY)) + 'px';

        // 부위 탭 호버 감지
        var prevHovered = hoveredPartTab;
        hoveredPartTab = null;
        var partTabs = document.querySelectorAll('.settings-part-tab');
        for (var t = 0; t < partTabs.length; t++) {
          var tabRect = partTabs[t].getBoundingClientRect();
          if (touchX >= tabRect.left && touchX <= tabRect.right &&
              touchY >= tabRect.top && touchY <= tabRect.bottom) {
            hoveredPartTab = partTabs[t];
            break;
          }
        }

        // 하이라이트 갱신
        for (var t2 = 0; t2 < partTabs.length; t2++) {
          partTabs[t2].classList.remove('drag-hover');
        }
        if (hoveredPartTab) {
          hoveredPartTab.classList.add('drag-hover');
        }

        // 부위 탭 위가 아닐 때만 리스트 내 순서 변경 처리
        if (!hoveredPartTab) {
          var newIdx = currentIdx;
          for (var j = 0; j < allItems.length; j++) {
            if (allItems[j] === item) continue;
            if (allItems[j].style.display === 'none') continue;
            var r = allItems[j].getBoundingClientRect();
            var midY = r.top + r.height / 2;
            if (touchY < midY && j < currentIdx) {
              newIdx = j;
              break;
            }
            if (touchY > midY && j > currentIdx) {
              newIdx = j;
            }
          }

          if (newIdx !== currentIdx) {
            if (placeholder && placeholder.parentNode) {
              placeholder.parentNode.removeChild(placeholder);
            }
            if (newIdx < allItems.length) {
              var targetItem = allItems[newIdx];
              if (newIdx > currentIdx) {
                targetItem.parentNode.insertBefore(placeholder, targetItem.nextSibling);
              } else {
                targetItem.parentNode.insertBefore(placeholder, targetItem);
              }
            }
            currentIdx = newIdx;
          }
        }
      }, { passive: false });

      item.addEventListener('touchend', function(e) {
        item.classList.remove('long-pressing');

        if (timer) {
          clearTimeout(timer);
          timer = null;
        }

        // 부위 탭 하이라이트 제거
        var partTabs = document.querySelectorAll('.settings-part-tab');
        for (var t = 0; t < partTabs.length; t++) {
          partTabs[t].classList.remove('drag-hover');
        }

        if (!isDragging && !wasDragged) {
          // 짧은 탭 → 아이콘 편집 폼 열기
          var infoEl = item.querySelector('.settings-ex-info');
          var tapExId = infoEl ? infoEl.getAttribute('data-ex-id') : exId;
          if (tapExId) {
            openEditExerciseIconForm(tapExId);
          }
          return;
        }

        if (!isDragging) return;
        isDragging = false;

        if (ghostEl) {
          ghostEl.remove();
          ghostEl = null;
        }

        item.style.display = '';

        if (placeholder && placeholder.parentNode) {
          placeholder.parentNode.insertBefore(item, placeholder);
          placeholder.remove();
          placeholder = null;
        }

        // 부위 탭 위에 드롭한 경우 → 부위 이동
        if (hoveredPartTab) {
          var targetPartId = null;
          for (var pi = 0; pi < BODY_PARTS.length; pi++) {
            if (hoveredPartTab.textContent.trim() === BODY_PARTS[pi].name) {
              targetPartId = BODY_PARTS[pi].id;
              break;
            }
          }

          if (targetPartId && targetPartId !== _settingsSelectedPart) {
            var meta = getExercise(exId);
            var exName = meta ? meta.name : exId;
            var targetPart = getBodyPart(targetPartId);
            var targetName = targetPart ? targetPart.name : targetPartId;

            showConfirm(exName + '을(를) ' + targetName + '(으)로 이동하시겠습니까?', function(confirmed) {
              if (confirmed) {
                if (isCustomExercise(exId)) {
                  var customs = getCustomExercises();
                  for (var ci = 0; ci < customs.length; ci++) {
                    if (customs[ci].id === exId) {
                      customs[ci].bodyPart = targetPartId;
                      break;
                    }
                  }
                  S(K.customExercises, customs);
                } else {
                  setPartOverride(exId, targetPartId);
                }

                // 원래 부위 순서에서 제거
                var orderMap = getExerciseOrder();
                var srcOrder = orderMap[_settingsSelectedPart];
                if (srcOrder) {
                  orderMap[_settingsSelectedPart] = srcOrder.filter(function(eid) { return eid !== exId; });
                  saveExerciseOrder(orderMap);
                }

                saveLastSyncTime();
                if (typeof syncToServer === 'function') syncToServer(null, true);
                renderSettings();
              }
            });
          }

          hoveredPartTab = null;
          e.preventDefault();
          return;
        }

        hoveredPartTab = null;

        // 같은 부위 내 순서 변경 (기존 로직)
        if (originalIdx !== currentIdx) {
          var newItems = listEl.querySelectorAll('.settings-ex-item');
          var newOrder = [];
          for (var k = 0; k < newItems.length; k++) {
            var eid = newItems[k].getAttribute('data-exercise-id');
            if (eid && newItems[k].getAttribute('data-hidden') !== 'true') {
              newOrder.push(eid);
            }
          }

          var orderMap = getExerciseOrder();
          orderMap[_settingsSelectedPart] = newOrder;
          saveExerciseOrder(orderMap);

          saveLastSyncTime();
          if (typeof syncToServer === 'function') syncToServer(null, true);
        }

        e.preventDefault();
      }, { passive: false });

      item.addEventListener('touchcancel', function() {
        item.classList.remove('long-pressing');
        if (timer) { clearTimeout(timer); timer = null; }
        isDragging = false;
        wasDragged = false;
        hoveredPartTab = null;
        if (ghostEl) { ghostEl.remove(); ghostEl = null; }
        if (placeholder && placeholder.parentNode) { placeholder.remove(); placeholder = null; }
        item.style.display = '';

        var partTabs = document.querySelectorAll('.settings-part-tab');
        for (var t = 0; t < partTabs.length; t++) {
          partTabs[t].classList.remove('drag-hover');
        }
      }, { passive: true });

    })(items[i]);
  }
}

// ══ 기본 종목 숨김 토글 ══
function onToggleHideExercise(id) {
  toggleHideExercise(id);
  renderSettings();
  saveLastSyncTime();
  if (typeof syncToServer === 'function') syncToServer(null, true);
}

// ══ 커스텀 종목 삭제 ══
function onDeleteCustomExercise(id) {
  showConfirm('이 종목을 삭제하시겠습니까?', function(confirmed) {
    if (confirmed) {
      deleteCustomExercise(id);
      renderSettings();
      if (typeof syncToServer === 'function') syncToServer(null, true);
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
      '<div class="form-group">' +
        '<label>아이콘 이미지 URL</label>' +
        '<input type="url" id="newExIcon" placeholder="https://example.com/icon.png">' +
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

  var added = addCustomExercise(exercise);

  // 아이콘 URL 저장
  var iconUrl = (document.getElementById('newExIcon').value || '').trim();
  if (iconUrl && added.id) {
    setExerciseIcon(added.id, iconUrl);
  }

  closeAddExerciseForm();
  renderSettings();
  saveLastSyncTime();
  if (typeof syncToServer === 'function') syncToServer(null, true);
}

function closeAddExerciseForm() {
  var el = document.getElementById('addExerciseForm');
  if (el) {
    el.style.display = 'none';
    el.innerHTML = '';
  }
  _selectedEquipment = 'barbell';
}

// ══ 기본/커스텀 종목 아이콘 편집 폼 ══
function openEditExerciseIconForm(exerciseId) {
  var el = document.getElementById('addExerciseForm');
  if (!el) return;

  var meta = getExercise(exerciseId);
  if (!meta) return;

  var currentIcon = getExerciseIcon(exerciseId);

  var previewHtml = currentIcon
    ? '<div class="settings-icon-preview"><img src="' + currentIcon + '" alt="" onerror="this.parentElement.innerHTML=\'이미지를 불러올 수 없습니다\'"></div>'
    : '';

  var html =
    '<div class="settings-form">' +
      '<div class="settings-form-title">' + meta.name + '</div>' +
      '<div class="form-group">' +
        '<div class="settings-ex-meta" style="margin-bottom:12px">' +
          (EQUIPMENT[meta.equipment] || meta.equipment) +
          ' · ' + meta.defaultSets + '세트 · ' + meta.defaultReps + '회' +
          (meta.defaultWeight ? ' · ' + meta.defaultWeight + 'kg' : '') +
        '</div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>아이콘 이미지 URL</label>' +
        '<input type="url" id="editExIcon" value="' + (currentIcon || '') + '" placeholder="https://example.com/icon.png" oninput="previewEditIcon()">' +
      '</div>' +
      '<div id="editIconPreview">' + previewHtml + '</div>' +
      '<div class="form-actions">' +
        '<button class="btn-cancel" onclick="closeEditExerciseIconForm()">취소</button>' +
        '<button class="btn-save" onclick="saveExerciseIcon(\'' + exerciseId + '\')">저장</button>' +
      '</div>' +
    '</div>';

  el.innerHTML = html;
  el.style.display = 'block';
  el.scrollIntoView({ behavior: 'smooth' });
}

function saveExerciseIcon(exerciseId) {
  var iconUrl = (document.getElementById('editExIcon').value || '').trim();
  setExerciseIcon(exerciseId, iconUrl);
  closeEditExerciseIconForm();
  renderSettings();
  saveLastSyncTime();
  if (typeof syncToServer === 'function') syncToServer(null, true);
}

function closeEditExerciseIconForm() {
  var el = document.getElementById('addExerciseForm');
  if (el) {
    el.style.display = 'none';
    el.innerHTML = '';
  }
}

function previewEditIcon() {
  var url = (document.getElementById('editExIcon').value || '').trim();
  var container = document.getElementById('editIconPreview');
  if (!container) return;
  if (url) {
    container.innerHTML = '<div class="settings-icon-preview"><img src="' + url + '" alt="" onerror="this.parentElement.innerHTML=\'이미지를 불러올 수 없습니다\'"></div>';
  } else {
    container.innerHTML = '';
  }
}

// ══ 수동 동기화 (설정 화면) ══
function onManualSyncSave() {
  var btn = document.getElementById('syncSaveBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="settings-sync-btn-icon spin">↑</span> 저장 중...';
  }
  syncToServer(function(success) {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="settings-sync-btn-icon">↑</span> 서버에 저장';
    }
    // 동기화 시각 갱신
    renderSettings();
  }, false); // silent=false → 토스트 표시
}

function onManualSyncLoad() {
  var btn = document.getElementById('syncLoadBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="settings-sync-btn-icon spin">↓</span> 불러오는 중...';
  }
  syncFromServer(function(success) {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="settings-sync-btn-icon">↓</span> 서버에서 불러오기';
    }
    renderSettings();
  }, false);
}
