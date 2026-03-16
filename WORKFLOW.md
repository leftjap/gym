# WORKFLOW.md — 운동 기록 앱 작업 가이드

## 프로젝트 경로

```
C:\Users\leftj\Documents\바이브 코딩\workout\
```

모든 파일 경로는 이 디렉토리 기준이다.

---

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

**예시:** CSS 값 변경, 특정 함수의 단순 버그 수정, 오타 수정, "이 함수에서 이 값을 이렇게 바꿔" 수준의 요청

**흐름:**
1. 사용자가 이 문서 + 필요한 파일들을 업로드하고 수정 요청을 보낸다.
2. AI는 요청을 분석하고, 파일이 충분한지 확인한다 (부족하면 요청).
3. AI는 영향 범위 분석(6번)을 수행하고 **바로 작업지시서를 출력한다.**

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
4. 사용자가 승인하면 ("진행해", "좋아", "만들어" 등), AI는 영향 범위 분석(6번)을 수행하고 **바로 작업지시서를 출력한다.** 재확인하지 않는다.
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

## 작업지시서: [기능명 또는 수정 대상]
작업 유형: [기능 추가 / 버그 수정 / 정리]

### 영향 범위 분석
- 영향 받는 전역 변수: [목록]
- 영향 받는 함수: [목록]
- 고위험 함수 수정 여부: [있음/없음 — 있으면 전체 흐름 테스트 필요]

### Step 1
- 파일: [파일명]
- 위치: [함수명 또는 기존 코드의 어떤 부분 근처인지]
- 작업: [정확히 무엇을 추가/수정/삭제하는지. 구체적인 코드를 포함한다.]
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
```

### 파일 경로 규칙

프로젝트 루트는 다음과 같다:

```
C:\Users\leftj\Documents\바이브 코딩\workout\
```

작업지시서의 모든 Step에서 **파일 경로는 프로젝트 루트부터 시작하는 절대 경로**로 표기한다. VS Code 에이전트가 경로를 해석할 때 모호함이 없어야 한다.

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

### Haiku를 위한 규칙

Haiku는 한 번에 하나의 명확한 작업을 처리할 때 가장 정확하다. 다음 규칙으로 작업지시서를 작성한다.

- 한 Step에 한 파일만 다룬다.
- 한 Step에 한 가지 변경만 한다.
- 각 Step은 이전 Step이 완료된 상태에서 독립적으로 실행 가능해야 한다.
- 작업 내용에 구체적인 코드를 포함한다. "적절히 추가해줘" 같은 모호한 표현을 쓰지 않는다.
- 기존 함수를 수정할 때는 함수명과 현재 동작을 명시한다.
- 새 CSS를 추가할 때는 삽입 위치(어떤 선택자 아래/위)를 명시한다.
- 기존 코드에서 변경할 부분을 정확히 지목한다. "이 함수의 3번째 if문 안에서" 수준으로 구체적이어야 한다.

### WORKFLOW.md 갱신 규칙

코드 변경으로 아래가 바뀌면 WORKFLOW.md 갱신 Step을 포함한다:
- 7번(파일별 상세 맵): 함수/상수 추가·삭제·이름 변경
- 8번(전역 상태 변수): 추가·삭제
- 9번(핵심 함수 호출 체인): 흐름 변경
- 10번(데이터 스키마): 필드 변경
- 6번(파일 구조): 새 파일 추가

### 커밋 규칙

모든 작업지시서의 마지막 Step에 커밋을 포함한다.
- 커밋 메시지 형식: `[작업유형]: [변경 요약]`
- 작업유형: feat / fix / chore / refactor

---

## 3. 기능 추가 시 규칙

- 새 함수를 만들기 전에 기존 함수 중 같은 일을 하는 것이 있는지 확인한다.
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
style.css          — 전체 스타일 (모바일 우선, 추후 반응형)
js/storage.js      — LocalStorage, 상수, 유틸, 종목 마스터 데이터
js/data.js         — 세션/PR/인바디 CRUD, 통계 함수, 칼로리 추정
js/ui.js           — 화면 전환, 대시보드, 캘린더, 히스토리 렌더링
js/workout.js      — 운동 진행 화면 (부위 선택, 세트 입력, 타이머, PR 감지)
js/stats.js        — 통계 차트, 인바디 기록 UI
js/app.js          — 초기화, 진입점
WORKFLOW.md        — AI 작업 가이드 (이 파일)
```

