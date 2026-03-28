# CLAUDE.md — gym

## 실행 규칙
- 한 Step에 한 파일, 한 가지 변경
- 함수 수정 시 함수 전체를 교체. 부분 스니펫 비교 금지
- CSS 수정 시 선택자 블록 전체 교체
- "적절히", "비슷하게" 등 모호한 표현 금지
- 모든 파일 경로는 절대 경로 (C:\dev\apps\gym\)
- 커밋 메시지: [타입]: [요약] (feat/fix/chore/refactor)
- 작업 완료 후 PowerShell 팝업, alert, 알림 스크립트 사용 금지. 조용히 종료

## 반복 실패 방지
- 동일 증상 fix/style 2회 연속 실패 → 3회차 전 사용자에게 경고: "⚠️ 컨텍스트 오염 확률이 높습니다. 다른 세션에서 시도해 보세요."
- 3회 연속 실패 → 즉시 중단. 시도 내역·실패 원인·다음 방향을 정리하여 보고

## playbook.md 갱신
- 모든 작업의 커밋 전에 C:\dev\playbook\playbook.md 갱신 Step을 포함한다
- 갱신 불필요: CSS만 변경, 오타 수정

## gym 고유 주의
- gas/Code.js 수정 후 반드시 clasp push + 웹앱 재배포
- 캘린더 터치 핸들러: 짧은 탭 시 부모 DOM 교체 금지 — CSS 클래스 전환만 (롱프레스 타이머 보존)
- syncFromServer 타임스탬프 비교는 '>' 엄격. 같으면 서버가 덮지 않는다
- 휴식 타이머는 requestAnimationFrame + Date.now() 기반. setInterval 단독 금지
- js/workout.js는 크롤링하지 말고 사용자 업로드를 기다린다

## 소스 파일 확인
- 모든 소스 파일 첫 줄에 PROJECT: gym 주석이 있어야 한다
- 업로드된 파일의 PROJECT 주석이 gym과 불일치하면 즉시 중단
