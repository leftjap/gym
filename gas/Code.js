// ═══ PROJECT: gym ═══

// ═══ Gym — 운동 기록 GAS 서버 ═══

var ALLOWED_EMAILS = ['leftjap@gmail.com'];

function _verifyGoogleIdToken(idToken) {
  if (!idToken) return null;

  try {
    var parts = idToken.split('.');
    if (parts.length !== 3) return null;

    var decoded = Utilities.base64DecodeWebSafe(parts[1]);
    var payload = JSON.parse(Utilities.newBlob(decoded).getDataAsString());

    var expectedAud = '910366325974-3ollm3pose37r1fvv8ngnd0v09f2p57l.apps.googleusercontent.com';
    if (payload.aud !== expectedAud) {
      console.warn('JWT aud 불일치: ' + payload.aud);
      return null;
    }

    if (!payload.email) {
      console.warn('JWT email 없음');
      return null;
    }

    return { email: payload.email };
  } catch (e) {
    console.error('_verifyGoogleIdToken 에러:', e);
    return null;
  }
}

function _authenticate(data) {
  var idToken = data.idToken || '';
  var verified = _verifyGoogleIdToken(idToken);
  if (!verified || !verified.email) return false;
  for (var i = 0; i < ALLOWED_EMAILS.length; i++) {
    if (ALLOWED_EMAILS[i] === verified.email) return true;
  }
  console.warn('허용되지 않은 이메일: ' + verified.email);
  return false;
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents || '{}');

    if (!_authenticate(data)) {
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

function getDataFile() {
  var folder = _getGymFolder();
  var files = folder.getFilesByName('gorilla_data.json');
  if (files.hasNext()) return files.next();
  return folder.createFile('gorilla_data.json', '{}', MimeType.PLAIN_TEXT);
}

// ═══ Drive 경로: apps/gym/ ═══
function _getGymFolder() {
  var apps = getOrCreateFolder(DriveApp.getRootFolder(), 'apps');
  return getOrCreateFolder(apps, 'gym');
}

function getOrCreateFolder(parent, name) {
  var folders = parent.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return parent.createFolder(name);
}

function _getGymBackupFolder() {
  var root = DriveApp.getRootFolder();
  var backups = getOrCreateFolder(root, 'backups');
  return getOrCreateFolder(backups, 'gym');
}

function _backupDataIfNeeded() {
  try {
    var props = PropertiesService.getScriptProperties();
    var cooldownKey = 'db_backup_date';
    var todayStr = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
    var lastBackupDate = props.getProperty(cooldownKey) || '';

    if (lastBackupDate === todayStr) return;

    var folder = _getGymFolder();
    var backupFolder = _getGymBackupFolder();
    var file = getDataFile();
    var content = file.getBlob().getDataAsString();

    if (!content || content === '{}') return;

    var backupName = 'gorilla_data_backup_' + todayStr + '.json';
    var existingFiles = backupFolder.getFilesByName(backupName);
    if (existingFiles.hasNext()) {
      existingFiles.next().setContent(content);
    } else {
      backupFolder.createFile(backupName, content, MimeType.PLAIN_TEXT);
    }

    var cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    var cutoffStr = Utilities.formatDate(cutoffDate, 'Asia/Seoul', 'yyyy-MM-dd');

    var allFiles = backupFolder.getFiles();
    while (allFiles.hasNext()) {
      var f = allFiles.next();
      var fname = f.getName();
      var match = fname.match(/^gorilla_data_backup_(\d{4}-\d{2}-\d{2})\.json$/);
      if (match && match[1] < cutoffStr) {
        f.setTrashed(true);
        console.log('오래된 백업 삭제: ' + fname);
      }
    }

    var legacyFiles = backupFolder.getFilesByName('gorilla_data_backup.json');
    while (legacyFiles.hasNext()) {
      legacyFiles.next().setTrashed(true);
      console.log('레거시 백업 파일 삭제: gorilla_data_backup.json');
    }

    props.setProperty(cooldownKey, todayStr);
    console.log('다세대 백업 완료: ' + backupName);
  } catch (e) {
    console.warn('_backupDataIfNeeded fail (ignored):', e);
  }
}

function saveData(payload) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (!payload || !payload.sessions) {
      console.error('⚠️ saveData 차단: payload 또는 sessions 없음');
      return { status: 'error', message: 'Integrity check failed: empty payload' };
    }

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

function loadData() {
  try {
    var file = getDataFile();
    var content = file.getBlob().getDataAsString();
    return { status: 'ok', payload: JSON.parse(content || '{}') };
  } catch (e) {
    return { status: 'error', message: String(e) };
  }
}

function listBackups() {
  var folder = _getGymFolder();
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

function restoreFromBackup(dateStr) {
  var folder = _getGymFolder();
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

  console.log('');
  console.log('복원하려면 이 함수 내부의 주석 3줄을 해제하고 다시 실행하세요.');
}