---

## 7. 파일별 상세 맵

### js/storage.js
**역할:** 앱의 기반 유틸리티. 다른 모든 JS보다 먼저 로드된다.

**전역 상수:**
- `K` — LocalStorage 키 객체 (sessions, prs, inbody, settings)
- `BODY_PARTS` — 부위 그룹 배열 [{id, name, color, bg}, ...] (chest, back, lower, shoulder, daily, interval)
- `EQUIPMENT` — 장비 타입 객체 {barbell, dumbbell, machine, cable, bodyweight, cardio}
- `EXERCISES` — 종목 마스터 배열 [{id, name, bodyPart, equipment, defaultSets, defaultReps, defaultRestSec, met, sortOrder}, ...]

**유틸 함수:**
- `L(key)` / `S(key, val)` — LocalStorage 읽기/쓰기
- `today()`, `getLocalYMD(date)`, `getWeekStartDate()` — 날짜 유틸
- `formatDuration(min)`, `formatDate(dateStr)`, `getYM(dateStr)` — 날짜 포맷
- `formatNum(n)` — 숫자 포맷 (천단위 콤마)
- `genId()` — 고유 ID 생성

**종목 조회:**
- `getExercise(id)` — ID로 종목 조회
- `getExercisesByPart(partId)` — 부위별 종목 목록 (sortOrder 정렬)
- `getBodyPart(id)` — 부위 정보 조회

### js/data.js
**역할:** 세션/PR/인바디 CRUD + 통계 함수.

**세션 CRUD:**
- `getSessions()`, `saveSessions(arr)` — 전체 세션 읽기/쓰기
- `getSession(id)` — 단일 세션 조회
- `saveSession(session)` — 세션 저장 (신규/업데이트)
- `deleteSession(id)` — 세션 삭제

**PR 관리:**
- `getPRs()`, `savePRs(obj)` — PR 데이터 읽기/쓰기
- `checkPR(exerciseId, weight, reps)` — PR 여부 판정 + 갱신. 반환: {isPR, prevBest}
- `getExercisePRs(exerciseId)` — 종목별 PR 히스토리
- `getRecentPRs(count)` — 최근 PR 목록

**인바디:**
- `getInbodyRecords()`, `saveInbodyRecords(arr)` — 인바디 읽기/쓰기
- `addInbodyRecord(record)` — 인바디 기록 추가
- `getLatestWeight()` — 최신 체중 (칼로리 계산용)

**통계:**
- `getWeekSummary()` — 이번 주 요약 {count, volume, duration, calories}
- `getMonthSummary(ym)` — 월간 요약
- `getStreak()` — 연속 운동 일수
- `getSessionsByMonth(ym)` — 월별 세션 목록
- `getSessionsByDate(dateStr)` — 특정 날짜 세션 목록
- `estimateCalories(session)` — MET 기반 칼로리 추정
- `getLastSession()` — 가장 최근 세션 반환 (오늘 포함)
- `getDayVolume(dateStr)` — 특정 날짜의 총 볼륨 반환
- `getThisWeekVolume()` — 이번 주 총 볼륨 (월~오늘)
- `getLastWeekVolumeAtSamePoint()` — 지난주 같은 시점까지의 볼륨 (월~같은 요일)
- `getLastWeekTotalVolume()` — 지난주 전체 볼륨 (월~일)
- `hasPROnDate(dateStr)` — 특정 날짜에 PR이 있었는지 확인

### js/ui.js
**역할:** 화면 전환, 대시보드 렌더링, 캘린더, 주간 캘린더 선택.

**화면 전환:**
- `showScreen(screenId)` — 화면 전환 ('home'|'workout'|'stats')
- `activeScreen` — 현재 화면 ID

