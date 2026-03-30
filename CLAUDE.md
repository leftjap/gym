# CLAUDE.md — gym

> 공통 실행 규칙은 opus CLAUDE.md 참조.
> 이 파일은 gym 고유 주의사항만 담는다.

## gym 고유 주의
- 캘린더 터치 핸들러: 짧은 탭 시 부모 DOM 교체 금지 — CSS 클래스 전환만 (롱프레스 타이머 보존)
- 휴식 타이머는 requestAnimationFrame + Date.now() 기반. setInterval 단독 금지
- js/workout.js는 크롤링하지 말고 사용자 업로드를 기다린다
