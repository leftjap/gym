// ═══ PROJECT: gym ═══

// ═══ Gym — 운동 기록 GAS 서버 ═══

var AUTH_TOKEN = 'gym2026';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents || '{}');

    if (data.token !== AUTH_TOKEN) {
      return _json({ status: 'error', message: 'Unauthorized' });
    }

    var result;
    switch (data.action) {
      case 'save':
        result = saveData(data.payload);
        break;
      case 'load':
        result = loadData();
        break;
      default:
        result = { status: 'error', message: 'Unknown action' };
    }
    return _json(result);
  } catch (err) {
    return _json({ status: 'error', message: String(err) });
  }
}

function doGet(e) {
  return _json({ status: 'ok', message: 'Gym GAS is running' });
}

function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── 데이터 파일 관리 ──
function getDataFile() {
  var folder = getOrCreateFolder(DriveApp.getRootFolder(), 'gym');
  var files = folder.getFilesByName('gorilla_data.json');
  if (files.hasNext()) return files.next();
  return folder.createFile('gorilla_data.json', '{}', MimeType.PLAIN_TEXT);
}

function getOrCreateFolder(parent, name) {
  var folders = parent.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return parent.createFolder(name);
}

// ── 다세대 백업 (1일 1회, 7일분 보관) ──
function _backupDataIfNeeded() {
  try {
    var props = PropertiesService.getScriptProperties();
    var cooldownKey = 'db_backup_date';
    var todayStr = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
    var lastBackupDate = props.getProperty(cooldownKey) || '';

    // 오늘 이미 백업했으면 건너뜀
    if (lastBackupDate === todayStr) return;

    var folder = getOrCreateFolder(DriveApp.getRootFolder(), 'gym');
    var file = getDataFile();
    var content = file.getBlob().getDataAsString();

    // 빈 DB는 백업하지 않음
    if (!content || content === '{}') return;

    // 오늘 날짜 백업 파일 생성
    var backupName = 'gorilla_data_backup_' + todayStr + '.json';
    var existingFiles = folder.getFilesByName(backupName);
    if (existingFiles.hasNext()) {
      existingFiles.next().setContent(content);
    } else {
      folder.createFile(backupName, content, MimeType.PLAIN_TEXT);
    }

    // 30일 이전 백업 삭제
    var cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    var cutoffStr = Utilities.formatDate(cutoffDate, 'Asia/Seoul', 'yyyy-MM-dd');

    var allFiles = folder.getFiles();
    while (allFiles.hasNext()) {
      var f = allFiles.next();
      var fname = f.getName();
      var match = fname.match(/^gorilla_data_backup_(\d{4}-\d{2}-\d{2})\.json$/);
      if (match && match[1] < cutoffStr) {
        f.setTrashed(true);
        console.log('오래된 백업 삭제: ' + fname);
      }
    }

    // 레거시 단일 백업 파일도 삭제
    var legacyFiles = folder.getFilesByName('gorilla_data_backup.json');
    while (legacyFiles.hasNext()) {
      legacyFiles.next().setTrashed(true);
      console.log('레거시 백업 파일 삭제: gorilla_data_backup.json');
    }

    props.setProperty(cooldownKey, todayStr);
    console.log('다세대 백업 완료: ' + backupName);
  } catch (e) {
    // 백업 실패는 저장을 막지 않는다
    console.warn('_backupDataIfNeeded fail (ignored):', e);
  }
}

// ── 저장 ──
function saveData(payload) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    // ── 빈 payload 차단 ──
    if (!payload || !payload.sessions) {
      console.error('⚠️ saveData 차단: payload 또는 sessions 없음');
      return { status: 'error', message: 'Integrity check failed: empty payload' };
    }

    // ── sessions 급감 차단 (50% 미만) ──
    var newSessions = payload.sessions || [];
    var file = getDataFile();
    var currentContent = file.getBlob().getDataAsString();
    var currentDb = {};
    try { currentDb = JSON.parse(currentContent || '{}'); } catch(e) {}
    var currentSessions = currentDb.sessions || [];

    if (currentSessions.length >= 5 && newSessions.length < currentSessions.length * 0.5) {
      console.error('⚠️ saveData 차단: sessions 급감 감지. 기존 ' + currentSessions.length + '건 → 신규 ' + newSessions.length + '건');
      return { status: 'error', message: 'Integrity check failed: sessions count drop (' + currentSessions.length + ' → ' + newSessions.length + ')' };
    }

    _backupDataIfNeeded();
    file.setContent(JSON.stringify(payload));
    return { status: 'ok' };
  } catch (e) {
    return { status: 'error', message: String(e) };
  } finally {
    lock.releaseLock();
  }
}

// ── 불러오기 ──
function loadData() {
  try {
    var file = getDataFile();
    var content = file.getBlob().getDataAsString();
    return { status: 'ok', payload: JSON.parse(content || '{}') };
  } catch (e) {
    return { status: 'error', message: String(e) };
  }
}

// ── 백업 목록 조회 (GAS 편집기에서 수동 실행) ──
function listBackups() {
  var folder = getOrCreateFolder(DriveApp.getRootFolder(), 'gym');
  var allFiles = folder.getFiles();
  var backups = [];
  while (allFiles.hasNext()) {
    var f = allFiles.next();
    var fname = f.getName();
    if (fname.match(/^gorilla_data_backup.*\.json$/)) {
      var size = f.getSize();
      var updated = f.getLastUpdated();
      backups.push(fname + ' (' + Math.round(size / 1024) + 'KB, ' + Utilities.formatDate(updated, 'Asia/Seoul', 'yyyy-MM-dd HH:mm') + ')');
    }
  }
  backups.sort();
  console.log('=== gym 백업 목록 ===');
  if (backups.length === 0) {
    console.log('백업 파일 없음');
  } else {
    for (var i = 0; i < backups.length; i++) {
      console.log(backups[i]);
    }
  }
  console.log('총 ' + backups.length + '개');
}

// ── 특정 날짜 백업에서 복원 (GAS 편집기에서 수동 실행) ──
// 사용법: restoreFromBackup('2026-03-28')
function restoreFromBackup(dateStr) {
  var folder = getOrCreateFolder(DriveApp.getRootFolder(), 'gym');
  var backupName = 'gorilla_data_backup_' + dateStr + '.json';
  var files = folder.getFilesByName(backupName);
  if (!files.hasNext()) {
    console.log('백업 파일을 찾을 수 없습니다: ' + backupName);
    return;
  }
  var backupFile = files.next();
  var backupContent = backupFile.getBlob().getDataAsString();
  var backupDb = JSON.parse(backupContent || '{}');

  console.log('=== 백업 내용 (' + backupName + ') ===');
  console.log('sessions: ' + (backupDb.sessions || []).length);
  console.log('prs: ' + Object.keys(backupDb.prs || {}).length);
  console.log('inbody: ' + (backupDb.inbody || []).length);
  console.log('customExercises: ' + (backupDb.customExercises || []).length);

  // 안전장치: 확인 후 수동으로 아래 주석을 해제하여 실행
  // var dataFile = getDataFile();
  // dataFile.setContent(backupContent);
  // console.log('★ 복원 완료. 앱에서 새로고침하세요.');

  console.log('');
  console.log('복원하려면 이 함수 내부의 주석 3줄을 해제하고 다시 실행하세요.');
}
