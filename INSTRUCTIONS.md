# 운동 기록 앱 — 작업지시서 2/3, 3/3

> 1차 작업 완료 후 이 지시서를 참고하여 2차, 3차 작업을 진행하세요.

---

## 📋 작업지시서 2/3 체크리스트

### Step 1: WORKFLOW.md 프로젝트 경로 추가 ✅ 완료
- 파일: WORKFLOW.md
- 위치: 파일 최상단, `# WORKFLOW.md` 제목 바로 아래
- 내용:
```markdown
## 프로젝트 경로

C:\Users\leftj\Documents\바이브 코딩\workout\

모든 파일 경로는 이 디렉토리 기준이다.
```

### Step 2: index.html 생성 ✅ 완료
- 파일: index.html
- 포함 요소:
  - 화면 3개 (home/workout/stats)
  - 탭바 (홈/운동/기록)
  - 인바디 모달
  - JS 6개 로드 (storage → data → ui → workout → stats → app)

### Step 3: style.css 생성 ✅ 완료
- 파일: style.css
- 포함 섹션: 21개
  - 변수, 리셋, 화면 전환
  - 홈 화면: 요약, 스트릭, PR, 캘린더
  - 운동 화면: 헤더, 부위선택, 종목카드, 세트테이블
  - 통계 화면: 기간별 통계, 인바디, 히스토리
  - 타이머, 모달, 탭바

### Step 4: 커밋 ✅ 완료
```bash
cd "C:\Users\leftj\Documents\바이브 코딩\workout"
git add .
git commit -m "feat: index.html + style.css 추가 — 화면 구조 및 스타일"
```

---

## 📋 작업지시서 3/3 체크리스트

### Step 1: js/ui.js 교체 ✅ 완료
- 함수 포함:
  - `showScreen(screenId)` — 화면 전환 + 탭 활성화
  - `renderHome()` — 홈 화면 전체 렌더
  - `renderWeekSummary()`, `renderStreak()`, `renderRecentPRs()`
  - `renderCalendar(ym)`, `renderDayDetail(dateStr)`
  - `renderHistory()` — 최근 운동 목록

### Step 2: js/workout.js 교체 ✅ 완료
- 함수 포함:
  - `renderWorkoutScreen()` — 운동 화면 진입
  - `renderPartSelector()`, `togglePart(partId)`, `startWorkout()`
  - `renderExerciseCards()`, `renderExerciseCard()`, `renderSetRow()`
  - `completeSet()`, `completeCardio()`, `toggleWarmup()`, `addSet()`
  - `startRestTimer()`, `renderRestTimer()`, `dismissRestTimer()`
  - `finishWorkout()`, `renderWorkoutSummary()`
  - `autoSaveSession()`, `restoreSession()`

### Step 3: js/stats.js 교체 ✅ 완료
- 함수 포함:
  - `renderStats()` — 통계 화면 전체 렌더
  - `renderPeriodStats(period)` — 주간/월간 통계
  - `renderVolumeChart()`, `renderCalorieChart()` — 차트 (TODO 2차)
  - `renderInbodySection()` — 신체 기록 섹션
  - `renderInbodyChart()` — 시계열 그래프
  - `openInbodyForm()`, `saveInbodyForm()`, `closeInbodyForm()`

### Step 4: js/app.js 확인 ✅ 완료
```javascript
function init() {
  restoreSession();     // 진행 중 세션 복원
  renderHome();         // 홈 화면 렌더
  showScreen('home');   // 화면 전환
}
window.onload = init();
```

### Step 5: 최종 커밋 ✅ 완료
```bash
cd "C:\Users\leftj\Documents\바이브 코딩\workout"
git add .
git commit -m "feat: ui.js + workout.js + stats.js 완성 — 핵심 로직 구현"
```

---

## 🎯 1차 작업 완료 확인사항

모든 파일 구조:
```
workout/
├── index.html              ✅ 3화면 + 탭바
├── style.css               ✅ 21섹션 모바일 디자인
├── WORKFLOW.md             ✅ 프로젝트 경로 추가
├── js/
│   ├── storage.js          ✅ 상수, 유틸, 마스터 데이터
│   ├── data.js             ✅ CRUD + 통계
│   ├── app.js              ✅ 초기화
│   ├── ui.js               ✅ 화면 전환 + 렌더링
│   ├── workout.js          ✅ 운동 진행 로직
│   └── stats.js            ✅ 통계 + 인바디
└── INSTRUCTIONS.md         ✅ 이 파일
```

**Git 커밋 이력:**
```
1191231 chore: WORKFLOW.md 프로젝트 경로 추가
4684824 feat: 프로젝트 초기 세팅 — 폴더 구조 + WORKFLOW.md + 뼈대 파일
```

---

## 🚀 다음 단계

**2차 작업 예상 내용:**
- [ ] 테스트 데이터 주입 (mock 운동 기록)
- [ ] 로컬 서버 테스트 (python -m http.server 8000)
- [ ] 각 화면 동작 확인
- [ ] 브라우저 DevTools 디버깅

**3차 작업 예상 내용:**
- [ ] 차트 라이브러리 추가 (Chart.js)
- [ ] 인바디 차트 구현
- [ ] 세션 상세 보기 구현
- [ ] 앱 아이콘 + PWA 설정

---

**준비 완료! 🎉**
