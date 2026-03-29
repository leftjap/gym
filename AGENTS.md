<!-- PROJECT: gym -->

# AGENTS.md — 운동 기록 앱 작업 가이드

> **공통 규칙**: AI의 응답은 간결한 경어체로 작성합니다.
> 이 문서는 gym 고유 규칙만 담는다. 코드 구조는 소스를 직접 읽어서 확인한다.
> 공통 규칙(트랙 판단, 작업지시서 형식, Claude Code 규칙, 디버깅 프로토콜)은
> https://raw.githubusercontent.com/leftjap/opus/main/common-rules.md 를 따른다.

---

## 0. 파일 업로드 기준

| 작업 유형 | 필요 파일 | 추가 확인 가능 |
|---|---|---|
| CSS만 변경 | style.css | — |
| JS 함수 수정 | 해당 JS | 호출 관계 파일 |
| 홈 화면 UI | ui.js + style.css | storage.js, data.js |
| 운동 화면 | workout.js + style.css | data.js |
| 데이터 스키마 | storage.js + data.js | workout.js, ui.js |
| 통계 화면 | stats.js + style.css | data.js |
| 설정 화면 | settings.js + style.css | storage.js |
| 레이아웃/전환 | style.css + ui.js | index.html |
| 동기화 | sync.js | data.js |
| GAS 서버 | gas/Code.js | sync.js |

---

## 1. 파일 구조

```
index.html        — DOM 구조, 싱글 화면 레이아웃
style.css          — 전체 스타일 (모바일 우선)
js/storage.js      — LocalStorage, 상수, 유틸, 종목 마스터(EXERCISES 40종), 커스텀 종목 CRUD, 마이그레이션
js/data.js         — 세션/PR/인바디 CRUD, 통계, MET 칼로리 추정
js/ui.js           — showScreen, 홈 대시보드, 캘린더, 바텀시트, History API. ⚠️ 캘린더 터치: 짧은탭 시 DOM 교체 금지, CSS 클래스만 전환
js/workout.js      — 운동 진행 (종목 선택/추가/삭제, 세트 입력, PR, 타이머, 자동저장, 완료). ⚠️ completeSet: 맨몸 weight=0, 유산소는 completeCardio 별도
js/stats.js        — 통계 (월간 요약, 캘린더, 운동 카드, 부위 랭킹, 차트). ⚠️ selectStatsDate: renderStatsScreen 대신 renderStatsWorkoutCard만 호출
js/settings.js     — 설정, 종목 관리
js/sync.js         — GAS 동기화. ⚠️ syncFromServer 타임스탬프 '>' 엄격
js/swipe-back.js   — iOS 스와이프 뒤로가기. ⚠️ 운동 요약 화면에서 차단
js/app.js          — migrateData → restoreSession → renderHome → syncFromServer
manifest.json      — PWA 매니페스트
gas/Code.js        — 운동앱 전용 GAS 서버
```

---

## 2. gym 고유 주의사항

### 터치 핸들러 (롱프레스)
짧은 탭과 롱프레스를 touchstart/touchend에서 분기하되, 짧은 탭 시 부모 DOM 교체 금지 — 롱프레스 타이머 소실 방지. 짧은 탭은 CSS 클래스 전환.

### 운동 세션 보존
- showScreen 시 _currentSession 있으면 autoSaveSession()
- 설정 복귀 시 syncExercisesWithSettings() (새 종목 추가, 숨김 제거, 기록 보존)
- popstate에서 운동 중이면 세션 보존

### 동기화 보호 (더미 데이터 복귀 방지)
- syncFromServer 타임스탬프 비교 '>' (같으면 서버가 덮지 않음)
- 로컬 변경 → saveLastSyncTime → syncToServer
- 서버·로컬 양쪽 정리 시 양쪽 모두 확인 후 동기화

### 휴식 타이머
requestAnimationFrame + Date.now() 기반. setInterval만 의존 금지 (백그라운드 정지).

### 세션 보존 (B-13/B-14 반영)
- visibilitychange/beforeunload 시 세션 자동 저장
- 30초 간격 자동 저장
- 복원 시 운동 화면으로 자동 전환

### 작업 전 체크리스트
- [ ] 종목 카드 지난번 값 프리필이 올바른 세션?
- [ ] 타이머 Date.now() 기반?
- [ ] 세트 체크 시 자동저장?
- [ ] 완료 요약 볼륨이 워밍업 제외?
- [ ] 캘린더 도트 색상 = 부위 태그?
- [ ] estimateCalories 최신 체중?
- [ ] showScreen 전환 시 이전 화면 정리?
- [ ] 짧은 탭 DOM 교체 없이 CSS만? (롱프레스 보존)

---

## 3. 웹앱 제약

- 진동 불가 — iOS Safari Vibration API 미지원
- 백그라운드 타이머 — setInterval 정지 가능. Date.now() 복귀 재계산

---

## 4. 영향 범위 분석

시뮬레이션: ①전역 변수 ②그 변수를 읽는 함수 ③showScreen/renderHome/renderExerciseCards 정상 동작

고위험: showScreen(), renderExerciseCards(), completeSet(), finishWorkout(), init()
중위험: renderHome(), renderWeekCal(), renderLastWorkoutCard(), startWorkout(), renderWorkoutSummary()

---

## 5. 디자인 가이드

| 용도 | 변수 | 값 |
|---|---|---|
| 배경 | --bg-gray | #F5F5F5 |
| 다크 | --dark | #2D2D2D |
| 포인트 | --blue | #4A90D9 |
| 대표 포인트 | --accent | #e85040 |
| 포인트 배경 | --accent-bg | #fdf0ee |
| 보더 | --border-gray | #E0E0E0 |

부위 태그: 미선택 --light-gray+--dark, 선택 --white+--dark+그림자.
폰트: 시스템. 타이틀 600, 본문 400, 숫자 강조 700.
여백: 좌우 16~20px, 카드 간격 8~16px. 상단 max(12px,env(safe-area-inset-top)), 하단 calc(env(safe-area-inset-bottom)+8px).

---

## 6. 소스 참조

| 항목 | 값 |
|---|---|
| 배포 URL | https://leftjap.github.io/gym/ |
| GitHub raw base | https://raw.githubusercontent.com/leftjap/gym/main/ |

크롤링 제외 (항상 업로드): js/workout.js (크롤러 잘림 확인 2026-03-19), js/ui.js (크롤러 잘림 확인 2026-03-28), js/data.js (크롤링 실패 확인 2026-03-28)

---

## 7. 증상 → 의심 파일

| 증상 | 파일 |
|---|---|
| 세트 입력/완료 안 됨 | workout.js |
| PR 미감지 | data.js |
| 캘린더 도트 | ui.js + data.js |
| 타이머 | workout.js |
| 완료 요약 | workout.js + data.js |
| 홈 빈 카드 | ui.js + data.js |
| 종목 관리 | settings.js + storage.js |
| 앱 빈 화면 | app.js + storage.js |
| 동기화 실패 | sync.js |
