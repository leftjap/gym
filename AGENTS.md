# AGENTS.md — 운동 기록 앱 작업 가이드

> **공통 규칙**: AI의 응답은 간결한 경어체로 작성합니다.
> 이 문서는 규칙만 담는다. 함수 목록, 호출 체인, 데이터 스키마는 소스 코드를 직접 읽어서 확인한다.

## 이 문서의 용도

이 문서는 AI가 코드 수정 요청을 받았을 때 따라야 하는 규칙이다.
코드 구조(함수 목록, 전역 변수, 호출 체인, 데이터 스키마)는 이 문서에 기재하지 않는다.
AI는 작업에 필요한 코드 구조를 GitHub raw URL 또는 사용자 업로드 파일에서 직접 확인한다.

**작업 흐름 요약**

1. 사용자가 이 문서를 업로드하고 수정 요청을 보낸다.
2. AI는 이 문서를 읽고 요청을 분석한다.
3. AI는 파일 구조(7번)에서 관련 파일을 특정한 뒤, GitHub raw URL로 소스를 직접 읽어 함수/변수를 확인한다. 크롤링 불가 파일(16번)은 사용자에게 업로드를 요청한다.
4. AI는 방향 확인서 또는 작업지시서를 출력한다.
5. 사용자가 작업지시서를 VS Code 에이전트에 복사해서 실행한다.
6. VS Code 에이전트는 코드 수정 → git add → git commit → git push를 모두 완료한다.

---

## 0. 작업 흐름

### 트랙 A — 즉시 진행

조건 (모두 충족): 요청이 명확 / 해법이 하나 / 영향 범위 좁음 (1~2개 파일, 고위험 함수 미포함)
→ 영향 범위 분석 후 바로 작업지시서 출력.

### 트랙 B — 방향 확인 후 진행

조건 (하나라도 해당): 해법 여러 개 / 요청 모호 / 영향 범위 넓음 (3개+ 파일, 고위험 함수) / 기존 동작 변경 가능
→ 방향 확인서 출력 → 사용자 승인 → 작업지시서 출력. 승인 후 재확인하지 않는다.

### 판단 규칙
- 트랙 A면 `[트랙 A]`, 트랙 B면 `[트랙 B]` 표기
- 애매하면 트랙 B
- 사용자가 "바로 만들어" 등 명시하면 트랙 A로 전환

### 방향 확인서 형식

```
## 방향 확인: [요청 요약]

### 요청 이해
- [1~3문장]

### 원인 분석 (버그 수정 시)
- [어디서 어떤 값이 적용되어 이런 결과가 나오는지]

### 해결 방향
- [어떤 파일의 어떤 함수를 어떻게 바꿀 것인지]

### 영향 범위
- [영향 받는 함수/변수]

### 대안 (있을 경우)
- [장단점과 함께]
```

### 파일 업로드 요청 기준

| 작업 유형 | 필요 파일 | 추가 확인 가능 |
|---|---|---|
| CSS만 변경 | style.css | — |
| JS 함수 수정 | 해당 JS | 호출 관계 파일 |
| 홈 화면 UI 변경 | ui.js + style.css | storage.js, data.js |
| 운동 화면 변경 | workout.js + style.css | data.js |
| 데이터 스키마 변경 | storage.js + data.js | workout.js, ui.js |
| 통계 화면 | stats.js + style.css | data.js |
| 설정 화면 | settings.js + style.css | storage.js |
| 레이아웃/화면 전환 | style.css + ui.js | index.html |
| 동기화 관련 | sync.js | data.js |
| GAS 서버 수정 | gas/Code.js | sync.js |

---

## 1. 작업 유형 판별

**기능 추가** — 새 기능. 기존 구조 불변.
**버그 수정** — 의도대로 동작하지 않는 것을 고침. 범위 밖 불변.
**정리(리팩토링)** — 동작 불변, 구조만 개선.

---

## 2. 작업지시서 출력 규칙

### 형식

