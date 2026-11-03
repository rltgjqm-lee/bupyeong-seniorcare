# 🛡️ 부평구 통합돌봄 플랫폼 ESM·API 전수 검수 및 수정 계획서 (v04)

> **문서 번호**: BUPYEONG-AUDIT-2026-V04  
> **프로젝트**: 부평구 통합돌봄 모바일 현장 PWA 앱 및 관리자 관제 포털 (`bupyeong-seniorcare`)  
> **기준 일자**: 2026년 11월 03일 11:55  
> **절대 준수 거버넌스**: `.agents/AGENTS.md` (거짓말 엄단, ESM 모듈화, API 계층화, UID 불변)

---

## 1. 🔍 ESM, 리팩토링, API 전수 검수 결과

### 1) ESM 모듈화 (전역 스코프 오염 검수)
- **검수 결과**: **우수 (전역 `window.` 변수/함수 등록 0건)**
- **세부 현황**:
  - `window.xxx` 전역 오염 없이 표준 `import` / `export` ESM 아키텍처 준수.
  - PWA 서브뷰 및 관리자 관제 페인이 단일 책임 원칙(SRP) 기반 독립 클래스로 구조화됨.
- **개선 필요 사항 (Refactoring Target)**:
  - `pages/org-admin.html` 상단의 인라인 세션 검사 스크립트(`sessionStorage.getItem`) ➔ 전용 인증 서비스 `js/services/authService.js`로 분리 필요.

---

### 2) API 계층화 및 통신 모듈 검수
- **검수 결과**: **보완 필요 (도메인별 Service Layer 부재 및 엔드포인트 파편화)**
- **세부 현황**:
  - 통신 모듈 `js/api/apiClient.js`만 존재하며, 도메인 서비스(`TargetService`, `SurveyService`, `AdminService` 등)가 분리되지 않음.
  - `js/pwa/steps/step7CompleteView.js` Line 772에서 `ApiClient.post('/surveys/submit', payload)` 엔드포인트를 UI에서 직접 하드코딩 호출 (API 계층화 철칙 위반).
  - 관리자 웹 페인들(`TargetListPane`, `ActivityCardsPane` 등)이 백엔드 통신 없이 `BUPYEONG_INITIAL_CASES` 더미 배열에만 의존하고 있음.

---

### 3) 백엔드(Cloudflare Pages Functions / D1 DB) 검수
- **검수 결과**: **미구축 (현재 로컬 Node.js Mock `dev-server.mjs`에만 의존)**
- **세부 현황**:
  - Cloudflare Pages(`https://bupyeong-seniorcare.pages.dev/`)에서 실제 구동될 **`functions/api/[[route]].js` (Cloudflare Pages Functions) 백엔드 엔진이 없음**.
  - D1 데이터베이스 스키마(`schema.sql`) 및 실제 Cloudflare D1 바인딩이 미구현 상태.

---

### 4) 부평구 UID 체계 및 100% 가명화 정합성 검수
- **검수 결과**: **양호 (표준 체계 준수)**
- **세부 현황**:
  - 부평구 안심살핌 8대 계층형 UID(`O-28-237-01`, `C-28-237-01-001`, `S-28-237-01-***`) 마스킹 정책 준수.
  - 프론트 전 구간 실명 마스킹 체계 작동 중.

---

## 2. 🎯 수정 및 정밀 구축 계획 (Roadmap)

### [단계 1] Cloudflare Pages Functions 백엔드 & D1 스키마 구축
1. **D1 테이블 스키마 설계 (`schema.sql`)**:
   - `organizations` (수행기관 O-UID)
   - `inspectors` (참여자 정보)
   - `cases` (대상자 C-UID 원장, 100% 완전 가명화 상태 저장)
   - `activity_records` (활동관리카드 회차별 누적 대장)
   - `monitoring_records` (모니터링 실태 및 상담결과)
   - `satisfaction_surveys` (1~13번 만족도 설문 데이터)
   - `audit_logs` (개인정보 접근 감사 로그)
2. **Pages Functions REST API 라우터 (`functions/api/[[route]].js`)**:
   - `GET /api/v1/cases` : 기관별 대상자 현황 조회
   - `GET /api/v1/cases/:caseUid/history` : 차수별 방문 이력 조회
   - `POST /api/v1/surveys/submit` : 현장조사(모니터링/만족도) 데이터 D1 저장
   - `GET /api/v1/admin/stats` : 관리자 관제 통계 데이터 집계

### [단계 2] 프론트엔드 전용 API 서비스 계층 신설 (API 계층화 철칙 100% 준수)
1. **`js/services/surveyService.js`**:
   - 조사 제출, 이력 조회, 오프라인 큐 동기화 전담 (UI 뷰에서 URL 하드코딩 제거)
2. **`js/services/targetService.js`**:
   - 대상자 목록 조회, 신규 발굴 등록(`N1001~`), 가명 원장 동기화
3. **`js/services/adminService.js`**:
   - 참여자 관리, 감사 로그 조회, 17열 엑셀 데이터 추출
4. **`js/services/authService.js`**:
   - 관리자 세션 검증, 권한 가드 일원화

### [단계 3] 관리자 관제 웹(`js/admin/panes/`) 실시간 D1 연동
- 인메모리 더미 배열 `BUPYEONG_INITIAL_CASES`를 완전 걷어내고, `TargetService` 및 `SurveyService`를 통해 D1 실제 데이터베이스와 실시간 바인딩.
- 현장 PWA에서 [조사 데이터 저장] 클릭 시 관리자 화면에 즉각 실시간 반영되도록 양방향 동기화 완성.

---

## 3. 📝 부평구 통합돌봄 핸드오버 규격 (v04)

1. **저장소 구조**:
   - `pages/pwa-survey.html`: 모바일 현장조사 PWA (스플래시 인트로, 1~7단계 폼, A4 2장 만족도 조사지 PDF 출력 엔진 탑재)
   - `pages/org-admin.html`: 참여기관 관리자 관제 포털 (10대 LNB 패널)
   - `sw.js` & `manifest.json`: PWA 오프라인 캐싱 및 iOS/안드로이드 설치 인프라
   - `img/icons/`: 부평구 로고 + "통합돌봄서비스" 4종 아이콘
   - `img/pwa-survey-qr.png`: 공식 배포 도메인 직행 QR 코드
2. **절대 행동 원칙**:
   - 답변 및 승인 우선, 실행 후순위 (AGENTS.md)
   - 100% 완전 가명화(Zero PII Plaintext) 원칙 준수
   - 부평구 8대 계층형 UID 절대 임의 재발급 금지