**홈 화면:**
- `renderHome()` — 주간 캘린더 + 요약 메시지 + 직전 운동 카드 렌더
- `renderWeekCal()` — 다크 배경, 요일(월~일) 위, 날짜 아래, 볼륨(그레이톤), PR 있는 날 붉은색 표시, 선택 상태 렌더
- `selectWeekDate(dateStr)` — 주간 캘린더 날짜 선택 + 주간 캘린더/직전 운동 카드 재렌더
- `renderSummaryMsg()` — 이번 주 총 볼륨 + 지난주 같은 시점 비교 메시지 렌더 (월요일 특별 처리)
- `renderLastWorkoutCard()` — 선택된 날짜(또는 가장 최근) 운동 카드 렌더 (라운드 박스: 볼륨/칼로리/시간 + 개별 종목 칩)
- `renderMonthCal()` — 월간 캘린더 (부위 컬러 도트)

**하단 버튼:**
- `updateBottomButton(state)` — 하단 고정 버튼 텍스트/상태 업데이트 ('start'|'partSelect'|'partSelectReady'|'workout'|'summary')
- `onBottomBtnClick()` — 하단 버튼 클릭 시 상태에 따라 분기

### js/workout.js
**역할:** 운동 진행 화면의 핵심 로직.

**전역 상태:**
- `_currentSession` — 진행 중인 세션 객체
- `_selectedParts` — 선택된 부위 ID 배열 (순서 유지)
- `_restTimer` — 휴식 타이머 {endTime, exerciseId, setIndex}
- `_workoutStartTime` — 운동 시작 시각 (Date.now())

**부위 선택:**
- `renderPartSelector()` — 부위 태그 선택 UI
- `togglePart(partId)` — 부위 선택/해제 토글
- `startWorkout()` — 선택 확정, 세션 생성, 타이머 시작

**종목/세트:**
- `renderExerciseCards()` — 종목 카드 전체 렌더
- `renderExerciseCard(exerciseId, index)` — 단일 종목 카드 (진행 바 + 점진적 세트 표시)
- `renderSetProgress(todayVol, lastVol, lastSetCount, doneCount)` — 세트 진행 바 (볼륨 비교 + 돌파 표시)
- `renderSetRow(exerciseId, setIndex)` — 세트 행
- `toggleWarmup(exerciseId, setIndex)` — 워밍업 토글
- `completeSet(exerciseId, setIndex)` — 세트 완료 처리 → PR 감지 + 타이머 시작 + 모든 세트 완료 시 새 세트 자동 추가
- `getLastSessionSets(exerciseId)` — 지난번 같은 종목 세트 데이터 조회
- `getWeightDelta(exerciseId)` — 장비 타입별 중량 증감 단위 반환 (barbell/machine/cable: 5, dumbbell/bodyweight: 1)
- `adjustSetValue(exIdx, setIdx, field, direction)` — ＋/－ 버튼으로 중량/횟수 증감

**타이머:**
- `startRestTimer(seconds)` — 휴식 타이머 시작 (Date.now + seconds)
- `renderRestTimer()` — 타이머 표시 업데이트 (requestAnimationFrame)
- `dismissRestTimer()` — 타이머 수동 종료

**완료:**
- `finishWorkout()` — 세션 저장, 완료 요약 표시
- `renderWorkoutSummary(session)` — 완료 요약 카드

**뒤로가기/취소:**
- `onWorkoutBack()` — 헤더 뒤로가기 버튼 핸들러 (부위 선택: 홈 복귀, 운동 진행: cancelWorkout)
- `cancelWorkout()` — 운동 취소 (confirm 후 세션 폐기 + 홈 복귀)

### js/stats.js
**역할:** 통계 화면, 인바디 기록 UI.

**통계:**
- `renderStats()` — 통계 화면 전체 렌더
- `renderPeriodStats(period)` — 주간/월간 통계 카드 ('week'|'month')
- `renderVolumeChart()` — 볼륨 추이 미니 차트
- `renderCalorieChart()` — 칼로리 추이 미니 차트

