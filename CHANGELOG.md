# Changelog — gym

형식: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)

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
