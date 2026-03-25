# AGENTS.md — 운동 기록 앱 작업 가이드

> **공통 규칙**: AI의 응답은 간결한 경어체로 작성합니다.

## 이 문서의 용도

이 문서는 AI가 코드 수정 요청을 받았을 때 따라야 하는 규칙이다.

**작업 흐름 요약**

1. 사용자가 이 문서를 업로드하고 수정 요청을 보낸다.
   (관련 소스 파일이 있으면 같이 업로드할 수 있지만, 필수가 아니다)
2. AI는 이 문서를 읽고 요청을 분석한다.
3. AI는 상세 맵(7번)에서 관련 파일/함수를 특정한 뒤,
   업로드된 파일이 부족하면 GitHub raw URL로 직접 크롤링한다.
   크롤링 불가 조건(21번 "소스 참조 프로토콜" 참조)에 해당하면
   사용자에게 추가 파일을 요청한다.
4. AI는 **방향 확인서**를 출력한다 (해결 방향 + 영향 범위 요약).
5. 사용자가 방향을 승인하거나 수정을 요청한다.
6. 사용자가 승인하면, AI는 영향 범위 분석을 수행하고 작업지시서를 출력한다.
7. 사용자가 작업지시서를 VS Code 에이전트에 복사해서 실행한다.
8. VS Code 에이전트는 코드 수정 → git add → git commit → git push 를 모두 완료한다.

---

## 0. 작업 흐름

### 프로토콜

AI는 사용자의 요청을 받으면, 먼저 **트랙 A(즉시 진행)** 또는 **트랙 B(방향 확인)** 중 어느 쪽인지 판단한다.

---

#### 트랙 A — 즉시 진행

**조건 (모두 충족해야 한다):**
- 요청이 명확하다 (무엇을 어떻게 바꿀지 특정할 수 있다)
- 해법이 하나뿐이다 (선택지나 트레이드오프가 없다)
- 영향 범위가 좁다 (1~2개 파일, 고위험 함수 미포함)

**예시:** CSS 값 변경, 특정 함수의 단순 버그 수정, 오타 수정

**흐름:**
1. 사용자가 이 문서를 업로드하고 수정 요청을 보낸다.
2. AI는 요청을 분석하고, 필요한 파일을 GitHub raw URL에서 직접 확인한다.
   사용자가 함께 업로드한 파일이 있으면 그것을 우선 참조한다.
   (push 안 한 로컬 변경분이 있을 수 있으므로 업로드 파일이 항상 우선)
3. AI는 영향 범위 분석을 수행하고 **바로 작업지시서를 출력한다.**

---

#### 트랙 B — 방향 확인 후 진행

**조건 (하나라도 해당하면 트랙 B):**
- 해법이 여러 개이고 선택이 필요하다
- 요청이 모호하거나 의도를 확인해야 한다
- 영향 범위가 넓다 (3개 이상 파일, 고위험 함수 포함)
- 트레이드오프가 있다 (성능 vs 가독성, 구조 변경 수반 등)
- 기존 동작이 바뀔 수 있어서 의도 확인이 필요하다

**흐름:**
1. 사용자가 이 문서를 업로드하고 수정 요청을 보낸다.
2. AI는 요청을 분석하고, 필요한 파일을 GitHub raw URL에서 직접 확인한다.
   사용자가 함께 업로드한 파일이 있으면 그것을 우선 참조한다.
   (push 안 한 로컬 변경분이 있을 수 있으므로 업로드 파일이 항상 우선)
3. AI는 **방향 확인서**를 출력한다. 작업지시서는 아직 만들지 않는다.
4. 사용자가 승인하면 ("진행해", "좋아", "만들어" 등), AI는 영향 범위 분석을 수행하고 **바로 작업지시서를 출력한다.** 재확인하지 않는다.
5. 사용자가 방향을 수정하면, AI는 수정된 방향으로 방향 확인서를 다시 출력한다.

---

#### 트랙 판단 규칙

- AI는 매 요청마다 트랙을 판단하고, 트랙 A이면 작업지시서 상단에 `[트랙 A]`를, 트랙 B이면 방향 확인서 상단에 `[트랙 B]`를 표기한다.
- 판단이 애매하면 트랙 B를 선택한다 (물어보는 쪽이 안전하다).
- 사용자가 "바로 만들어", "작업지시서 바로 줘" 등 즉시 진행을 명시하면, 트랙 B 조건이더라도 트랙 A로 전환한다.
- 사용자가 트랙 A로 출력된 작업지시서에 대해 "왜 이렇게 했어?", "다른 방법은?" 등 방향을 되묻는 경우, 방향 확인서로 전환한다.

---

### 방향 확인서 형식 (트랙 B에서만 사용)

```
## 방향 확인: [요청 요약]

### 요청 이해
- [사용자의 요청을 AI가 어떻게 이해했는지 1~3문장으로 정리]

### 원인 분석 (버그 수정일 때만)
- [어디서 어떤 값이 적용되어서 이런 결과가 나오는지]

### 해결 방향
- [어떤 파일의 어떤 함수를 어떻게 바꿀 것인지. 구체적 함수명과 변경 개요 포함]
- [변경 포인트가 여럿이면 번호로 나열]

### 영향 범위
- [영향 받는 전역 변수, 함수]

### 대안 (있을 경우)
- [다른 접근법이 있으면 장단점과 함께 제시]
```

---

### 파일 업로드 요청 기준

이 표는 AI가 GitHub raw URL에서 어떤 파일을 크롤링할지 결정하는 기준이다.
사용자가 관련 파일을 직접 업로드하면 크롤링을 생략한다.
사용자는 이 표를 몰라도 된다 — AGENTS.md와 수정 요청만 보내면 AI가 알아서 판단한다.

| 작업 유형 | 업로드해야 할 파일 | 추가 확인 가능 |
|---|---|---|
| CSS만 변경 | style.css | — |
| JS 함수 수정 | 해당 함수가 있는 JS | 호출 관계 파일 |
| 홈 화면 UI 변경 | ui.js + style.css | storage.js, data.js |
| 운동 화면 변경 | workout.js + style.css | data.js |
| 데이터 스키마 변경 | storage.js + data.js | workout.js, ui.js |
| 통계/인바디 | stats.js + style.css | data.js |
| 레이아웃/화면 전환 | style.css + ui.js | index.html |

---

## 1. 작업 유형 판별

**기능 추가** — 새로운 기능을 만든다.
**버그 수정** — 기존 기능이 의도대로 동작하지 않는 것을 고친다.
**정리(리팩토링)** — 동작을 바꾸지 않고 코드 구조를 개선한다.

---

## 2. 작업지시서 출력 규칙

### 형식

```
⚠️ 모든 Step을 빠짐없이 순서대로 실행하세요. 특히 마지막 커밋 Step을 절대 생략하지 마세요.

## 프로젝트 경로 (모든 Step에서 이 절대 경로를 사용하세요)
- 프로젝트: C:\dev\apps\gym\

모든 파일은 이미 존재합니다. 새로 만들지 마세요.

## 작업지시서: [기능명 또는 수정 대상]
작업 유형: [기능 추가 / 버그 수정 / 정리]

### 영향 범위 분석
- 영향 받는 전역 변수: [목록]
- 영향 받는 함수: [목록]
- 고위험 함수 수정 여부: [있음/없음 — 있으면 전체 흐름 테스트 필요]

### Step 1
- 파일: [절대 경로]
- 위치: [함수명]
- 작업: [정확히 무엇을 추가/수정/삭제하는지]
- 교체 코드: [함수 전체 코드 — 복사-붙여넣기만으로 완료 가능해야 한다]
- 영향 받는 함수: [이 변경으로 동작이 달라질 수 있는 다른 함수]
- 영향 받는 전역 상태: [이 변경이 읽거나 쓰는 전역 변수]
- 완료 확인: [이 단계가 끝나면 어떤 상태여야 하는지]

### Step 2
(이하 반복)

### AGENTS.md 갱신 (해당 시)
- 7번 파일별 상세 맵: [추가/삭제/변경된 함수·상수 목록]
- 8번 전역 상태 변수: [추가/삭제된 변수]
- 9번 호출 체인: [변경된 흐름]
- 10번 데이터 스키마: [변경된 필드]

### Step N — 커밋 & 푸시
- 명령어:
  ```
  cd "C:\dev\workout"
  git add -A
  git commit -m "[작업유형]: [변경 요약]"
  git push origin main
  ```
- 완료 확인: push 성공, GitHub Pages 배포 반영 (1~2분 소요)

⛔ 여기서 작업을 종료하세요. 이 아래의 "최종 확인"은 사용자가 수동으로 수행합니다.

### 최종 확인
- 모바일 브라우저: [확인할 동작]
- 영향 없음 확인: [변경하지 않았지만, 같은 상태를 사용하는 함수가 기존대로 동작하는지]

### 정리 부채 (해당 시)
- [작업 중 발견한 중복 코드나 개선 가능한 부분]
```

### 파일 경로 규칙