```
⚠️ 모든 Step을 빠짐없이 순서대로 실행하세요. 특히 마지막 커밋 & 푸시 Step을 절대 생략하지 마세요.

## 프로젝트 경로 (모든 Step에서 이 절대 경로를 사용하세요)
- 프로젝트: C:\dev\apps\gym\

모든 파일은 이미 존재합니다. 새로 만들지 마세요.

## 작업지시서: [기능명 또는 수정 대상]
작업 유형: [기능 추가 / 버그 수정 / 정리]

### 영향 범위 분석
- 영향 받는 전역 변수: [목록]
- 영향 받는 함수: [목록]
- 고위험 함수 수정 여부: [있음/없음]

### Step 1
- 파일: [절대 경로]
- 위치: [함수명]
- 작업: [구체적 코드 포함]
- 교체 코드: [함수 전체]
- 영향 받는 함수: [목록]
- 완료 확인: [상태]

(Step 반복)

### Step N-1 — playbook.md 갱신 (해당 시)
- 파일: C:\dev\playbook\playbook.md
- 갱신 내용: [백로그 상태 변경 / 새 이슈 / 변경 이력]
- 커밋:
  cd "C:\dev\playbook"
  git add playbook.md
  git commit -m "update: playbook.md [요약]"
  git push origin main

### Step N — 커밋 & 푸시
  cd "C:\dev\apps\gym"
  git add -A
  git commit -m "[타입]: [요약]"
  git push origin main
- 완료 확인: push 성공

⛔ 여기서 작업을 종료하세요. 이 아래의 "최종 확인"은 사용자가 수동으로 수행합니다.

### 최종 확인
- 모바일 브라우저: [확인할 동작]
- 영향 없음 확인: [확인할 항목]
```

### Haiku를 위한 규칙

- 한 Step에 한 파일, 한 가지 변경.
- **함수 수정 시 함수 전체를 교체 코드로 제공.** 부분 스니펫 비교 금지.
- CSS 수정 시 선택자 블록 전체 제공.
- 모든 파일 경로는 절대 경로 (`C:\dev\apps\gym\js\ui.js`).
- "적절히", "비슷하게" 등 모호한 표현 금지.
- 기존 함수 수정 시 함수명과 현재 동작을 명시.

### AGENTS.md 갱신 규칙

이 문서에는 코드 구조(함수 목록, 전역 변수, 호출 체인, 스키마)를 기재하지 않으므로, 코드 변경에 따른 갱신은 원칙적으로 불필요하다.

**갱신이 필요한 경우:**
- 새 파일 추가 시 → 7번(파일 구조)에 추가
- 8번(주의사항), 11번(영향 범위)의 고위험/중위험 함수 목록 변경 시
- 운영 규칙 자체가 변경될 때

### playbook.md 갱신 규칙

모든 작업지시서의 커밋 & 푸시 Step 직전에 playbook.md 갱신 Step을 포함한다. 이 규칙은 절대 생략하지 않는다.

- 파일: `C:\dev\playbook\playbook.md`
- 크롤링 경로: `https://raw.githubusercontent.com/leftjap/playbook/main/playbook.md`
- 갱신 불필요: CSS만 변경, 오타 수정 등 백로그 외 사소한 수정

### GAS 배포 규칙

Code.js 수정 시 반드시 `clasp push` Step + 웹앱 재배포 안내를 포함한다.
GAS 배포 성공 후 Git 커밋. GAS 실패 시 클라이언트 코드도 푸시하지 않는다.

### 커밋 메시지

`[타입]: [요약]` — feat / fix / chore / refactor

### AI 응답 규칙

- 작업 규모를 부풀리지 않는다. 한 번에 할 수 있으면 묻지 않고 한 번에 한다.
- 선택지를 나열하는 것으로 끝내지 않는다. 추천 + 근거를 붙인다.
- 확신 수준: "확실합니다" / "높은 확률이지만 검증 필요" / "추측입니다".

### 파일 내용 일괄 치환

사용: VS Code Ctrl+H / PowerShell `(Get-Content) -replace`
금지: sed, tr 등 Unix 도구
PowerShell 치환 시 `[regex]::Escape()` 필수.

---

## 3. 기능 추가 시 규칙

- 새 함수 전에 기존 함수 재사용 가능 여부 확인 (소스 직접 읽기).
- 새 CSS 추가 시 같은 선택자 존재 여부 먼저 검색.
- `!important` 사용 금지.

---

## 4. 버그 수정 시 규칙

- 수정 전에 원인을 먼저 설명.
- 새 규칙 덮어쓰기 금지. 잘못된 코드를 직접 수정.

---

## 5. 정리(리팩토링) 시 규칙

- 전후 동작 동일. 파일 하나씩 진행.

---

## 6. 수정 금지 / 참고 전용 파일

- `workout.html` — 초기 시안. 참고용.
- `workout_기획서.md` — 초기 기획. 동결. 참고용.
- `INSTRUCTIONS.md` — 작업지시서 이력. 폐기. git log로 대체.

---

## 7. 파일 구조

