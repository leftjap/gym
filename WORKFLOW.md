# WORKFLOW.md — 운동 기록 앱 작업 가이드

## 이 문서의 용도

이 문서는 AI가 코드 수정 요청을 받았을 때 따라야 하는 규칙이다.

**작업 흐름 요약**

1. 사용자가 이 문서 + 필요한 파일들을 업로드하고 수정 요청을 보낸다.
2. AI는 이 문서를 읽고 요청을 분석한다.
3. AI는 업로드된 파일들을 참조하거나 추가 파일 업로드를 요청한다.
4. AI는 **방향 확인서**를 출력한다 (해결 방향 + 영향 범위 요약).
5. 사용자가 방향을 승인하거나 수정을 요청한다.
6. 사용자가 승인하면, AI는 영향 범위 분석을 수행하고 작업지시서를 출력한다.
7. 사용자가 작업지시서를 VS Code 에이전트에 복사해서 실행한다.

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
1. 사용자가 이 문서 + 필요한 파일들을 업로드하고 수정 요청을 보낸다.
2. AI는 요청을 분석하고, 파일이 충분한지 확인한다 (부족하면 요청).
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
1. 사용자가 이 문서 + 필요한 파일들을 업로드하고 수정 요청을 보낸다.
2. AI는 요청을 분석하고, 파일이 충분한지 확인한다 (부족하면 요청).
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
- 프로젝트: C:\Users\leftj\Documents\바이브 코딩\workout\

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

### WORKFLOW.md 갱신 (해당 시)
- 7번 파일별 상세 맵: [추가/삭제/변경된 함수·상수 목록]
- 8번 전역 상태 변수: [추가/삭제된 변수]
- 9번 호출 체인: [변경된 흐름]
- 10번 데이터 스키마: [변경된 필드]

### 최종 확인
- 모바일 브라우저: [확인할 동작]
- 영향 없음 확인: [변경하지 않았지만, 같은 상태를 사용하는 함수가 기존대로 동작하는지]

### 정리 부채 (해당 시)
- [작업 중 발견한 중복 코드나 개선 가능한 부분]
```

### 파일 경로 규칙

프로젝트 루트는 다음과 같다:

```
C:\Users\leftj\Documents\바이브 코딩\workout\
```

작업지시서의 모든 Step에서 **파일 경로는 프로젝트 루트부터 시작하는 절대 경로**로 표기한다.

**표기 예시:**

| 대상 파일 | 작업지시서 표기 |
|---|---|
| index.html | `C:\Users\leftj\Documents\바이브 코딩\workout\index.html` |
| style.css | `C:\Users\leftj\Documents\바이브 코딩\workout\style.css` |
| js/storage.js | `C:\Users\leftj\Documents\바이브 코딩\workout\js\storage.js` |
| js/data.js | `C:\Users\leftj\Documents\바이브 코딩\workout\js\data.js` |
| js/ui.js | `C:\Users\leftj\Documents\바이브 코딩\workout\js\ui.js` |
| js/workout.js | `C:\Users\leftj\Documents\바이브 코딩\workout\js\workout.js` |
| js/stats.js | `C:\Users\leftj\Documents\바이브 코딩\workout\js\stats.js` |
| js/app.js | `C:\Users\leftj\Documents\바이브 코딩\workout\js\app.js` |
| WORKFLOW.md | `C:\Users\leftj\Documents\바이브 코딩\workout\WORKFLOW.md` |

**규칙:**
- `파일: style.css` ❌ → `파일: C:\Users\leftj\Documents\바이브 코딩\workout\style.css` ✅
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

### WORKFLOW.md 갱신 규칙

코드 변경으로 아래가 바뀌면 WORKFLOW.md 갱신 Step을 포함한다:
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

**위 5개를 확인하지 않고 작업지시서를 출력하지 않는다.** 하나라도 해당하면 WORKFLOW.md 갱신 Step을 반드시 포함한다. 모두 해당하지 않으면 갱신 Step을 생략한다.

**갱신하지 않는 경우:**
- CSS만 변경하고 구조 변경이 없는 경우
- 함수 내부 로직만 수정하고 인터페이스(이름, 매개변수, 반환값)가 동일한 경우

### 작업 실패 시 WORKFLOW.md 처리

사용자가 작업 결과가 실패/미해결이라고 보고하면, AI는 다음 작업지시서에서:
1. 직전 작업지시서의 WORKFLOW.md 갱신 내용이 여전히 유효한지 확인한다.
2. 유효하지 않으면 (함수가 결국 추가되지 않았거나, 이름이 바뀌었거나, 롤백되었으면) WORKFLOW.md를 되돌리거나 재수정하는 Step을 포함한다.
3. 재수정 코드가 동일한 함수/변수를 유지하면 WORKFLOW.md는 건드리지 않는다.

### 커밋 규칙

모든 작업지시서의 마지막 Step에 커밋을 포함한다.
- 커밋 메시지 형식: `[작업유형]: [변경 요약]`
- 작업유형: feat / fix / chore / refactor

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
js/app.js          — 초기화, 진입점
WORKFLOW.md        — AI 작업 가이드 (이 파일)
```