프로젝트 루트는 다음과 같다:

```
C:\dev\apps\gym\
```

작업지시서의 모든 Step에서 **파일 경로는 프로젝트 루트부터 시작하는 절대 경로**로 표기한다.

**표기 예시:**

| 대상 파일 | 작업지시서 표기 |
|---|---|
| index.html | `C:\dev\apps\gym\index.html` |
| style.css | `C:\dev\apps\gym\style.css` |
| js/storage.js | `C:\dev\apps\gym\js\storage.js` |
| js/data.js | `C:\dev\apps\gym\js\data.js` |
| js/ui.js | `C:\dev\apps\gym\js\ui.js` |
| js/workout.js | `C:\dev\apps\gym\js\workout.js` |
| js/stats.js | `C:\dev\apps\gym\js\stats.js` |
| js/app.js | `C:\dev\apps\gym\js\app.js` |
| AGENTS.md | `C:\dev\apps\gym\AGENTS.md` |

**규칙:**
- `파일: style.css` ❌ → `파일: C:\dev\apps\gym\style.css` ✅
- 상대 경로(`./js/ui.js`, `js/ui.js`)를 사용하지 않는다.
- 새 파일을 생성하는 경우에도 절대 경로로 표기한다.

### Haiku를 위한 코드 제공 규칙

Haiku는 한 번에 하나의 명확한 작업을 처리할 때 가장 정확하다. **부분 스니펫 비교 방식은 Haiku가 위치를 특정하지 못하는 원인이다.** 다음 규칙으로 작업지시서를 작성한다.

**코드 제공 방식 (핵심):**
- **함수 수정 시: 함수 전체를 교체 코드로 제공한다.** "현재 코드 → 변경 후 코드" 비교 방식을 사용하지 않는다. Haiku가 복사-붙여넣기만으로 완료할 수 있어야 한다.
- **CSS 수정 시: 선택자 블록 전체를 교체 코드로 제공한다.** 속성 한 줄만 바꾸더라도 해당 선택자 전체를 포함한다.
- **새 코드 추가 시: 삽입 위치를 "어떤 함수/선택자 바로 아래" 수준으로 명시하고, 추가할 코드 전체를 제공한다.**

**Step 구성 규칙:**
- 한 Step에 한 파일만 다룬다.
- 한 Step에 한 가지 변경만 한다.
- 각 Step은 이전 Step이 완료된 상태에서 독립적으로 실행 가능해야 한다.
- "적절히 추가해줘", "비슷하게 만들어줘" 같은 모호한 표현을 쓰지 않는다.
- 기존 함수를 수정할 때는 함수명과 현재 동작을 명시한다.

**금지 패턴:**
```
❌ "renderExerciseCards() 함수에서 두 줄의 순서를 바꾼다"
❌ "현재 코드: html += A; html += B; → 변경 후: html += B; html += A;"
✅ "renderExerciseCards() 함수를 아래 코드로 통째로 교체한다"
   (함수 전체 코드 제공)
```

### AGENTS.md 갱신 규칙

코드 변경으로 아래가 바뀌면 AGENTS.md 갱신 Step을 포함한다:
- 7번(파일별 상세 맵): 함수/상수 추가·삭제·이름 변경
- 8번(전역 상태 변수): 추가·삭제
- 9번(핵심 함수 호출 체인): 흐름 변경
- 10번(데이터 스키마): 필드 변경
- 6번(파일 구조): 새 파일 추가

**AI 필수 체크 — 작업지시서 코드 Step을 모두 작성한 뒤, 아래를 확인한다:**
1. 함수가 추가/삭제/이름 변경되었는가? → 7번 갱신 Step 포함
2. 전역 변수/상수가 추가/삭제되었는가? → 7번, 8번 갱신 Step 포함
3. 데이터 스키마가 변경되었는가? → 10번 갱신 Step 포함
4. 호출 체인이 바뀌었는가? → 9번 갱신 Step 포함
5. 새 파일이 추가되었는가? → 6번 갱신 Step 포함

**위 5개를 확인하지 않고 작업지시서를 출력하지 않는다.** 하나라도 해당하면 AGENTS.md 갱신 Step을 반드시 포함한다. 모두 해당하지 않으면 갱신 Step을 생략한다.

**갱신하지 않는 경우:**
- CSS만 변경하고 구조 변경이 없는 경우
- 함수 내부 로직만 수정하고 인터페이스(이름, 매개변수, 반환값)가 동일한 경우

### 파일 내용 일괄 치환 규칙

파일 내부의 문자열을 일괄 치환할 때 다음 규칙을 따른다.

**사용할 것:**
- VS Code의 Ctrl + H (찾기/바꾸기) — 가장 안전하고 확실하다.
- PowerShell의 `(Get-Content) -replace` — 스크립트 자동화가 필요할 때 사용한다.

**사용하지 않을 것:**
- `sed`, `tr` 등 Unix 텍스트 처리 도구 — Windows 환경에서 백슬래시 경로와 한글 인코딩을 올바르게 처리하지 못하며, 파이프라인 오류 시 파일 내용이 0바이트로 소실될 수 있다.

**PowerShell 치환 예시:**
```powershell
$file = 'C:\dev\apps\gym\AGENTS.md'
(Get-Content $file -Raw) -replace [regex]::Escape('찾을 문자열'), '바꿀 문자열' | Set-Content $file -NoNewline
```

**주의:** `-replace`의 첫 번째 인자는 정규식이므로, 백슬래시가 포함된 경로를 치환할 때는 반드시 `[regex]::Escape()`로 감싸야 한다.

### 작업 실패 시 AGENTS.md 처리

사용자가 작업 결과가 실패/미해결이라고 보고하면, AI는 다음 작업지시서에서:
1. 직전 작업지시서의 AGENTS.md 갱신 내용이 여전히 유효한지 확인한다.
2. 유효하지 않으면 (함수가 결국 추가되지 않았거나, 이름이 바뀌었거나, 롤백되었으면) AGENTS.md를 되돌리거나 재수정하는 Step을 포함한다.
3. 재수정 코드가 동일한 함수/변수를 유지하면 AGENTS.md는 건드리지 않는다.

### playbook.md 갱신 규칙

모든 작업지시서의 커밋 & 푸시 Step 직전에 playbook.md 갱신 Step을 포함한다.

- 파일: `C:\dev\playbook-config\playbook.md`
- 갱신 대상: 2번 백로그 표에서 해당 작업의 상태를 변경한다.
  - 완료 시: 해당 행을 삭제하고 변경 이력(7번)에 완료 기록 추가
  - 새 이슈 발견 시: 🟡 대기에 새 행 추가 (ID는 B-XX 채번)
  - 진행 상태 변경 시: 상태/메모 컬럼 갱신
- 갱신 후 별도 커밋:
  ```
  cd "C:\dev\playbook-config"
  git add playbook.md
  git commit -m "update: playbook.md [변경 요약]"
  git push origin main
  ```
- playbook.md 갱신이 불필요한 경우: CSS만 변경, 오타 수정 등 백로그에 등록된 작업이 아닌 사소한 수정

### AI 응답 규칙

- 작업 규모를 부풀리지 않는다. 한 번에 할 수 있으면 묻지 않고 한 번에 한다.
- 선택지를 나열하는 것으로 끝내지 않는다. AI의 추천을 반드시 붙이고 근거를 밝힌다.
- 확신 수준을 구분한다: "확실합니다" / "높은 확률이지만 검증 필요" / "추측입니다".
- 쉬운 방법과 올바른 방법이 있으면 올바른 방법을 추천하고 이유를 밝힌다.
- 코드 작업에서 사용자의 접근에 문제가 보이면 근거와 함께 지적한다. 단, 근거 없이 반대하지 않는다.
- 검증 강도가 "강화" 이상인 작업에서는 코드에 문제가 있다고 가정하고 찾는다.

### 커밋 & 푸시 규칙

모든 작업지시서의 마지막 Step에 커밋과 푸시를 포함한다. **푸시까지 완료해야 작업이 끝난다.**

**마지막 Step 형식:**
```
### Step N — 커밋 & 푸시
- 명령어:
  ```
  cd "C:\dev\workout"
  git add -A
  git commit -m "[작업유형]: [변경 요약]"
  git push origin main
  ```
- 커밋 메시지 형식: `[작업유형]: [변경 요약]`
- 작업유형: feat / fix / chore / refactor
- 완료 확인: `git push` 가 성공하고 에러 없이 종료되어야 한다. push 실패 시 에러 메시지를 사용자에게 보고한다.
```

---

## 3. 기능 추가 시 규칙

- 새 함수를 만들기 전에 기존 함수 중 같은 일을 하는 것이 있는지 7번(파일별 상세 맵)에서 확인한다.
- 새 CSS 규칙을 추가할 때, 같은 선택자가 이미 존재하는지 먼저 검색한다.
- `!important`는 사용하지 않는다.

---

## 4. 버그 수정 시 규칙