**인바디:**
- `renderInbodySection()` — 인바디 섹션 렌더
- `renderInbodyChart()` — 인바디 시계열 그래프
- `openInbodyForm()` — 인바디 입력 폼 열기
- `saveInbodyForm()` — 인바디 입력 저장

### js/app.js
**역할:** 앱 초기화, 진입점.

**초기화:**
- `window.onload` → `init()`
- `init()` — 초기 렌더링, 이벤트 등록

---

## 8. 전역 상태 변수 목록

| 변수명 | 파일 | 역할 |
|---|---|---|
| activeScreen | ui.js | 현재 화면 ID |
| _currentYM | ui.js | 현재 선택된 월 (YYYY-MM) |
| _bottomSheetOpen | ui.js | 바텀시트 열림 상태 |
| _selectedWeekDate | ui.js | 주간 캘린더에서 선택된 날짜 (기본: 오늘) |
| _currentSession | workout.js | 진행 중인 세션 객체 |
| _selectedParts | workout.js | 선택된 부위 ID 배열 |
| _restTimer | workout.js | 휴식 타이머 상태 |
| _workoutStartTime | workout.js | 운동 시작 시각 |
| _bottomBtnState | ui.js | 하단 고정 버튼 현재 상태 |

---

## 9. 핵심 함수 호출 체인

### 운동 시작 ~ 완료 흐름
```
showScreen('workout')
→ renderPartSelector()
→ [사용자가 부위 태그 탭] togglePart(partId)
→ startWorkout() → _currentSession 생성 + _workoutStartTime 기록
→ renderExerciseCards()
  → renderExerciseCard() × N
    → renderSetRow() × M (지난번 값 프리필)
→ [사용자가 세트 체크] completeSet(exerciseId, setIndex)
  → checkPR() → PR이면 인라인 표시
  → startRestTimer(seconds)
  → renderRestTimer() (requestAnimationFrame 루프)
→ [전종목 완료] finishWorkout()
  → estimateCalories(session)
  → saveSession(session)
  → renderWorkoutSummary(session)
```

### 홈 화면 렌더
```
showScreen('home')
→ renderHome()
  → renderWeekSummary() → getWeekSummary()
  → renderStreak() → getStreak()
  → renderRecentPRs() → getRecentPRs()
  → renderCalendar() → getSessionsByMonth()
```

---

## 10. 데이터 스키마

