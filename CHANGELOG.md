# Changelog — gym

형식: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)

## 2026-04-02 (2)

### Changed
- GAS Drive 경로 변경: getDataFile 기준점을 DriveApp.getRootFolder()/gym에서 apps/gym/으로 이동 — Drive 정리에 맞춘 경로 통일. (gas/Code.js)

## 2026-04-02

### Fixed
- 운동 화면 카드 헤더 롱프레스 시 액션시트가 touchend와 함께 닫히는 버그 수정 — showActionSheet 호출 시점을 setTimeout 콜백에서 touchend 핸들러로 이동하여 ghost click 가드 타이밍 문제 해결. [UI.고스트클릭] (js/workout.js)

### Changed
- 운동 화면 종목 네비게이션 완료 종목 취소선 제거 — 색상 변경만 유지. (style.css)

### Added
- GAS deploy.ps1에 스모크 테스트 추가 — 배포 후 GET 요청으로 정상 응답 확인, 실패 시 exit 1. (gas/deploy.ps1)
- 브라우저 탭 파비콘(favicon-32.png) 및 PWA 192px 아이콘(icon-192.png) 추가. icon.jpg에서 sharp로 리사이즈 생성. (index.html, manifest.json)

## 2026-03-31

### Added
- GAS 배포 자동화 스크립트 deploy.ps1 추가 — clasp push + deploy를 한 줄로 실행. (gas/deploy.ps1) (B-63)
- clasp 연결 설정 추가. (gas/.clasp.json) (B-63)
- GitHub Actions GAS 자동 배포 workflow — git push → clasp push → clasp deploy 자동 실행. (.github/workflows/deploy-gas.yml) (B-63)
- Golden Path 테스트 인프라 — package.json, _setup.js, pre-commit hook (B-57)
- Golden Path 테스트 영역 1: 세션 CRUD — 저장/조회/삭제/정렬 (B-57)
- Golden Path 테스트 영역 2: PR 판정 — estimate1RM/checkPR/recalcAllPRs (B-57)
- Golden Path 테스트 영역 3: 동기화 병합 — 세션 merge + PR merge + 빈 세션 필터링(L-05) (B-57)
- Golden Path 테스트 영역 4: 세트 입력 무결성 — 볼륨 계산/칼로리 추정/주간 통계/연속 운동일/종목 삭제 재계산 (B-57)
- .claude/settings.json: 자동 Edit 허용, 위험 명령 차단 (B-57)
- **B-57 Phase 3**: gym 프로젝트 보호 장치 추가
  - flush-beacon.test.js: sendBeacon 페이로드 보호 테스트 5건
  - showscreen-state.test.js: showScreen 화면 전환 상태 보호 테스트 6건
  - style.css: iOS PWA safe-area 보호 주석 8개소 삽입 (`B-57 PROTECT`)
  - AGENTS.md: safe-area 레이아웃, 휴식 타이머, showScreen, sendBeacon 보호 체크리스트 추가
  - common-rules.md: gym 변경 금지 CSS 속성 목록 등록