- 수정 전에 원인을 먼저 설명한다.
- 새 규칙을 추가해서 덮어쓰는 방식으로 고치지 않는다. 원래 잘못된 코드를 직접 수정한다.

---

## 5. 절대 건드리지 않는 파일

- `workout.html` — 초기 시안 파일. 참고용.
- `workout_기획서.md` — 초기 기획 문서. 동결. 참고용.
- `INSTRUCTIONS.md` — 작업지시서 이력. 폐기. git log로 대체.

---

## 6. 파일 구조

```
index.html        — DOM 구조, 화면 레이아웃
style.css          — 전체 스타일 (모바일 우선)
js/storage.js      — LocalStorage, 상수, 유틸, 종목 마스터 데이터
js/data.js         — 세션/PR/인바디 CRUD, 통계 함수, 칼로리 추정
js/ui.js           — 화면 전환, 대시보드, 캘린더, 히스토리 렌더링
js/workout.js      — 운동 진행 화면 (부위 선택, 세트 입력, 타이머, PR 감지)
js/stats.js        — 통계 차트, 인바디 기록 UI
js/settings.js     — 설정 화면, 종목 관리 (추가/삭제/숨김)
js/sync.js         — GAS 서버 동기화 (자동 저장/불러오기, 토스트 알림)
js/swipe-back.js   — iOS 스타일 커스텀 스와이프 뒤로가기 (에지 30px)
js/app.js          — 초기화, 진입점
manifest.json      — PWA 매니페스트 (앱 이름, 아이콘, 테마 색상)
icon.jpg           — 앱 아이콘 (고릴라)
AGENTS.md        — AI 작업 가이드 (이 파일)
gas/Code.js        — 운동앱 전용 GAS 서버
```

---

## 7. 파일별 상세 맵

### js/storage.js
**역할:** 앱의 기반 유틸리티. 다른 모든 JS보다 먼저 로드된다.

**전역 상수:**
- `K` — LocalStorage 키 객체 (sessions, prs, inbody, settings, customExercises, hiddenExercises)
- `BODY_PARTS` — 부위 그룹 배열 [{id, name, color, bg}, ...] (chest, back, lower, shoulder, arms, etc)
- `EQUIPMENT` — 장비 타입 객체 {barbell, dumbbell, machine, cable, bodyweight, cardio}
- `EXERCISES` — 종목 마스터 배열 [{id, name, bodyPart, equipment, defaultSets, defaultReps, defaultWeight, defaultRestSec, met, sortOrder, icon}, ...] (40종목, icon은 기본 아이콘 URL)

**유틸 함수:**
- `L(key)` / `S(key, val)` — LocalStorage 읽기/쓰기
- `today()`, `getLocalYMD(date)`, `getWeekStartDate()` — 날짜 유틸
- `formatDuration(min)`, `formatDate(dateStr)`, `formatDateShort(dateStr)`, `getYM(dateStr)` — 날짜 포맷
- `getDaysInMonth(ym)`, `getFirstDayOfMonth(ym)` — 캘린더 헬퍼
- `formatNum(n)` — 숫자 포맷 (천단위 콤마)
- `genId()` — 고유 ID 생성

**종목 조회:**
- `getExercise(id)` — ID로 종목 조회 (기본 + 커스텀)
- `getExercisesByPart(partId)` — 부위별 종목 목록 (기본 숨김 제외 + 커스텀, sortOrder 정렬)
- `getBodyPart(id)` — 부위 정보 조회

**커스텀 종목 CRUD:**
- `getCustomExercises()` — 커스텀 종목 전체 목록
- `addCustomExercise(exercise)` — 커스텀 종목 추가 (id 자동 생성)
- `deleteCustomExercise(id)` — 커스텀 종목 삭제

**기본 종목 숨김:**
- `getHiddenExercises()` — 숨긴 기본 종목 ID 배열
- `toggleHideExercise(id)` — 기본 종목 숨김 토글
- `isExerciseHidden(id)` — 숨김 여부 확인
- `isCustomExercise(id)` — 커스텀 종목 여부 확인 (id가 'custom_'으로 시작)

**종목 아이콘 관리:**
- `getExerciseIcons()` — 전체 아이콘 맵 반환 { exerciseId: url }
- `setExerciseIcon(exerciseId, url)` — 종목 아이콘 URL 설정 (빈값이면 삭제)
- `getExerciseIcon(exerciseId)` — 종목 아이콘 URL 반환 (커스텀 → 기본 순서로 폴백, 없으면 빈 문자열)

**더미 데이터:**
- `initDummyData()` — 비활성화됨 (빈 함수)

**데이터 마이그레이션:**
- `migrateData()` — 부위 태그 변환 (daily→arms, interval→etc) + 종목 ID 변환 (situp→decline_situp, running→treadmill). wk_migrated_v2 플래그로 1회만 실행

---

### js/data.js
**역할:** 세션/PR/인바디 CRUD + 통계 함수.

**세션 CRUD:**
- `getSessions()`, `saveSessions(arr)` — 전체 세션 읽기/쓰기
- `getSession(id)` — 단일 세션 조회
- `saveSession(session)` — 세션 저장 (신규/업데이트, 날짜 내림차순 정렬)
- `deleteSession(id)` — 세션 삭제

**PR 관리:**
- `getPRs()`, `savePRs(obj)` — PR 데이터 읽기/쓰기
- `estimate1RM(weight, reps)` — Epley 공식 추정 1RM
- `checkPR(exerciseId, weight, reps, sessionId)` — PR 여부 판정 + 갱신. 반환: {isPR, type, prevBest}
- `getExercisePRs(exerciseId)` — 종목별 PR 히스토리
- `getRecentPRs(count)` — 최근 PR 목록

**인바디:**
- `getInbodyRecords()`, `saveInbodyRecords(arr)` — 인바디 읽기/쓰기
- `addInbodyRecord(record)` — 인바디 기록 추가
- `getLatestWeight()` — 최신 체중 (칼로리 계산용, 기본값 70)

**통계:**
- `getWeekSummary()` — 이번 주 요약 {count, volume, duration, calories}
- `getMonthSummary(ym)` — 월간 요약
- `getStreak()` — 연속 운동 일수
- `getSessionsByMonth(ym)` — 월별 세션 목록
- `getSessionsByDate(dateStr)` — 특정 날짜 세션 목록
- `estimateCalories(session)` — MET 기반 칼로리 추정
- `getLastSimilarSession(tags)` — 같은 부위 조합의 최근 세션
- `getLastExerciseSets(exerciseId)` — 특정 종목의 마지막 세트 데이터
- `getLastSession()` — 가장 최근 세션 반환
- `getDayVolume(dateStr)` — 특정 날짜의 총 볼륨
- `getThisWeekVolume()` — 이번 주 총 볼륨 (월~오늘)
- `getLastWeekVolumeAtSamePoint()` — 지난주 같은 시점까지의 볼륨
- `getLastWeekTotalVolume()` — 지난주 전체 볼륨 (월~일)
- `hasPROnDate(dateStr)` — 특정 날짜에 PR이 있었는지 확인
- `getMonthDayVolumes(ym)` — 특정 월의 날짜별 볼륨 맵 반환
- `getMonthPRDates(ym)` — 특정 월의 날짜별 PR 여부 맵 반환
- `getMonthPartVolumes(ym)` — 특정 월의 부위별 총 볼륨 랭킹 반환 [{partId, partName, volume, percentage, color}]
- `getRecentMonthlyVolumes(count, baseYM)` — 최근 N개월의 월별 총 볼륨 반환 [{ym, month, volume, isCurrent}]
- `getMonthExerciseVolumes(ym)` — 특정 월의 운동종목별 총 볼륨 랭킹 반환 [{exerciseId, name, volume, percentage}]

---

### js/ui.js
**역할:** 화면 전환, 대시보드 렌더링, 캘린더, 주간 캘린더 선택.

**화면 전환:**
- `showScreen(screenId, historyAction)` — **핵심 함수**. 화면 전환 ('home'|'workout'|'stats'|'settings'). historyAction: 'push'(기본)/'replace'/'none'
- `startWorkoutFlow()` — 운동 화면으로 전환

**홈 화면:**
- `renderHome()` — 주간 캘린더 + 요약 메시지 + 직전 운동 카드 렌더
- `renderWeekCal()` — 주간 캘린더 (요일 + 날짜 + 볼륨 + PR 표시 + 선택 상태)
- `selectWeekDate(dateStr)` — 주간 캘린더 날짜 선택 + 재렌더
- `renderSummaryMsg()` — 이번 주 총 볼륨 + 지난주 비교 메시지 (월요일 특별 처리)
- `renderLastWorkoutCard()` — 선택된 날짜(또는 가장 최근) 운동 카드 렌더

**월간 캘린더:**
- `renderMonthCal()` — 월간 캘린더 (부위 컬러 도트)

**바텀시트:**
- `openBottomSheet(dateStr)` — 날짜별 세션 상세 바텀시트
- `closeBottomSheet()` — 바텀시트 닫기