```
index.html        — DOM 구조, 싱글 화면 레이아웃
style.css          — 전체 스타일 (모바일 우선)
js/storage.js      — LocalStorage, 상수, 유틸, 종목 마스터(EXERCISES 40종), 커스텀 종목 CRUD, 종목 아이콘, 마이그레이션
js/data.js         — 세션/PR/인바디 CRUD, 통계 함수, MET 기반 칼로리 추정
js/ui.js           — 화면 전환(showScreen), 홈 대시보드, 주간/월간 캘린더, 바텀시트, History API. ⚠️ 캘린더 터치 핸들러: 짧은탭 시 DOM 교체 금지, CSS 클래스만 전환 (롱프레스 타이머 보존)
js/workout.js      — 운동 진행 (부위 선택, 종목 카드, 세트 입력, PR 감지, 타이머, 자동저장, 완료). ⚠️ completeSet: 맨몸 weight=0 처리, 유산소는 completeCardio 별도
js/stats.js        — 통계 화면 (월간 요약, 캘린더, 운동 카드, 부위별 랭킹, 월별 차트). ⚠️ selectStatsDate: renderStatsScreen() 대신 renderStatsWorkoutCard()만 호출
js/settings.js     — 설정 화면, 종목 관리 (추가/삭제/숨김/아이콘 편집)
js/sync.js         — GAS 동기화 (save/load + 토스트). ⚠️ syncFromServer 타임스탬프 비교 '>' 엄격 (같으면 서버가 덮어쓰지 않음)
js/swipe-back.js   — iOS 스타일 스와이프 뒤로가기 (에지 30px). ⚠️ 운동 요약 화면에서 스와이프 차단
js/app.js          — 초기화 (migrateData → restoreSession → renderHome → syncFromServer)
manifest.json      — PWA 매니페스트
gas/Code.js        — 운동앱 전용 GAS 서버
```

---

## 8. 작업지시서 작성 시 주의사항

### 변경 최소화
요청 범위만 수정. "이왕 하는 김에" 금지.

### 기존 코드 스타일 유지
더 나은 스타일이 있어도 기존 방식을 따른다.

### 터치 핸들러 규칙 (교훈 — 롱프레스 관련)
짧은 탭과 롱프레스를 하나의 `touchstart/touchend` 핸들러에서 분기하되, **짧은 탭 시 부모 컨테이너의 DOM을 교체하지 않아야 롱프레스 타이머가 소실되지 않는다.** 짧은 탭은 CSS 클래스 전환으로 처리.

### 운동 세션 보존 규칙
- 화면 전환(showScreen) 시 `_currentSession`이 있으면 `autoSaveSession()` 호출.
- 설정에서 복귀 시 `syncExercisesWithSettings()` (새 종목 추가, 숨김 종목 제거, 기록 보존).
- History API `popstate`에서 운동 중이면 세션 보존.

### 동기화 보호 규칙 (교훈 — 더미 데이터 복귀 방지)
- `syncFromServer()`의 타임스탬프 비교는 `>` (엄격). 같으면 서버가 로컬을 덮어쓰지 않는다.
- 로컬 변경 → `saveLastSyncTime()` → `syncToServer()`.
- 서버와 로컬 양쪽 정리 시 반드시 양쪽 모두 확인 후 동기화.

### 휴식 타이머 규칙
- `requestAnimationFrame` 기반 + `Date.now()` 계산. `setInterval`만 의존하면 백그라운드에서 멈춤.

---

## 9. 코드 비대화 방지

- 렌더 함수 80줄 초과 시 하위 함수 분리.
- 새 기능 전에 유사 기존 함수 확인 (소스 직접 읽기).
- 새 CSS 전에 기존 클래스 재사용 가능 여부 확인.

---

## 10. 웹앱 제약사항

- **진동 불가** — iOS Safari Vibration API 미지원.
- **백그라운드 타이머** — setInterval이 멈질 수 있음. Date.now() 기반 복귀 시 재계산.

---

## 11. 영향 범위 분석 규칙

### 변경 전 시뮬레이션 질문
1. 영향 받는 전역 변수는?
2. 그 변수를 읽는 다른 함수는?
3. showScreen, renderHome, renderExerciseCards가 기존대로 동작하는가?

### 고위험 함수 (수정 시 전체 테스트)
`showScreen()`, `renderExerciseCards()`, `completeSet()`, `finishWorkout()`, `init()`

### 중위험 함수 (해당 기능 테스트)
`renderHome()`, `renderWeekCal()`, `renderLastWorkoutCard()`, `startWorkout()`, `renderWorkoutSummary()`

---

## 12. 실수 체크리스트

- [ ] 종목 카드 지난번 값 프리필이 올바른 세션 참조?
- [ ] 휴식 타이머가 Date.now() 기반인가?
- [ ] 세트 체크 시 자동저장 되는가?
- [ ] 운동 완료 요약 볼륨이 워밍업 제외 값인가?
- [ ] 캘린더 도트 색상이 부위 태그와 일치하는가?
- [ ] estimateCalories에서 최신 체중 사용?
- [ ] showScreen 전환 시 이전 화면 상태 정리?
- [ ] 짧은 탭 시 DOM 교체 없이 CSS 클래스만 전환? (롱프레스 타이머 보존)