---

## 7. 파일별 상세 맵

### js/storage.js
**역할:** 앱의 기반 유틸리티. 다른 모든 JS보다 먼저 로드된다.

**전역 상수:**
- `K` — LocalStorage 키 객체 (sessions, prs, inbody, settings, customExercises, hiddenExercises)
- `BODY_PARTS` — 부위 그룹 배열 [{id, name, color, bg}, ...] (chest, back, lower, shoulder, daily, interval)
- `EQUIPMENT` — 장비 타입 객체 {barbell, dumbbell, machine, cable, bodyweight, cardio}
- `EXERCISES` — 종목 마스터 배열 [{id, name, bodyPart, equipment, defaultSets, defaultReps, defaultWeight, defaultRestSec, met, sortOrder}, ...]

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

**더미 데이터:**
- `initDummyData()` — 세션 6건, PR, 인바디 3건 생성 (데이터 없을 때만)

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
- `showScreen(screenId)` — **핵심 함수**. 화면 전환 ('home'|'workout')
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
- `renderExerciseCards()` — 현재 종목 카드 + 전체 종목 버튼바 렌더
- `renderExerciseNav()` — 전체 종목 네비게이션 버튼바 (현재 종목 active, 완료 종목 done)
- `switchExercise(exIdx)` — 종목 전환
- `renderExerciseCard(exIdx)` — 단일 종목 카드 (카드헤더 + 동기부여 문구 + 진행 바 + 세트)
- `renderSetProgress(todayVol, lastVol, lastSetCount, doneCount)` — 세트 진행 바
- `renderSetRow(exIdx, setIdx)` — 세트 행
- `toggleExCard(exIdx)` — 카드 접기/펼치기
- `completeSet(exIdx, setIdx)` — 세트 완료 처리 → PR 감지 + 타이머 + 자동 세트 추가
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

---

### js/app.js
**역할:** 앱 초기화, 진입점.

**초기화:**
- `init()` — 더미 데이터 → 세션 복원 → 월 설정 → 홈 표시
- `window.onload` → `init()`

---

## 8. 전역 상태 변수 목록

| 변수명 | 파일 | 역할 |
|---|---|---|
| activeScreen | ui.js | 현재 화면 ID (미사용, showScreen 내부에서 직접 관리) |
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
| _longPressTimer | ui.js | CONTINUE 버튼 길게 누르기 타이머 ID |
| _statsYM | stats.js | 통계 화면에서 보고 있는 월 (YYYY-MM) |
| _statsSelectedDate | stats.js | 통계 화면 캘린더에서 선택된 날짜 |
| _settingsSelectedPart | settings.js | 설정 화면에서 선택된 부위 ID (기본: 'chest') |
| _selectedEquipment | settings.js | 종목 추가 폼에서 선택된 장비 (기본: 'barbell') |

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
→ [뒤로] showScreen('home')
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
| WORKFLOW.md | AI 작업 가이드. 코드 구조 맵, 작업 규칙 | AI가 작업지시서 Step으로 수정 | 활성 — 항상 최신 유지 |
| workout_기획서.md | 초기 기획 의도 기록 | 수정하지 않음 | 동결 — 참고용 |
| INSTRUCTIONS.md | 작업지시서 이력 | 사용하지 않음 | 폐기 — git log로 대체 |

### 핵심 원칙
7번(파일별 상세 맵)이 항상 최신이면 AI는 구조를 정확히 파악할 수 있다.

### 동결 문서 규칙
- `workout_기획서.md`와 `INSTRUCTIONS.md`는 어떤 작업지시서에서도 수정 Step을 만들지 않는다.
- 기획 의도를 확인해야 할 때는 기획서를 참조하되, 현재 코드와 다른 부분은 WORKFLOW.md와 실제 코드를 기준으로 판단한다.

---

## 17. 디버깅 가이드

코드 수정으로 해결되지 않는 버그가 있을 때 사용자에게 콘솔 명령어를 요청한다.

### LocalStorage 데이터 확인
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

### 전역 변수 상태 확인
```javascript
// 운동 화면 상태
console.log('_currentSession:', _currentSession);
console.log('_restTimer:', _restTimer);
console.log('_selectedParts:', _selectedParts);
```

### DOM 요소 확인
```javascript
// 요소 내용 확인
document.getElementById('요소ID').innerHTML
document.getElementById('요소ID').outerHTML

// 요소 위치/크기 확인
document.getElementById('요소ID').getBoundingClientRect()

// 스타일 확인
getComputedStyle(document.getElementById('요소ID')).display
```

### 동적 요소 추적
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
- [x] WORKFLOW.md 생성 및 규칙 강화
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

### 2차 작업 (🔮)
- [ ] 히어로 카드 (부위별 볼륨 랭킹)
- [ ] 트리맵/버블 (부위별 비중 시각화)
- [ ] 월별 바 차트 (최근 6개월 볼륨)
- [ ] 인바디 추이 라인 그래프
- [ ] 종목/루틴 편집 UI (설정 화면)
- [ ] PWA manifest + Service Worker
- [ ] GAS 시트 동기화