**월 이동:**
- `changeMonth(delta)` — 월 전환
- `updateMonthTitle()` — 월 타이틀 업데이트

**커스텀 모달:**
- `showConfirm(message, onResult)` — 확인 모달 표시
- `hideConfirm(result)` — 모달 닫기 + 콜백 실행

**하단 버튼:**
- `updateBottomButton(state)` — 하단 고정 버튼 상태 ('start'|'partSelect'|'partSelectReady'|'workout'|'summary')
- `onBottomBtnClick()` — 하단 버튼 클릭 시 상태에 따라 분기

**History API:**
- `popstate 리스너` — 브라우저 뒤로 가기 시 화면 전환 처리 (운동 중이면 세션 보존, 설정→운동 복귀 시 종목 동기화)

---

### js/workout.js
**역할:** 운동 진행 화면의 핵심 로직.

**부위 선택:**
- `renderWorkoutScreen()` — 운동 화면 진입 (세션 유무에 따라 부위 선택 또는 세트 입력)
- `renderPartSelector()` — 부위 태그 선택 UI
- `togglePart(partId)` — 부위 선택/해제 토글
- `renderWorkoutTimeline()` — 선택된 부위 세로 타임라인 렌더
- `startWorkout()` — 선택 확정, 세션 생성, 타이머 시작

**종목/세트:**
- `renderExerciseCards()` — 현재 종목 카드 + 전체 종목 버튼바 렌더 + 롱프레스 바인딩
- `renderExerciseNav()` — 전체 종목 네비게이션 버튼바 (현재 종목 active, 완료 종목 done)
- `bindNavLongPress()` — 종목 네비 버튼 롱프레스 바인딩 (종목 완료 확인)
- `switchExercise(exIdx)` — 종목 전환
- `showExerciseListSheet()` — 전체 종목 목록 액션시트 표시 (현재 종목 강조, 완료 종목 체크)
- `renderExerciseCard(exIdx)` — 단일 종목 카드 (카드헤더 + 동기부여 문구 + 진행 바 + 세트) — bodyweight/cardio 분기
- `renderSetProgress(todayVol, lastVol, lastSetCount, doneCount)` — 웨이트 종목용 진행 바
- `renderBodyweightProgress(todayReps, lastTotalReps, lastSetCount, doneCount)` — 맨몸 종목용 진행 바 (횟수 기준)
- `renderSetRow(exIdx, setIdx)` — 세트 행 (웨이트/맨몸 분기, 맨몸은 KG 칼럼 숨김)
- `renderDoneSetsSummary(exIdx, isBodyweight)` — 완료 세트를 1줄 칩으로 접어서 표시 (탭하면 펼침)
- `toggleDoneSets(exIdx)` — 완료 세트 펼침/접힘 토글
- `addSet(exIdx)` — 세트 수동 추가 (마지막 세트의 값을 복사)
- `completeExercise(exIdx)` — 종목 완료 처리 (미완료 세트 제거) + 다음 미완료 종목으로 자동 이동
- `toggleExCard(exIdx)` — 카드 접기/펼치기
- `completeSet(exIdx, setIdx)` — 세트 완료 처리 → PR 감지 + 타이머 + 자동 세트 추가 (맨몸/유산소 weight 처리)
- `completeCardio(exIdx)` — 유산소 완료 처리
- `getWeightDelta(exerciseId)` — 장비 타입별 중량 증감 단위
- `adjustSetValue(exIdx, setIdx, field, direction)` — ＋/－ 버튼 증감

**경과 타이머:**
- `startWorkoutTimer()`, `updateWorkoutTimerDisplay()` — 운동 경과 시간
- `updateWorkoutHeader(inProgress)` — 헤더 타이머/태그 표시

**휴식 타이머:**
- `startRestTimer(seconds)` — 휴식 타이머 시작
- `renderRestTimer()` — requestAnimationFrame 기반 표시
- `dismissRestTimer()` — 타이머 수동 종료

**PR:**
- `showPRFlash(exIdx, setIdx, prResult)` — PR 토스트

**자동저장/완료:**
- `autoSaveSession()` — 볼륨 계산 + 임시 저장
- `finishWorkout()` — 세션 저장, 완료 요약 표시
- `renderWorkoutSummary(session)` — 완료 요약 카드

**복원/취소:**
- `restoreSession()` — 앱 복귀 시 진행 중 세션 복원
- `onWorkoutBack()` — 헤더 뒤로가기 핸들러
- `cancelWorkout()` — 운동 취소
- `syncExercisesWithSettings()` — 설정 변경 후 운동 복귀 시 세션 종목 동기화 (새 종목 추가, 숨김 종목 제거, 기록 있는 종목 보존)

---

### js/stats.js
**역할:** 통계/기록 화면 전체.

**화면 렌더:**
- `renderStatsScreen()` — 통계 화면 전체 렌더 (헤더 + 요약 + 캘린더 + 운동 카드 + 히어로 랭킹 + 월별 차트)
- `renderStatsHeader()` — 헤더 (뒤로가기 + 월 이동)
- `renderStatsSummary()` — 월간 요약문
- `renderStatsMonthCal()` — 월간 캘린더 (주간 캘린더 스타일, 볼륨/PR 표시)
- `renderStatsWorkoutCard()` — 선택된 날짜의 운동 카드 (세션 병합)
- `renderStatsHeroRanking()` — 부위별 볼륨 랭킹 (1위 한 줄 + 2~7위 2열 그리드)
- `renderStatsMonthlyChart()` — 월별 볼륨 바 차트 (최근 6개월, 현재 월 포인트 컬러)

**월 이동/날짜 선택:**
- `changeStatsMonth(delta)` — 월 전환
- `selectStatsDate(dateStr)` — 캘린더 날짜 선택

---

### js/settings.js
**역할:** 설정 화면 UI, 종목 관리 (추가/삭제/숨김 토글).

**설정 화면:**
- `renderSettings()` — 설정 화면 전체 렌더 (헤더 + 부위 탭 + 종목 목록 + 추가 버튼)
- `openSettingsForPart(partId)` — 특정 부위를 선택한 상태로 설정 화면 열기 (운동 화면에서 호출)
- `goBackFromSettings()` — 설정 화면 뒤로가기 (운동 중이면 workout으로, 아니면 home으로 복귀)
- `selectSettingsPart(partId)` — 부위 탭 전환
- `renderSettingsExerciseList()` — 부위별 종목 목록 (기본 + 커스텀, 숨김 표시)

**종목 관리:**
- `onToggleHideExercise(id)` — 기본 종목 숨김 토글 핸들러
- `onDeleteCustomExercise(id)` — 커스텀 종목 삭제 핸들러

**종목 추가 폼:**
- `openAddExerciseForm()` — 종목 추가 폼 열기
- `selectEquipmentTab(btnEl, eq)` — 장비 탭 선택
- `saveNewExercise()` — 새 종목 저장
- `closeAddExerciseForm()` — 폼 닫기

**종목 아이콘 편집:**
- `openEditExerciseIconForm(exerciseId)` — 기본/커스텀 종목 아이콘 편집 폼 열기
- `saveExerciseIcon(exerciseId)` — 아이콘 URL 저장
- `closeEditExerciseIconForm()` — 편집 폼 닫기
- `previewEditIcon()` — 아이콘 URL 입력 시 실시간 미리보기

---

### js/sync.js
**역할:** GAS(Google Apps Script) 서버와의 양방향 데이터 동기화.

**핵심 함수:**
- `syncToServer(callback)` — LocalStorage 데이터를 GAS 서버에 저장 (POST /save)
  - 저장 전: `showSyncStatus('saving')`
  - 저장 후: `showSyncStatus('saved')` 또는 `showSyncStatus('error')`
- `syncFromServer(callback)` — GAS 서버에서 데이터 불러오기 (POST /load)
  - 첫 사용 감지: 서버가 비어있고 로컬에 데이터 있으면 자동 업로드
  - 불러온 후: `showSyncStatus('loaded')` 또는 `showSyncStatus('error')`
- `showSyncStatus(status)` — 토스트 알림 표시 (saving, saved, loading, loaded, error)
  - 성공/오류 상태는 2초 후 자동 소멸

**통합 지점:**
- 운동 완료 후: `finishWorkout()` → `syncToServer()` 자동 호출
- 앱 초기화: `init()` → `syncFromServer()` 자동 호출
- 설정 화면: 수동 동기화 버튼 (서버에 저장 / 서버에서 불러오기)

---

### js/swipe-back.js
**역할:** iOS 스타일 커스텀 스와이프 뒤로가기. 왼쪽 에지(30px)에서 시작하는 터치를 감지하여 화면 전환 애니메이션 + 뒤로가기 실행.

**설정 상수:**
- `EDGE_WIDTH` (30) — 왼쪽 가장자리 인식 영역
- `THRESHOLD` (0.35) — 화면 너비의 35% 이상 밀면 확정
- `PEEK_OFFSET` (80) — 뒤 화면 시작 오프셋