---

## 13. 디자인 가이드

### 컬러

| 용도 | 변수 | 값 |
|---|---|---|
| 배경 | `--bg-gray` | `#F5F5F5` |
| 다크 배경 | `--dark` | `#2D2D2D` |
| 카드 | `--white` | `#FFFFFF` |
| 메인 텍스트 | `--dark` | `#2D2D2D` |
| 서브 텍스트 | `--gray` | `#6C6C6C` |
| 포인트 | `--blue` | `#4A90D9` |
| 대표 포인트 | `--accent` | `#e85040` |
| 포인트 배경 | `--accent-bg` | `#fdf0ee` |
| 비활성 | `--icon-inactive` | `#AAAAAA` |
| 보더 | `--border-gray` | `#E0E0E0` |

### 부위 태그
- 미선택: `--light-gray` 배경 + `--dark` 텍스트
- 선택: `--white` 배경 + `--dark` 텍스트 + 그림자 + 떠오름

### 폰트
시스템 폰트. 타이틀 600, 본문 400, 숫자 강조 700.

### 여백
좌우 16~20px, 카드 간격 8~16px, 카드 내부 16px.
상단: `padding-top: max(12px, env(safe-area-inset-top))`
하단: `padding-bottom: calc(env(safe-area-inset-bottom) + 8px)`

### CSS 규칙
`!important` 금지. 새 선택자 추가 전 기존 중복 검색. 같은 선택자 있으면 병합.

---

## 14. 문서 관리

| 문서 | 역할 | 상태 |
|---|---|---|
| AGENTS.md | AI 작업 가이드 (규칙만) | 활성 |
| workout_기획서.md | 초기 기획 | 동결 — 참고용 |
| INSTRUCTIONS.md | 작업지시서 이력 | 폐기 — git log |

---

## 15. 디버깅 프로토콜

### 1단계 — AI 자체 해결 (사용자 개입 0)
파일 구조(7번)에서 관련 파일 특정 → GitHub raw URL로 소스 직접 읽기 → 가설 수립 → 수정 코드 특정 → 작업지시서 출력.

### 2단계 — 1회 요청 (사용자 개입 1회)
조건: 런타임 상태(LocalStorage, DOM, 네트워크)를 알 수 없을 때.
규칙: 콘솔 명령어를 한 번에 전부 제시. 예상 결과 포함. "추가로 확인하겠습니다" 금지.

### 3단계 — 브라우저 조작 (최후 수단)

### 요청 규칙
- 소스코드로 먼저 추론. 추론으로 특정되면 스크린샷/콘솔 없이 작업지시서 출력.
- 콘솔 요청 금지: 함수 존재 여부, CSS 선택자, HTML 구조, 전역 변수 선언, 코드 로직.
- 콘솔 필요: LocalStorage 실제 데이터, 런타임 변수 값, computed style, JS 에러, 네트워크 결과.

### 증상 → 의심 파일

| 증상 | 의심 파일 |
|---|---|
| 세트 입력/완료 안 됨 | workout.js |
| PR 미감지 | data.js |
| 캘린더 도트 비정상 | ui.js + data.js |
| 타이머 안 멈춤/안 시작 | workout.js |
| 완료 요약 비정상 | workout.js + data.js |
| 홈 화면 빈 카드 | ui.js + data.js |
| 종목 추가/삭제 안 됨 | settings.js + storage.js |
| 앱 시작 빈 화면 | app.js + storage.js |
| 동기화 실패 | sync.js |

---

## 16. 소스 참조 프로토콜

### 경로

| 항목 | 값 |
|---|---|
| 배포 URL | `https://leftjap.github.io/gym/` |
| GitHub raw base | `https://raw.githubusercontent.com/leftjap/gym/main/` |

### 참조 우선순위
1순위 — 사용자 업로드 파일 (push 안 한 변경분 우선)
2순위 — GitHub raw URL 크롤링
3순위 — 사용자에게 업로드 요청 (1, 2 불가 시에만)

### 크롤링 규칙
- 4개 이하: 사용자에게 묻지 않고 크롤링
- 5개 이상: 안내 + 동시에 크롤링 시작
- 한 세션 최대 4파일 (압축 방지)

### 크롤링 제외 파일 (항상 업로드 요청)
- `js/workout.js` — 크롤러가 잘라서 반환 (2026-03-19 확인)

### 혼합 참조 주의
- 직전 작업지시서가 수정한 파일은 크롤링 대신 업로드 요청
- 파일이 잘렸으면 (닫는 괄호 없음, 예상 함수 미발견) 업로드 요청

### 컨텍스트 압축 발생 시
- 사용자에게 알림 + 재업로드 요청
- 기억 의존 금지, GitHub raw로 재확인