### 세션 로그 (K.sessions)
```
{ id, date, startTime, endTime,
  tags: ['lower', 'shoulder', 'daily', 'interval'],
  exercises: [
    { exerciseId, sortOrder, sets: [
      { weight, reps, done, isWarmup, isPR }
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

## 12. 자주 겪는 실수 체크리스트

- [ ] 종목 카드에서 지난번 값 프리필이 올바른 세션을 참조하는가?
- [ ] 워밍업 세트가 PR 판정과 볼륨 집계에서 제외되는가?
- [ ] 휴식 타이머가 Date.now() 기반인가? (setInterval만 의존하면 안 됨)
- [ ] 세트 체크 시 자동저장이 되는가? (앱 꺼져도 데이터 유지)
- [ ] 운동 완료 요약의 볼륨이 워밍업을 제외한 값인가?
- [ ] 캘린더 도트 색상이 부위 태그와 일치하는가?
- [ ] estimateCalories에서 최신 체중을 사용하는가?

---

## 16. 문서 관리 규칙

### 문서 목록과 역할

| 문서 | 역할 | 수정 권한 | 상태 |
|---|---|---|---|
| WORKFLOW.md | AI 작업 가이드. 코드 구조 맵, 작업 규칙, 진행 상황 | AI가 작업지시서 Step으로 수정 | 활성 — 항상 최신 유지 |
| workout_기획서.md | 초기 기획 의도 기록 | 수정하지 않음 | 동결 — 참고용 |
| INSTRUCTIONS.md | 작업지시서 이력 | 사용하지 않음 | 폐기 — git log로 대체 |

### WORKFLOW.md 갱신 트리거

| 상황 | 갱신 대상 섹션 |
|---|---|
| 함수/상수 추가·삭제·이름 변경 | 9번 (파일별 상세 맵) |
| 전역 변수 추가·삭제 | 10번 (전역 상태 변수) |
| 호출 체인 변경 | 11번 (핵심 함수 호출 체인) |
| 데이터 스키마 필드 변경 | 12번 (데이터 스키마) |
| 새 파일 추가 | 8번 (파일 구조) |
| 고위험/중위험 함수 목록 변경 | 6번 (영향 범위 분석 규칙) |
| 반복되는 버그 패턴 발견 | 15번 (실수 방지 규칙) |
| 기능 완료 또는 새 작업 항목 발생 | 18번 (진행 상황) |
| 디자인 컬러/여백 기준 변경 | 17번 (디자인 가이드) |

### 갱신하지 않는 경우

- CSS만 변경하고 구조 변경이 없는 경우
- 함수 내부 로직만 수정하고 인터페이스(이름, 매개변수, 반환값)가 동일한 경우
- 변경 로그 기록 (git log로 대체)

### 갱신 방식

- AI는 코드 변경 작업지시서를 작성한 뒤, 2번의 "AI 필수 체크" 5개 항목을 확인한다.
- 해당하는 항목이 있으면 WORKFLOW.md 갱신 Step을 코드 Step 뒤, 커밋 Step 앞에 배치한다.
- 갱신 Step에는 변경할 섹션 번호, 추가/삭제/수정할 구체적 내용을 명시한다.

### 동결 문서 규칙

- `workout_기획서.md`와 `INSTRUCTIONS.md`는 어떤 작업지시서에서도 수정 Step을 만들지 않는다.
- 기획 의도를 확인해야 할 때는 기획서를 참조하되, 현재 코드와 다른 부분은 WORKFLOW.md와 실제 코드를 기준으로 판단한다.
- 기획서의 진행 상황(10번)은 더 이상 갱신하지 않는다. WORKFLOW.md 18번이 유일한 진행 상황 관리 문서이다.

---

## 17. 디자인 가이드

### 컬러

| 용도 | 변수/값 | 색상 |
|---|---|---|
| 배경 | `--bg-gray` | `#F5F5F5` |
| 다크 배경 (헤더/주간캘린더) | `--dark` | `#2D2D2D` |
| 카드 배경 | `--white` | `#FFFFFF` |
| 카드 그림자 | — | `0 1px 3px rgba(0,0,0,0.08)` |
| 메인 텍스트 | `--dark` | `#2D2D2D` |
| 서브 텍스트 | `--gray` | `#6C6C6C` |
| 포인트 (유일한 컬러) | `--blue` | `#4A90D9` |
| PR 강조 | — | `#e87461` (붉은색) |
| 비활성 | `--icon-inactive` | `#AAAAAA` |
| 보더 | `--border-gray` | `#E0E0E0` |
| 라이트 그레이 | `--light-gray` | `#F0F0F0` |

### 부위 태그 스타일
- 미선택: `--light-gray` 배경 + `--dark` 텍스트
- 선택: `--dark` 배경 + `--white` 텍스트
- 부위별 개별 색상 없음 (모노톤)

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

### 아이콘
- 인라인 SVG 또는 이모지 (1차에서는 이모지 허용)
- 2차에서 SVG 통일 예정

### CSS 규칙
- `!important` 사용 금지
- 새 선택자 추가 전 기존 선택자 중복 검색 필수
- 같은 선택자가 있으면 병합, 파일 하단에 덧붙이지 않음

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

### 진행 중 (🔧)
- [ ] 더미 데이터 생성 (세션 6건, PR, 인바디 3건)
- [ ] 스트릭 표시 및 요약 메시지 완성
- [ ] 주간 캘린더 렌더링 테스트
- [ ] 월간 캘린더 렌더링 테스트
- [ ] 바텀시트 슬라이드업 애니메이션 동작 확인
- [ ] 운동 시작 버튼 → 운동 화면 전환 테스트
- [ ] 운동 완료 후 메인 화면 복귀 테스트

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