**핵심 함수:**
- `getSwipeableScreen()` — 스와이프 가능 판단. 요약(.workout-summary) → null(차단). 홈(main-view) → null(차단). stats/settings/workout → 해당 정보 반환.
- `onTouchStart(e)` — 에지 터치 감지, 스와이프 대상 결정
- `onTouchMove(e)` — 수평 스와이프 시 translateX 애니메이션
- `onTouchEnd(e)` — THRESHOLD 이상이면 확정 → goBackFromSettings()/onWorkoutBack()/showScreen('home') 호출
- `cleanup()` — 애니메이션 클래스/스타일 초기화

---

### js/app.js
**역할:** 앱 초기화, 진입점.

**초기화:**
- `init()` — 마이그레이션 → 세션 복원 → 월 설정 → 홈 표시 → 서버 동기화(성공 시 홈 갱신)
- `window.onload` → `init()`

---

## 8. 전역 상태 변수 목록

| 변수명 | 파일 | 역할 |
|---|---|---|
| activeScreen | ui.js | 현재 화면 ID (미사용, showScreen 내부에서 직접 관리) |
| _isPopState | ui.js | popstate 핸들러 실행 중 플래그 |
| _currentYM | ui.js | 현재 선택된 월 (YYYY-MM) |
| _bottomSheetOpen | ui.js | 바텀시트 열림 상태 |
| _selectedWeekDate | ui.js | 주간 캘린더에서 선택된 날짜 (기본: 오늘) |
| _confirmCallback | ui.js | 확인 모달 콜백 함수 |
| _bottomBtnState | ui.js | 하단 고정 버튼 현재 상태 |
| _currentSession | workout.js | 진행 중인 세션 객체 |
| _selectedParts | workout.js | 선택된 부위 ID 배열 |
| _restTimer | workout.js | 휴식 타이머 상태 {endTime} |
| _restAnimFrame | workout.js | 휴식 타이머 requestAnimationFrame ID |
| _workoutStartTime | workout.js | 운동 시작 시각 (Date.now()) |
| _workoutTimerInterval | workout.js | 운동 경과 타이머 setInterval ID |
| _currentExerciseIndex | workout.js | 현재 보고 있는 종목 인덱스 |
| _isFinishing | workout.js | finishWorkout 중복 실행 방지 플래그 |
| _statsYM | stats.js | 통계 화면에서 보고 있는 월 (YYYY-MM) |
| _statsSelectedDate | stats.js | 통계 화면 캘린더에서 선택된 날짜 |
| _settingsSelectedPart | settings.js | 설정 화면에서 선택된 부위 ID (기본: 'chest') |
| _settingsReturnTo | settings.js | 설정 화면 뒤로가기 시 돌아갈 화면 ('workout' 또는 null) |
| _selectedEquipment | settings.js | 종목 추가 폼에서 선택된 장비 (기본: 'barbell') |
| GAS_URL | sync.js | GAS 서버 엔드포인트 URL (Google Apps Script) |
| GAS_TOKEN | sync.js | GAS 서버 인증 토큰 (보안: 향후 개선 필요) |
| _syncInProgress | sync.js | 동기화 진행 중 플래그 (중복 실행 방지) |

---

## 9. 핵심 함수 호출 체인

### 운동 시작 ~ 완료 흐름
```
onBottomBtnClick() → startWorkoutFlow() → showScreen('workout')
→ renderWorkoutScreen() → renderPartSelector()
→ [사용자가 부위 태그 탭] togglePart(partId)
→ [START 버튼] startWorkout() → _currentSession 생성 + startWorkoutTimer()
→ renderExerciseCards()
  → renderExerciseCard(_currentExerciseIndex)
    → renderSetProgress() + renderSetRow() × N
  → renderExerciseNav() (전체 종목 버튼바, 하단)
→ [사용자가 세트 체크] completeSet(exIdx, setIdx)
  → checkPR() → PR이면 showPRFlash()
  → startRestTimer(seconds) → renderRestTimer()
  → autoSaveSession()
  → 모든 세트 완료 시 새 세트 자동 추가
  → renderExerciseCards()
→ [FINISH 버튼] finishWorkout()
  → estimateCalories(session)
  → saveSession(session)
  → renderWorkoutSummary(session)
→ [DONE 버튼] showScreen('home')
```

### 홈 화면 렌더
```
showScreen('home')
→ renderHome()
  → renderSummaryMsg() → getThisWeekVolume(), getLastWeekVolumeAtSamePoint()
    → [캘린더 아이콘] showScreen('stats')
    → [톱니바퀴 아이콘] showScreen('settings')
  → renderWeekCal() → getDayVolume(), hasPROnDate()
  → renderLastWorkoutCard() → getSessionsByDate(), getLastSession()
```

### 통계 화면
```
showScreen('stats')
→ renderStatsScreen()
  → renderStatsHeader()
  → renderStatsSummary() → getMonthSummary(_statsYM)
  → renderStatsMonthCal() → getMonthDayVolumes(_statsYM), getMonthPRDates(_statsYM)
  → renderStatsWorkoutCard() (선택된 날짜가 있으면)
    → getSessionsByDate(_statsSelectedDate)
→ [월 이동 화살표] changeStatsMonth(delta) → renderStatsScreen()
→ [날짜 탭] selectStatsDate(dateStr) → renderStatsScreen()
→ [뒤로] showScreen('home')
```

### 설정 화면
```
showScreen('settings')
→ renderSettings()
  → renderSettingsExerciseList()
    → getHiddenExercises(), getCustomExercises()
→ [숨김 토글] onToggleHideExercise(id) → toggleHideExercise(id) → renderSettings()
→ [삭제] onDeleteCustomExercise(id) → showConfirm() → deleteCustomExercise(id) → renderSettings()
→ [종목 추가] openAddExerciseForm() → saveNewExercise() → addCustomExercise() → renderSettings()
→ [뒤로] goBackFromSettings() → history.back() → popstate 이벤트
```

### 브라우저 뒤로 가기 (History API)
```
[모바일 스와이프 / 뒤로 버튼]
→ popstate 이벤트
  → state.screen에 따라 showScreen(targetScreen, 'none')
  → workout 복귀 시: syncExercisesWithSettings() (설정에서 온 경우)
  → home 복귀 시: autoSaveSession() (운동 진행 중이면)

화면 전환 히스토리 액션:
  - 일반 전환: pushState (앞으로 쌓기)
  - 최초 진입 / 운동 완료 / 취소 / 수정 완료: replaceState (현재 대체)
  - popstate 핸들러: none (히스토리 조작 안 함)
```

---

## 10. 데이터 스키마

### 세션 로그 (K.sessions)
```
{ id, date, startTime, endTime,
  tags: ['lower', 'shoulder', 'daily', 'interval'],
  exercises: [
    { exerciseId, sortOrder, sets: [
      { weight, reps, done, isPR, restSec }
    ]}
  ],
  totalVolume, totalVolumeExWarmup,
  totalCalories, durationMin, memo }
```

### PR 기록 (K.prs)
```
{ "exerciseId": [
  { weight, reps, volume, estimated1RM, date, sessionId }
]}
```

### 인바디 기록 (K.inbody)
```
[{ id, date, weight, bodyFatPct, muscleMass, memo }]
```

### 종목 아이콘 (K.exerciseIcons)
```
{ "exerciseId": "https://example.com/icon.png", ... }
```

---

## 11. 웹앱 제약사항

- **진동 불가** — iOS Safari Vibration API 미지원
- **백그라운드 타이머** — setInterval이 멈플 수 있음. Date.now() 기반으로 복귀 시 남은 시간 재계산
- **소리 제한** — 1차에서 소리 미포함

---

## 12. 코드 비대화 방지 규칙

### 함수 크기 제한
렌더 함수가 80줄을 넘으면, 독립된 하위 함수로 분리한다. 새 섹션을 추가할 때는 반드시 별도 렌더 함수로 만든다.

### 중복 함수 탐지
작업지시서를 작성하기 전에, 추가하려는 기능과 유사한 기존 함수가 있는지 반드시 7번(파일별 상세 맵)에서 확인한다.

### CSS 증가 억제
새 컴포넌트의 CSS를 추가할 때, 기존 컴포넌트의 클래스를 재사용할 수 있는지 먼저 확인한다.

### 정리 부채 기록
기능 추가 작업지시서에서 중복 코드를 발견하면, 하단에 "정리 부채" 항목으로 기록한다.

---

## 13. 자주 겪는 실수 체크리스트

작업지시서 작성 전 해당 항목을 확인한다.

- [ ] 종목 카드에서 지난번 값 프리필이 올바른 세션을 참조하는가?
- [ ] 워밍업 세트가 PR 판정과 볼륨 집계에서 제외되는가?
- [ ] 휴식 타이머가 Date.now() 기반인가? (setInterval만 의존하면 안 됨)
- [ ] 세트 체크 시 자동저장이 되는가? (앱 꺼져도 데이터 유지)
- [ ] 운동 완료 요약의 볼륨이 워밍업을 제외한 값인가?
- [ ] 캘린더 도트 색상이 부위 태그와 일치하는가?
- [ ] estimateCalories에서 최신 체중을 사용하는가?
- [ ] showScreen의 화면 전환 시 이전 화면 상태가 정리되는가?

---

## 14. 영향 범위 분석 규칙

### 변경 전 시뮬레이션 질문

1. 이 변경이 영향을 주는 전역 변수는 무엇인가?
2. 그 전역 변수를 읽는 다른 함수는 어디에 있는가?
3. showScreen, renderHome, renderExerciseCards가 기존대로 동작하는가?

### 고위험 함수 (수정 시 전체 테스트)
- `showScreen()`, `renderExerciseCards()`, `completeSet()`, `finishWorkout()`, `init()`

### 중위험 함수 (해당 기능 테스트)
- `renderHome()`, `renderWeekCal()`, `renderLastWorkoutCard()`, `startWorkout()`, `renderWorkoutSummary()`

---

## 15. 디자인 가이드

### 컬러

| 용도 | 변수/값 | 색상 |
|---|---|---|
| 배경 | `--bg-gray` | `#F5F5F5` |
| 다크 배경 | `--dark` | `#2D2D2D` |
| 카드 배경 | `--white` | `#FFFFFF` |
| 카드 그림자 | — | `0 1px 3px rgba(0,0,0,0.08)` |
| 메인 텍스트 | `--dark` | `#2D2D2D` |
| 서브 텍스트 | `--gray` | `#6C6C6C` |
| 포인트 (유일한 컬러) | `--blue` | `#4A90D9` |
| 대표 포인트 | `--accent` | `#e85040` (Bear 레드) |
| 포인트 연한 배경 | `--accent-bg` | `#fdf0ee` |
| 비활성 | `--icon-inactive` | `#AAAAAA` |
| 보더 | `--border-gray` | `#E0E0E0` |
| 라이트 그레이 | `--light-gray` | `#F0F0F0` |

### 부위 태그 스타일
- 미선택: `--light-gray` 배경 + `--dark` 텍스트
- 선택: `--white` 배경 + `--dark` 텍스트 + 그림자 + 위로 떠오름

### 폰트
- 기본: 시스템 폰트 (-apple-system, BlinkMacSystemFont, ...)
- 카드 타이틀: `font-weight: 600`
- 본문: `font-weight: 400`
- 숫자 강조: `font-weight: 700`

### 여백
- 좌우 패딩: 16~20px
- 카드 간격: 8~16px
- 카드 내부 패딩: 16px
- 상단: `padding-top: max(12px, env(safe-area-inset-top))`
- 하단: `padding-bottom: calc(env(safe-area-inset-bottom) + 8px)`

### CSS 규칙
- `!important` 사용 금지
- 새 선택자 추가 전 기존 선택자 중복 검색 필수
- 같은 선택자가 있으면 병합, 파일 하단에 덧붙이지 않음

---

## 16. 문서 관리 규칙

### 문서 목록과 역할

| 문서 | 역할 | 수정 권한 | 상태 |
|---|---|---|---|
| AGENTS.md | AI 작업 가이드. 코드 구조 맵, 작업 규칙 | AI가 작업지시서 Step으로 수정 | 활성 — 항상 최신 유지 |
| workout_기획서.md | 초기 기획 의도 기록 | 수정하지 않음 | 동결 — 참고용 |
| INSTRUCTIONS.md | 작업지시서 이력 | 사용하지 않음 | 폐기 — git log로 대체 |

### 핵심 원칙
7번(파일별 상세 맵)이 항상 최신이면 AI는 구조를 정확히 파악할 수 있다.

### 동결 문서 규칙
- `workout_기획서.md`와 `INSTRUCTIONS.md`는 어떤 작업지시서에서도 수정 Step을 만들지 않는다.
- 기획 의도를 확인해야 할 때는 기획서를 참조하되, 현재 코드와 다른 부분은 AGENTS.md와 실제 코드를 기준으로 판단한다.

---

## 17. 디버깅 가이드

### 디버깅 프로토콜 (사용자 개입 최소화)

**1단계 — AI 자체 해결 (사용자 개입 0)**

a. AGENTS.md 상세 맵(7번)에서 관련 함수/전역 변수를 특정한다.
b. 업로드된 소스 또는 GitHub raw URL에서 해당 함수의 로직을 추적한다.
c. 호출 체인(9번)과 전역 상태(8번)로 데이터 흐름을 시뮬레이션한다.
d. 가설을 세우고, 그 가설이 맞다면 어떤 코드를 수정해야 하는지까지 특정한다.
e. 배포 URL(https://leftjap.github.io/gym/)로 접속 상태를 확인한다 (200 vs 404).

→ 가설이 1개로 좁혀지고 수정 코드를 특정할 수 있으면 바로 작업지시서 출력.

**2단계로 넘어가는 조건 (하나라도 해당):**
- 코드를 읽어도 런타임 상태(LocalStorage 실제 값, DOM 현재 상태)를 알 수 없어서 가설을 검증할 수 없다.
- 가설이 2개 이상이고 코드만으로 좁힐 수 없다.
- 코드상 문제가 없는데 사용자가 문제가 있다고 보고한다 (환경/데이터 이슈 가능성).

**2단계 — 1회 요청 (사용자 개입 1회)**

규칙:
- 필요한 콘솔 명령어를 한 번에 전부 제시한다 (쪼개서 여러 번 금지).
- "아래 명령어를 전부 실행하고 결과를 통째로 보내주세요" 형태로 요청한다.
- 결과 전달 방식 안내를 반드시 포함한다:
  "콘솔 출력을 텍스트로 복사해서 보내주세요.
   출력이 길면 마지막 20줄만 보내도 됩니다.
   텍스트 복사가 어려우면 스크린샷도 괜찮습니다."
- 분기 판단을 사용자에게 맡기지 않는다.
  조건부 실행이 필요한 경우에도 전부 실행하도록 제시하고,
  결과를 받은 뒤 AI가 어느 분기인지 판단한다.
- 명령어 제시 시 예상 결과도 함께 안내한다
  ("정상이면 이렇게 나오고, 문제가 있으면 이렇게 나옵니다").

→ 사용자는 1회 복붙 + 1회 결과 전달로 끝.

**3단계 — 브라우저 조작 요청 (최후 수단)**

조건: 1, 2단계 모두 불가.
규칙: 최소 단계로 구성, 왜 필요한지 이유 명시.

### 스크린샷 요청 규칙
- AI가 소스코드로 먼저 추론한다.
- 추론만으로 원인 특정되면 스크린샷 없이 작업지시서 출력.
- 필요할 것 같으면 먼저 텍스트 설명을 요청한다
  ("화면에 어떻게 보이나요? 어떤 요소가 안 보이거나 위치가 다른가요?").
- 텍스트로 파악 가능하면 스크린샷 요청하지 않는다.
- 스크린샷은 텍스트로도 판단 불가한 경우에만 요청.

### 콘솔 요청 규칙
- 1단계(AI 자체 해결)를 반드시 먼저 수행한다.
- 콘솔 명령어가 필요하면 한 번에 전부 제시한다.
- "이 결과를 보고 추가로 확인하겠습니다" 패턴 금지.
- 명령어 제시 시 예상 결과도 함께 안내.

### 콘솔 요청 금지 조건

다음은 AI가 소스코드 또는 GitHub raw URL로 직접 확인할 수 있는 항목이다.
이 항목들에 대해 사용자에게 브라우저 콘솔 명령어를 요청하지 않는다.

- 함수 존재 여부, 호출 관계, 매개변수
- CSS 선택자 존재/충돌/우선순위
- HTML DOM 구조 (정적 마크업)
- 전역 변수/상수의 선언과 초기값
- 코드 내 조건 분기와 로직 흐름
- 파일 간 의존 관계 (script 로드 순서)

### 브라우저 콘솔이 필요한 유일한 경우

다음은 소스코드만으로는 알 수 없고, 실행 중인 브라우저에서만 확인 가능한 항목이다.
이 경우에만 사용자에게 브라우저 콘솔 명령어를 요청한다.

- LocalStorage에 저장된 실제 데이터 내용
- 런타임 전역 변수의 현재 값 (코드의 초기값이 아닌 실행 중 상태)
- DOM 요소의 현재 computed style, display 상태, 크기/위치
- JS 런타임 에러 메시지
- 네트워크 요청 결과 (GAS 응답 상태, 에러)
- 타이머/애니메이션의 실행 상태
- 이벤트 리스너 동작 여부 (터치/클릭 반응)

### AI가 자체 확인 가능한 항목
- 소스코드 전문 (GitHub raw URL로 JS/CSS/MD/HTML 전부 읽기 가능)
- 함수 존재 여부, 로직 흐름, 호출 관계
- CSS 선택자 존재/충돌 여부
- HTML 구조, script/link 경로
- 배포 상태 (200 vs 404)

### AI가 확인 불가능한 항목 (사용자 필요)
- JS 런타임 에러 (실행해봐야 아는 것)
- LocalStorage 데이터 상태
- GAS 동기화 네트워크 에러
- 터치/클릭 인터랙션 버그
- 타이머/애니메이션 동작
- iOS Safari 등 환경별 이슈
- 시각적 렌더링 결과 (레이아웃 깨짐의 정확한 모양)

### 콘솔 명령어 레퍼런스 (2단계 이후에만 사용)

#### LocalStorage 데이터 확인
```javascript
// 세션 목록 확인
JSON.parse(localStorage.getItem('wk_sessions')).map(s => ({id: s.id, date: s.date}))

// 특정 날짜 세션 필터
JSON.parse(localStorage.getItem('wk_sessions')).filter(s => s.date === '2026-03-16')

// 중복 데이터 삭제 (ID 지정)
var sessions = JSON.parse(localStorage.getItem('wk_sessions'));
sessions = sessions.filter(s => s.id !== '삭제할ID');
localStorage.setItem('wk_sessions', JSON.stringify(sessions));
location.reload();
```

#### 전역 변수 상태 확인
```javascript
// 운동 화면 상태
console.log('_currentSession:', _currentSession);
console.log('_restTimer:', _restTimer);
console.log('_selectedParts:', _selectedParts);
```

#### DOM 요소 확인
```javascript
// 요소 내용 확인
document.getElementById('요소ID').innerHTML
document.getElementById('요소ID').outerHTML

// 요소 위치/크기 확인
document.getElementById('요소ID').getBoundingClientRect()

// 스타일 확인
getComputedStyle(document.getElementById('요소ID')).display
```

#### 동적 요소 추적
```javascript
// DOM 변화 감시 (요소 추가/삭제 추적)
var observer = new MutationObserver(function(mutations) {
  mutations.forEach(function(m) {
    if (m.addedNodes.length) {
      m.addedNodes.forEach(function(n) {
        if (n.nodeType === 1) console.log('추가됨:', n.tagName, n.className, n.id);
      });
    }
  });
});
observer.observe(document.body, {childList: true, subtree: true});
console.log('감시 시작');
```

### 디버깅 절차
1. 문제 재현 → 스크린샷 요청
2. 관련 요소/변수 상태 콘솔에서 확인
3. 원인 파악 후 코드 수정 또는 데이터 정리
4. 근본 원인이 코드에 있으면 재발 방지 수정 진행

---

## 18. 진행 상황

### 완료 (✅)
- [x] 기획서 v1 → v2 작성
- [x] AGENTS.md 생성 및 규칙 강화
- [x] index.html 생성 (싱글 화면 구조)
- [x] style.css 생성 (전체 스타일)
- [x] js/storage.js 생성 (상수, 유틸, 종목 마스터)
- [x] js/data.js 생성 (세션/PR/인바디 CRUD, 통계, 칼로리)
- [x] js/ui.js 생성 (홈 화면, 캘린더, 바텀시트)
- [x] js/workout.js 생성 (부위 선택, 세트 입력, PR 감지, 타이머, 완료)
- [x] js/stats.js 생성 (통계 화면, 인바디)
- [x] js/app.js 생성 (초기화)
- [x] 메인 화면 싱글 구조 전환
- [x] 브라우저 테스트: 홈 화면 렌더링 확인
- [x] 브라우저 테스트: 운동 화면 기본 동작 확인

### 다음 작업 — 1차 MVP 완성 (📋)
- [ ] 운동 화면 UI 개선: 종목 카드 1개만 펼침, 하단 종목 탐색 버튼바
- [ ] 워밍업(W) 토글 제거
- [ ] 운동 입력 전체 흐름 테스트
- [ ] 인바디 입력 화면
- [ ] 설정 화면에서 종목 순서 드래그 변경

### 2차 작업 (🔮)
- [ ] 히어로 카드 (부위별 볼륨 랭킹)
- [ ] 트리맵/버블 (부위별 비중 시각화)
- [ ] 월별 바 차트 (최근 6개월 볼륨)
- [ ] 인바디 추이 라인 그래프
- [ ] 종목/루틴 편집 UI (설정 화면)
- [ ] PWA manifest + Service Worker
- [ ] GAS 시트 동기화

---

## 19. 롱프레스/탭 하이라이트 수정 (2026-03-17)

### 변경 사항
- **CSS** (`style.css`): `*` 선택자에 `-webkit-tap-highlight-color: transparent` 및 `-webkit-touch-callout: none` 추가 → 모바일 탭 시 회색 박스 전역 제거
- **주간 캘린더** (`ui.js` `renderWeekCal`):
  - 인라인 `onclick` 제거, `data-date` 어트리뷰트 기반 터치 핸들러로 통합
  - 짧은 탭 시 DOM 교체(`renderWeekCal()` 재호출) 없이 CSS 클래스만 전환하여 롱프레스 타이머 유지
  - 터치 이벤트 분기: `touchstart` → 600ms 타이머 시작, `touchend` → 타이머 완료 여부로 짧은탭/롱프레스 판정, `touchmove` → 임계값(10px) 초과 시 타이머 취소
- **월간 캘린더** (`stats.js` `renderStatsMonthCal`, `selectStatsDate`, `renderStatsScreen`):
  - 인라인 `onclick` 제거, 동일 패턴의 터치 핸들러 적용
  - `selectStatsDate()`는 `renderStatsScreen()` 대신 `renderStatsWorkoutCard()`만 호출 (전체 리렌더 방지)
  - `renderStatsScreen()` 내 기존 `bindLongPress` 호출을 인라인 터치 핸들러로 교체 (짧은탭/롱프레스 통합)

### 핵심 원리
짧은 탭(날짜 선택)과 롱프레스(삭제)를 하나의 `touchstart/touchend` 핸들러에서 분기하되, **짧은 탭 시 부모 컨테이너의 DOM을 교체하지 않아야 롱프레스 타이머가 중간에 소실되지 않음**.

### 영향받는 함수
- `renderWeekCal()` — 터치 이벤트 바인딩 로직 완전 교체
- `selectWeekDate()` — 기존 `renderWeekCal()` 호출 유지 (호출처는 유지되나, 새로운 터치 핸들러가 주 역할 수행)
- `selectStatsDate()` — `renderStatsScreen()` 호출 제거, `renderStatsWorkoutCard()` 호출 추가
- `renderStatsScreen()` — 기존 `bindLongPress` 루프 제거, 인라인 터치 핸들러 추가

### 검증 체크리스트
| 항목 | 예상 동작 |
|---|---|
| 주간 캘린더 짧은 탭 | 날짜 선택 + 하단 카드 갱신, 회색 박스 없음 |
| 주간 캘린더 꾹누르기 | 기록 있으면 삭제 확인 모달, 회색 박스 없음 |
| 월간 캘린더(stats) 짧은 탭 | 날짜 선택 + 하단 운동 카드 표시, 회색 박스 없음 |
| 월간 캘린더(stats) 꾹누르기 | 기록 있으면 삭제 확인 모달, 회색 박스 없음 |
| 홈 화면 종목 칩 꾹누르기 | 수정/삭제 액션시트 정상 작동 |
| stats 화면 종목 칩 꾹누르기 | 수정/삭제 액션시트 정상 작동 |
| 모든 버튼/셀 탭 | 회색 하이라이트 미노출 |
| stats 월 이동(◀▶) | 정상 작동 |
| 운동 화면 → 설정 → 복귀 | 기존 플로우 정상 유지 |

---

## 20. 서버 더미 데이터 정리 + 동기화 보호 (2026-03-18 최종 해결)

### 근본 원인
`initDummyData()`를 비활성화해도, GAS 서버에 이미 저장된 더미 데이터가 `syncFromServer()`를 통해 로컬에 덮어써지고 있었음. 이전 1회성 정리 코드(`wk_server_cleaned_v1`)는 로컬의 더미를 제거하지 않은 채 서버에 업로드하여 더미가 양쪽에 그대로 남는 구조적 결함이 있었음.

### 해결 과정
1. **수동 정리 (콘솔)**: 로컬에서 2026-03-17 실제 세션만 보존, 나머지 더미 삭제 → PR 정리 → 서버 업로드
2. **코드 수정 (재발 방지)**:
   - `app.js`: 불필요한 `wk_server_cleaned_v1` 1회성 정리 코드 제거
   - `sync.js`: `syncFromServer()` 타임스탐프 비교 `>=` → `>` 변경 (같은 타임스탐프일 때 서버가 로컬을 덮어쓰지 않도록)
   - `sync.js`: 로컬이 같거나 최신일 때 불필요한 `syncToServer()` 호출 제거

### 동기화 보호 원리
- 로컬 변경 → `saveLastSyncTime()` → `syncToServer()` → 서버 `lastSync` 갱신
- 앱 재시작 → `syncFromServer()` → 타임스탐프 엄격 비교 (`>`) → 서버가 엄격히 새로울 때만 덮어쓰기

### 검증 완료
| 항목 | 결과 |
|---|---|
| 로컬 세션 | 2026-03-17 1개만 존재 |
| 서버 세션 | 2026-03-17 1개만 존재 |
| 앱 재시작 후 | 더미 미재발, 콘솔에 "로컬이 서버보다 최신" 확인 |

---

## 21. 소스 참조 및 사용자 개입 최소화 프로토콜

### 배포 URL 및 소스 참조 경로

| 항목 | 값 |
|---|---|
| 배포 URL | `https://leftjap.github.io/gym/` |
| GitHub raw base | `https://raw.githubusercontent.com/leftjap/gym/main/` |

### 파일 참조 우선순위

1순위 — 사용자가 업로드한 파일 (가장 빠름, 최신 보장)
        push 안 한 로컬 변경분이 있을 수 있으므로 항상 업로드 파일 우선
2순위 — AI가 GitHub raw URL에서 직접 크롤링
        사용자에게 추가 업로드를 요청하기 전에 반드시 먼저 시도
3순위 — 사용자에게 추가 업로드 요청 (1, 2 모두 불가능할 때만)

### AI 파일 접근 순서 (크롤링 최소화)

1. AGENTS.md를 먼저 읽는다 (사용자 업로드)
2. 상세 맵(7번) + 호출 체인(9번)에서 관련 파일/함수를 특정한다
3. 특정된 파일만 GitHub raw URL로 가져온다 (전체 탐색 안 함)

### 크롤링 상한 규칙

- 크롤링 대상이 5개 이상이면,
  사용자에게 "이 파일들을 한번에 올려주시면 더 빠릅니다: [파일 목록]"으로 안내한다.
  안내와 동시에 크롤링을 병렬로 시작한다. 사용자 응답을 기다리지 않는다.
  사용자가 업로드 파일을 보내면 그쪽으로 전환한다.
- 크롤링 대상이 4개 이하면 사용자에게 묻지 않고 바로 크롤링한다.

### GitHub 소스 접근 규칙

사용할 것:
  `raw.githubusercontent.com/leftjap/gym/main/{파일경로}`
  — 모든 파일 타입(JS, CSS, MD, HTML) 소스코드 전문 읽기 가능
  — 로그인 불필요

사용하지 않을 것:
  - `github.com/blob` — GitHub 웹 UI HTML만 반환됨
  - 배포URL/js/*.js 또는 style.css — 크롤러가 text/html 외 Content-Type 거부 가능

배포 URL 용도:
  - 접속 가능 여부 확인 (200 vs 404) — 이것만

### 크기 제한 및 크롤링 제외 파일

크롤러는 큰 파일(~1,000줄 이상)을 잘라서 반환할 수 있다.
잘린 파일을 기반으로 작업지시서를 작성하면 안 된다.
파일이 잘렸다고 판단되면 사용자에게 업로드를 요청한다.
판단 기준: 파일 끝에 닫는 괄호/태그가 없거나, 상세 맵에 있는 함수가 보이지 않으면 잘린 것.

크롤링 제외 파일 (항상 사용자 업로드를 요청):
- `js/workout.js` — 크롤러가 잘라서 반환함 (2026-03-19 확인)

### 크롤링 제외 파일 자동 등록 규칙

AI가 GitHub raw URL로 크롤링을 시도했으나 파일이 잘려서 사용자에게 업로드를 요청한 경우,
해당 파일을 위 "크롤링 제외 파일" 목록에 추가하는 AGENTS.md 갱신 Step을 작업지시서에 포함한다.
이후 같은 파일이 필요할 때는 크롤링을 시도하지 않고 바로 업로드를 요청한다.

### 혼합 참조 주의

- 업로드 파일과 크롤링 파일이 섞이면 버전 불일치 가능
- 크롤링한 파일에서 업로드 파일이 참조하는 함수/변수가 없으면,
  사용자에게 해당 파일도 업로드를 요청한다
- 사용자가 직전 작업지시서의 결과를 보고하는 경우(성공/실패/추가 수정 요청),
  해당 작업지시서가 수정한 파일은 크롤링 대신 업로드를 요청한다.
  (push 전이거나 push 직후 캐시 지연으로 GitHub 버전이 낡을 수 있다)

### AGENTS.md 크롤링 시 주의
- 문서가 클 경우 크롤러가 앞부분만 반환할 수 있음
- 사용자가 직접 업로드한 AGENTS.md를 우선 참조한다
- GitHub raw 크롤링은 사용자가 업로드하지 않은 소스 파일 확인에 사용한다

### 추가 파일 요청 규칙
- 파일이 부족할 때 사용자에게 추가 업로드를 요청하기 전에,
  GitHub raw URL로 직접 확인을 먼저 시도한다
- 사용자에게 파일 목록을 요청할 때는 1회에 전부 요청한다
  "이것도 필요합니다" 추가 요청 금지
- 요청 시 "확실히 필요한 파일"과 "높은 확률로 필요한 파일"을 구분해서 안내한다
  예: "workout.js, style.css 업로드 필요. ui.js도 관련될 수 있으니 함께 올려주시면 좋습니다"

### 검색 도구 활용 규칙
- 사용자에게 선택지나 대안을 제시하기 전에,
  검색으로 확인 가능한 정보(라이브러리 버전, API 변경, 브라우저 호환성 등)는
  먼저 확인한다.
- 단, AGENTS.md에 이미 답이 있는 경우나
  단순 확인 질문("이거 맞지?")에는 검색하지 않는다.
- 방향 확인서에서 대안을 제시할 때, 각 대안의 실현 가능성을
  검색으로 뒷받침할 수 있으면 한다.

### 컨텍스트 압축(Compaction) 대응 규칙

Claude.ai는 대화가 컨텍스트 한계(~167K 토큰)에 접근하면
이전 대화를 자동 요약(압축)한다.
압축 후에는 업로드한 파일 원문, 크롤링한 소스코드, 초반 지시사항의
구체적 내용(함수명, 줄 번호, 코드 스니펫)이 유실될 수 있다.

#### 압축 전 예방

- 한 세션에서 크롤링은 최대 4파일로 제한한다.
  크롤링한 내용은 컨텍스트에 누적되어 압축을 앞당긴다.
- 이미 크롤링한 파일을 같은 세션에서 다시 크롤링하지 않는다.
- 작업지시서가 완성되면 즉시 출력한다.
  "나중에 한꺼번에" 패턴으로 대화를 불필요하게 길게 끌지 않는다.

#### 압축 발생 시 행동

- 압축이 발생했으면("Compacting our conversation" 메시지 후)
  AI는 다음 응답 시작 부분에서 사용자에게 알린다:
  "컨텍스트 압축이 발생했습니다.
  이전에 업로드한 파일의 세부 내용이 유실되었을 수 있습니다.
  정확한 작업지시서를 위해 [파일 목록]을 다시 업로드해주세요."
- 압축 후에는 AGENTS.md의 상세 맵(7번)에 있는 함수명/변수명을
  기억에 의존하지 않는다. 확인이 필요하면 GitHub raw로 재확인하거나
  사용자에게 재업로드를 요청한다.
- 압축 후 작업지시서를 출력하기 전에,
  교체 코드에 포함된 함수명/변수명이 정확한지
  GitHub raw URL로 해당 파일을 1회 재확인한다.

#### 사용자를 위한 권장사항 (세션 분리)

한 세션이 길어지면 압축으로 인한 품질 저하가 불가피하다.
다음 경우에는 새 세션을 시작하는 것이 더 안전하다:
- 이미 1회 이상 압축이 발생한 상태에서 새로운 수정 요청을 하는 경우
- 3개 이상의 파일을 크롤링한 상태에서 추가 작업이 필요한 경우
- 작업지시서 실행 후 결과 보고 → 재수정이 필요한 경우
  (직전 작업의 맥락은 AGENTS.md와 git log에 이미 기록되어 있으므로
  새 세션에서 AGENTS.md만 업로드하면 이어서 작업 가능)

### 증상 → 의심 파일 매핑

| 증상 | 의심 파일 |
|---|---|
| 세트 입력/완료 안 됨 | workout.js (completeSet, renderSetRow) |
| PR 미감지 | data.js (checkPR, estimate1RM) |
| 캘린더 도트 안 보임/색상 틀림 | ui.js (renderWeekCal, renderMonthCal) + data.js (getDayVolume, hasPROnDate) |
| 운동 타이머 안 멈춤/안 시작 | workout.js (startWorkoutTimer, startRestTimer) |
| 운동 완료 후 요약 비정상 | workout.js (renderWorkoutSummary) + data.js (estimateCalories) |
| 홈 화면 빈 카드 | ui.js (renderLastWorkoutCard) + data.js (getLastSession, getSessionsByDate) |
| 설정에서 종목 추가/삭제 안 됨 | settings.js + storage.js (addCustomExercise, deleteCustomExercise) |
| 앱 시작 시 빈 화면 | app.js (init) + storage.js (migrateData) |
| 동기화 실패 | sync.js (syncToServer, syncFromServer) |
