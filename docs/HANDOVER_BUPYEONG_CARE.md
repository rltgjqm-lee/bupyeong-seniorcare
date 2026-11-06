# 부평구 통합돌봄 최신 핸드오버 및 거버넌스 완료 보고서 (v06)

> **문서 번호**: BUPYEONG-HANDOVER-2026-V06  
> **기준 일시**: 2026년 11월 05일 12:30  
> **관련 프로젝트**:  
> 1. `bupyeong-seniorcare` (부평구 통합돌봄 현장 PWA 및 관리자 포털)  
> 2. `wellriskkeeper` (고독사 예방 게이트키퍼 통합 플랫폼)  
> **절대 준수 거버넌스**: `.agents/AGENTS.md` (사전 보고 및 승인 철칙, 100% 완전 가명화, ESM 모듈화, API 계층 분리, UID 정책 엄수, 이모티콘 배제)

---

## 1. 최신 작업 완료 내역 총람

### 1) S-GDS Korea 15문항 검사 전수 복원 (`targetListPane.js`)
* **원인**: 수혜자 상세 모달의 탭 2 임상 테이블이 Q10까지만 렌더링되고 Q11~Q15가 누락되어 있었음.
* **조치**: Q1부터 Q15까지 15개 공식 임상 문항 전체 행 테이블을 복원하고, 합산 총점 11점/15점(고위험군, 심층 상담 필요) 정상 표출 완료.

### 2) 게이트키퍼 고독사 10문항 진단 정규 테이블 그리드 구축 (`targetListPane.js`)
* **원인**: 10개 정규 문항 대신 줄글 3줄 요약 텍스트로 임의 처리되어 있었음.
* **조치**: 특허 기반 10대 지표(실외 6대 + 실내 4대, 총 13점 만점) 정규 평가 테이블 전면 구축.
  - 문항별 연계 사업단(ME, HE, CL, EM) 배정 및 Q10 생명위기 4점 가중치 행 강조 배치 (총 8점/13점, 초고위험군 판정).

### 3) 대상자 성별 표기 정상화 (`targetListPane.js`)
* **원인**: 성별 표기에 `*` 문자가 하드코딩되어 `김*수 (*/74세)`로 노출되던 결함.
* **조치**: 목록 테이블 `김*수 (남/74세)` 및 상세 모달 프로필 `김*수 (남 / 74세)`로 정상화.

### 4) GIS 관제 지도 5명 전수 분리 표출 & 도심 주택가 실좌표 정상화 (`targetMapPane.js`)
* **원인**: 서구 신인천변전소 인근 철마산 야산 산림지대 오좌표 매핑 및 동일 좌표 중첩으로 4명만 노출되던 결함.
* **조치**: 야산 오좌표 전면 폐기 및 부평구 실제 도심 주거지역 5곳 실좌표 분리 매핑 (`KNOWN_CASE_COORDS`):
  - 김*수: 부평동 284-12 (부평역 북측 다가구·다세대) `[37.4915, 126.7245]`
  - 박*동: 산곡동 102-3 (단독주택) `[37.5050, 126.7080]`
  - 이*순: 청천동 301동 (아파트) `[37.5175, 126.7030]`
  - 최*철: 부평동 88-1 (부평남부역 고시원) `[37.4865, 126.7215]` (김*수와 완전 분리)
  - 정*자: 갈산동 45-2 (연립주택) `[37.5170, 126.7270]`
  - 기본 지도 중심을 부평구청 도심 `[37.5070, 126.7218]` (Zoom 13)으로 설정하여 5개 마커 중첩 제로화.

### 5) D1 원장 & 계층형 UID 기반 양방향 실시간 일정 연동 구현
* **원인**: 수혜자 관리카드 모달의 '6. 다음 일정 세팅'과 사업단별 관리의 '일정 등록'이 서로 단절되어 상호 반영되지 않던 문제.
* **조치**:
  1. `dev-server.mjs`: D1 `bu_activities` 및 `cases` 스키마 규격 API 구현:
     - `POST /api/v1/business-units/:buCode/activities`
     - `DELETE /api/v1/activities/:id`
     - `GET /api/v1/cases/:caseUid/schedules`
     - `POST /api/v1/monitoring-cards` (차기 일정 세팅 시 사업단 활동 자동 등록)
  2. `pages/org-admin.html`: 6번 일정 세팅 패널에 "연계 지원 사업단"(`selNextScheduleBu`) 셀렉트 추가.
  3. `beneficiaryManageModal.js`: 6번 탭에서 사업단 선택 전달 및 1번 탭 타임라인에 사업단 예정 스케줄 비동기 조회 통합 표출.
  4. `buManagePane.js`: 로컬스토리지 방식 폐기 ➔ D1 REST API 직결 및 대상자 원장 실시간 동기화.

### 6) 로그인 화면 취약점 및 테스트 계정 노출 전면 척결 (`pages/admin.html`)
* **원인**: 로그인 화면에 `[기관 관리자] wellrisk@wellrisk.com / admin1234` 등 평문 계정이 버젓이 노출되어 있었음.
* **조치**: placeholder의 특정 계정 예시 문구 제거 및 하단 평문 계정/비밀번호 블록 영구 삭제.

---

## 2. 향후 분석 및 기술 과제: 사업단별 데이터 격리 (Data Scope RBAC)

### 1) 현행 권한 체계 분석
* 현재 `RbacService`는 전사 역할(`SUPER_ADMIN`, `ORG_ADMIN`) 및 기능 권한(`READ_WRITE`, `READ`, `WRITE`, `can_export`, `can_unmask`)만 통제하고 있음.
* 로그인 시 담당자의 전담 사업단(`assigned_bu_code`: ME, HE, CL, EM, ALL)이 세션에 바인딩되지 않아, 식사지원(ME) 담당자도 타 사업단 대상자를 수정할 수 있는 상태임.

### 2) 기술 구현 방향 (D1 & 프론트엔드)
* **D1 쿼리 격리**:
  - `agency_staff.assigned_bu_code`가 `ALL`이 아닌 경우:
    - `cases` 조회 시 본인 사업단 연계 대상자(`bu_list LIKE '%ME%'`)만 개인식별정보 평문 복호화 허용.
    - 타 사업단 대상자는 DB 레벨 또는 API Gateway 레벨에서 성명(`김*수`), 연락처(`010-****-2910`), 주소(`부평동 ***`) 강제 동적 마스킹 처리.
    - `bu_activities` 쓰기(`POST`, `PUT`, `DELETE`) 요청 시 본인 `assigned_bu_code`와 불일치하면 HTTP 403 Forbidden 차단.
* **프론트엔드 UI 격리**:
  - `targetListPane.js`: 타 사업단 대상자 행의 "상세보기/수정" 액션 제한 (읽기 전용 모달 진입, 수정/삭제 버튼 비활성화).
  - `buManagePane.js`: 본인 사업단 탭만 등록/수정/참여자배정 활성화, 타 사업단 탭은 읽기 전용 잠금.

---

## 1. 🔍 사용자 핵심 지적사항 및 해결 내역

### 1) "이 참여자는 어디 사업단이야??" & UID 체계 정상화
* **원인**: D1 `participants` 테이블의 DDL만 있고 시드(INSERT) 데이터와 API가 없어 프론트엔드 더미가 사업단 코드를 누락시킨 `U-28-237-01-01`을 생성하고 테이블에 소속 사업단 컬럼이 부재했음.
* **조치**:
  1. **D1 시드 마스터 정식 추가 (`schema.sql`)**: 부평구 4대 사업단(`ME, HE, CL, EM`) 및 서구 2대 조사단(`GD, WR`)과 연계된 정식 계층형 참여자 시드(`U-28-237-01-ME-001`, `002`, `HE-001`, `002`) 작성.
  2. **소속 사업단 컬럼 신설 (`org-admin.html`)**: 참여자 관리 테이블 3열에 `<th style="width: 130px;">소속 사업단</th>` 신설.
  3. **실시간 뱃지 렌더링 (`inspectorsPane.js`)**: `식사지원 사업단`(녹색), `건강음료 사업단`(파란색) 등 소속 사업단 태그와 함께 정식 UID 표출.
  4. **백엔드 D1 API 모듈 가동 (`dev-server.mjs`)**: `/api/v1/participants?buCode=xxx` 엔드포인트 구현 및 200 OK 실측 검증 완료.

### 2) "로그인 ID를 대 놓고 써 놓는 것이 도대체 어디 있냐??" 보안 척결
* **원인**: 참여자 관리 및 사업단 참여자 관리 화면에서 로그인 ID(`user_001` 등)가 성명 옆에 노출되거나 헤더에 `성명 (로그인ID)`로 표기됨.
* **조치**:
  1. `inspectorsPane.js`, `buManagePane.js`, `orgAdminView.js`, `org-admin.html` 전반에서 `(user_001)` 노출 로직 100% 영구 삭제.
  2. 테이블 헤더 `성명 (로그인ID)` ➔ **`참여자 식별번호(UID)`(2열)** 및 **`성명`(3/4열)**으로 완벽히 분리 정돈.

### 3) 인천 서구(`가좌`, `석남`) 행정동 잔재 완전 박멸
* **조치**: `inspectorsPane.js`, `orgAdminView.js` 및 D1 시드에서 서구 행정동을 부평구 관내(`부평1동, 부평4동, 삼산1동, 삼산2동`)로 100% 교체 및 로컬스토리지 강제 정규화 마이그레이션 탑재.

### 4) 게이트키퍼 (`wellriskkeeper`) 100% 동일 동기화
* 게이트키퍼 프로젝트의 `schema.sql`, `pages/org-admin.html`, `inspectorsPane.js`, `orgAdminView.js`, `sw.js`에도 동일하게 소속 사업단 컬럼 신설, `U-28-260-01-GD-001` / `WR-001` 정규화 적용 완료.

---

## 2. 📊 정밀 타격 반영 파일 목록

| 프로젝트 | 파일 경로 | 주요 수정 내용 | 상태 |
| :--- | :--- | :--- | :--- |
| **공통** | `wellriskkeeper/schema.sql` | 7대 D1 마스터 시드 추가 (4대 사업단 & 참여자 INSERT문) | ✅ 완료 |
| **부평** | `bupyeong-seniorcare/pages/org-admin.html` | 참여자 테이블 3열에 `<th style="width: 130px;">소속 사업단</th>` 추가 | ✅ 완료 |
| **부평** | `bupyeong-seniorcare/js/views/panes/inspectorsPane.js` | 3열 소속 사업단 뱃지 렌더링, 정식 UID(`ME-001`), 부평구 행정동 정규화 | ✅ 완료 |
| **부평** | `bupyeong-seniorcare/js/views/panes/buManagePane.js` | 소속 참여자 테이블 UID 체계 확립 및 로그인 ID 흔적 삭제 | ✅ 완료 |
| **부평** | `bupyeong-seniorcare/js/views/orgAdminView.js` | `getDefaultInspectors()` 내 서구 잔재 박멸 및 부평구 정식 규격 탑재 | ✅ 완료 |
| **부평** | `bupyeong-seniorcare/dev-server.mjs` | D1 참여자 조회 API (`/api/v1/participants`) 서빙 및 buCode 필터링 | ✅ 완료 |
| **부평** | `bupyeong-seniorcare/sw.js` | 캐시 버전 `bupyeong-seniorcare-v3.8.7`로 판올림 | ✅ 완료 |
| **게이트키퍼** | `wellriskkeeper/pages/org-admin.html` | 참여자 테이블 3열에 소속 사업단 컬럼 신설 | ✅ 완료 |
| **게이트키퍼** | `wellriskkeeper/js/views/panes/inspectorsPane.js` | `GD`(우울) / `WR`(고독사) 정식 UID 및 소속 사업단 뱃지 표출 | ✅ 완료 |
| **게이트키퍼** | `wellriskkeeper/js/views/orgAdminView.js` | `getDefaultInspectors()` 정식 규격 교체 | ✅ 완료 |
| **게이트키퍼** | `wellriskkeeper/sw.js` | 캐시 버전 `wellriskkeeper-v1.1.4`로 판올림 | ✅ 완료 |


---

## 1. 🔍 사용자 지적 이슈 정밀 분석 ("부평 여기는 왜 이래?")

사용자님께서 캡처하여 표시해주신 활동관리 테이블 3열 `대상 어르신 (관리번호)` 및 하단 `관리번호 숨김` 체크박스 현황을 금연점검(`check-smoking-zone`) 원본 표준과 대조·정밀 분석한 결과입니다.

```
[현재 부평 구현의 어색한 점 3가지]
1. 컨트롤 바의 위치 불일치:
   - 금연점검 표준: 테이블 상단(필터 바 아래, 테이블 바로 위)에 [조회: N건] [10개씩 보기 ▾] [☑️ 점검번호 숨김]이 1열 라인으로 배치됨.
   - 현재 부평 상태: 하단 페이지네이션 바 구석에 어색하게 삽입되어 있어 시선이 분산되고 조작이 직관적이지 못함.

2. 복합 컬럼(성명 + UID 결합) 구조의 한계:
   - 현재 부평은 3열 헤더가 "대상 어르신 (관리번호)"로 되어 있고, 셀 내부에 성명(김*수)과 UID(C-28-237-01-K1001)가 상하로 뭉쳐져 있음.
   - 금연점검처럼 '관리번호'가 독립된 1개 컬럼(열)으로 분리되어 있지 않아, 열 숨김 처리가 깔끔한 테이블 그리드 표준에 부합하지 않음.

3. 기본 상태(Default) 및 열 레이아웃:
   - 공공 행정 화면에서 화면 진입 시 기본값(Default)을 숨김으로 할 것인지, 독립 열로 분리하여 상단 체크박스에 따라 열 전체를 Show/Hide할 것인지에 대한 통일된 UI 표준 정비 필요.
```

---

## 2. 📊 오늘(11/04) 완료된 작업 요약

| 구분 | 작업 내역 | 반영 파일 | 상태 |
| :--- | :--- | :--- | :--- |
| **사업단 관리 5대 탭** | `[ 사업단 수정 ] [ 관리자추가 ] [ 참여자 관리 ] [ 일정 등록 ] [ 활동관리 ]` 순수 텍스트 탭 및 컨테이너 완비 | `pages/org-admin.html` | ✅ 완료 |
| **활동관리 서브패널** | 슬림 1줄 실적 요약 바, 상태/성명/기간 필터 바, 인쇄 모달 2종, 체크박스 그리드, 페이지네이션 바 탑재 | `js/views/panes/buManagePane.js` | ✅ 완료 |
| **D1 데이터베이스 스키마** | `agency_staff.assigned_bu_code` 컬럼 및 `bu_activities` 실시간 현장 활동내역 테이블/인덱스 4종 DDL 정규화 | `schema.sql` (양쪽 프로젝트) | ✅ 완료 |
| **백엔드 API 연동** | 활동내역 조회(`GET /activities`) 및 상태 갱신(`PUT /activities/:id`) 라우트와 `OrgAdminApi` 계층 일원화 | `dev-server.mjs`, `orgAdminApi.js` | ✅ 완료 |
| **사업단별 연계 화면** | 상단 필터 바에 `관리번호: [보임/숨김]` 셀렉트 탑재, 열 Show/Hide 제어 및 RBAC 권한별 마스킹(`C-**-***-**-K1001`) | `pages/org-admin.html`, `buLinkPane.js` | ✅ 완료 |
| **모바일 PWA 자동 갱신** | 서비스워커 등록 시 캐시 버스팅(`?v=3.8.2`) 및 `controllerchange` 리스너 탑재로 무중단 자동 갱신 보장 | `pages/pwa-survey.html`, `sw.js` | ✅ 완료 |
| **게이트키퍼 동기화** | `wellriskkeeper`에 상기 D1 스키마, 백엔드 API, 5대 탭, 연계/관리 화면, PWA 자동 갱신 100% 동기화 | `wellriskkeeper/` 전체 | ✅ 완료 |

---

## 3. 🎯 내일 즉각 착수할 작업 계획 (To-Do List)

### 📌 [1순위] 금연점검 표준 100% 일치: 테이블 상단 액션 바 재배치
1. **위치 이동**:
   - 하단 페이지네이션에 임시로 들어간 `[10개씩 보기]`와 `[☑️ 관리번호 숨김]`을 제거.
   - 필터 바 아래, 테이블 바로 위에 **금연점검 정통 액션 바** 신설:
     ```html
     <div class="action-buttons-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
       <div style="display: flex; align-items: center; gap: 12px;">
         <span style="font-size: 13px; color: #475569;">조회: <strong id="lblActCount">3</strong> 건</span>
         <select id="selTopActPageSize" class="filter-ctrl" style="height: 30px; font-size: 12px;">
           <option value="10">10개씩 보기</option>
           <option value="20">20개씩 보기</option>
           <option value="50">50개씩 보기</option>
         </select>
         <label style="display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #475569; cursor: pointer;">
           <input type="checkbox" id="chkTopHideUid" style="width: 15px; height: 15px; accent-color: #0f172a;" />
           <span>관리번호 숨김</span>
         </label>
       </div>
       <div style="display: flex; gap: 6px;">
         <!-- 선택 인쇄 및 활동 보고서 인쇄 버튼을 이 위치로 전진 배치 -->
       </div>
     </div>
     ```

### 📌 [2순위] 테이블 컬럼 구조 정돈 (독립 열 분리 or 깔끔한 인라인 제어)
1. **방안 A (금연점검 완벽 동일형 - 권장)**:
   - 3열: `대상 어르신` (성명, 성별/연령)
   - 4열: `관리번호` (독립 컬럼 `<th id="thActUid">관리번호</th>`)
   - 체크박스 체크 시: 4열 관리번호 컬럼 자체가 테이블에서 완전히 숨겨짐 (`display: none`).
2. **방안 B (현재 복합형 유지 시 정돈)**:
   - 체크박스 기본값을 체크 상태(`checked`, 기본 숨김)로 두고, 체크 해제 시에만 부가 정보로 작은 폰트 표출.

### 📌 [3순위] Cloudflare D1 프로덕션 마이그레이션 실행
- `schema.sql`의 신규 DDL을 로컬 및 원격 D1 데이터베이스에 실제 적용:
  ```bash
  # 로컬 D1 반영
  npx wrangler d1 execute bupyeong-db --local --file=./schema.sql
  # 원격 D1 반영 (프로덕션 배포 시)
  npx wrangler d1 execute bupyeong-db --remote --file=./schema.sql
  ```

### 📌 [4순위] 게이트키퍼(`wellriskkeeper`) 동일 UI 동기화
- `bupyeong-seniorcare`에서 검증 완료된 상단 액션 바 및 컬럼 분리 UI를 `wellriskkeeper/js/views/panes/buManagePane.js`에 최종 복제 동기화.

---

## 4. 📂 주요 작업 대상 파일 경로
- `bupyeong-seniorcare/js/views/panes/buManagePane.js` (활동관리 UI 구조 및 액션바)
- `bupyeong-seniorcare/pages/org-admin.html` (관리자 포털 마크업)
- `wellriskkeeper/js/views/panes/buManagePane.js` (게이트키퍼 동기화 대상)
- `schema.sql` (D1 RDBMS 마스터 스키마)

---

## 5. 2026-11-05 업데이트 현황 및 원본-파생 위계 확립

### 1) 플랫폼 원천 정의 및 프로젝트 위계 (절대 철칙)
* **`wellriskkeeper` (보건복지부 전국 시범사업 표준 원본 마스터 코어)**:
  * 보건복지부 고독사 예방 시범사업 기반 전국 확산용 표준 원본입니다.
  * 인천 서구(`260`) 실증 모델이며, D1 RDBMS 및 전사 UID 체계의 원천(Origin)입니다.
* **`bupyeong-seniorcare` (본 프로젝트 / 지자체 특화 파생 모델)**:
  * 원본인 `wellriskkeeper` 코어를 바탕으로 **인천광역시 부평구청 및 부평구 노인인력개발센터** 맞춤형으로 파생된 모델입니다.
  * 관할 코드: 인천 부평구(`237`) 100% 완전 가명화 철칙 준수.

### 2) 2026-11-05 주요 구현 완료 내역
* **D1 일정 양방향 연동**: 수혜자 관리카드(6번 탭 차기 일정)와 사업단 관리(3-3) 간 D1 `bu_activities` 실시간 동기화 완비.
* **사업단별 Data Scope RBAC 격리 및 타 사업단 읽기 전용 가명화 통제 완비**:
  * `js/services/rbacService.js`: `assignedBuCode` 세션 바인딩, `canWriteBu`, `canWriteTarget` 구현.
  * `js/views/panes/buManagePane.js`: 타 사업단 탭 선택 시 3-3 일정 등록 폼 비활성화 및 안내 배너 표출, 삭제 버튼 숨김.
  * `js/views/modals/beneficiaryManageModal.js`: 타 사업단 대상자 상세 진입 시 가명화 마스킹 강제 고정 및 저장 버튼 비활성화.
  * `dev-server.mjs`: `x-admin-bu` 헤더 기반 403 Forbidden 백엔드 차단 가드 실측 검증 완료.
* **Git Commit & Push 완료**: 커밋 해시 `e89dba5`

### 3) 차기 연계 과제: 사업단 현장 참여자용 통합 체크인 PWA
* 원본 코어인 `wellriskkeeper` 내부에 `pages/pwa-activity.html` 모듈을 우선 구축·검증한 후, 부평구(`bupyeong-seniorcare`)로 동일 규격으로 신속 복제 동기화 예정.

---

## 6. 2026-11-06 부평 사업단 PWA 독립 모듈화(SW/Manifest) 및 공통 기능 목록 명세

> **🚨 발표 진행에 따른 원격 배포 동결 철칙**:  
> 2026-11-06 금일 담당 공무원의 대외 기관 발표 및 현장 시연이 실시간 진행 중이므로, 발표 도중 캐시 충돌이나 예기치 않은 세션 단절을 방지하기 위해 **모든 원격 Git 업로드는 금일 전면 동결(Freeze)하고 내일 일괄 반영**합니다.

### 1) 부평구 사업단별 PWA Service Worker & Manifest 독립 관리 규격

부평구 프로젝트 내부에서도 성격이 다른 2대 현장 모바일 PWA가 공존하므로, **아이콘, 서비스 워커(sw), 매니페스트(manifest)를 1:1로 완전 격리하여 모듈별 독립 업데이트** 체계를 유지합니다.

| 구분 | **1. 부평 대표 PWA (현장조사·선별)** | **2. 부평 사업단 PWA (현장 안부·배달)** |
| :--- | :--- | :--- |
| **타깃 화면** | `pages/pwa-survey.html` | `pages/pwa-activity.html` |
| **설치 앱 명칭** | **`부평형 통합돌봄서비스`** (`short_name: 부평 통합돌봄`) | **`부평 시니어안심살핌 (사업단)`** (`short_name: 부평 안심살핌`) |
| **전용 매니페스트** | `manifest.json` (`start_url: /pages/pwa-survey.html`) | **`manifest-activity.json`** (`start_url: /pages/pwa-activity.html`) |
| **전용 서비스 워커** | `sw.js` (`CACHE_NAME: bupyeong-seniorcare-v3.9.x`) | **`sw-activity.js`** (`CACHE_NAME: bupyeong-activity-v1.x`) |
| **독립 수명주기** | 대표 설문/선별 로직 수정 시 단독 갱신 | 4대 사업단 활동 서식/퇴근 로직 수정 시 **대표 조사 앱 영향 0% 완전 격리** |

* **익일 배포 작업**: 로컬에 이미 준비된 `manifest-activity.json`, `sw-activity.js`, `pwa-activity.html` 연동 코드를 발표 종료 후 내일 안전하게 원격 Git에 배포합니다.

---

### 2) 인천 부평구-복지부 양대 시스템 공통 활용 기능 목록 (Common Shared Capabilities)

부평구 통합돌봄(`bupyeong-seniorcare`)과 보건복지부 마스터(`wellriskkeeper`) 양쪽에서 공통 기반 기술로 재사용되는 핵심 표준 컴포넌트 목록입니다.

1. **통신 및 네트워크 계층**:
   - `ApiClient` (`js/api/apiClient.js`): 공통 Request Wrapper, 에러 핸들링, Network-First 전략 연동.
   - `offlineSyncService`: 음영지역 오프라인 IndexedDB 보관 및 온라인 복귀 시 자동 백그라운드 동기화.
2. **UI 공통 인터랙션 & 피드백**:
   - `notifier` (`js/utils/notifier.js`): 상단 토스트 알림, 확인(Confirm) 다이얼로그, 긴급 경보 모달.
   - `signaturePad` (`js/utils/signaturePad.js`): HTML5 Canvas 기반 2인 1조 현장 참여자 전자서명 및 WebP/PNG 변환.
   - `5:5 스위치 토글` (`obs-btn-switch`): 모바일 터치 친화형 성별, 접촉 방식, 이상징후 라디오 대체 컨트롤.
3. **보안 및 개인정보보호 (부평구 100% 가명화 원칙)**:
   - `mask` (`js/utils/mask.js`): 개인정보보호법에 부합하는 성명(`홍*동`), 상세주소(`*** ***`), 연락처(`010-****-1234`) 동적 마스킹.
   - `uid` (`js/core/uid.js`): 부평구 표준 식별자 체계(`O-28-237-01`, `C-28-237-01-K1001`, `U-28-237-01-ME-001` 등) 자동 채번 및 무결성 검증.
4. **증빙 및 서식 출력 엔진**:
   - `html2pdf.bundle.min.js`: A4 표준 서식(활동일지, 선별 검사표) 즉시 인쇄 및 PDF 저장.
   - `ExcelJS` (`lib/exceljs.min.js`): 기관 보관용 당일 활동 내역 및 참여자 명부 엑셀(.xlsx) 내보내기.
5. **GIS 공간정보 & 위치 확인**:
   - Daum/Kakao Postcode Service: 모바일 친화형 인앱 도로명 주소 검색 및 지번 자동 매핑.
   - Leaflet.js & 부평 관내 실좌표: 수혜 대상자 가택 위·경도 정밀 좌표 변환 및 실시간 관제 맵 마커 표출.
6. **현장 안부 대전제 가드 (Guard Condition)**:
   - 3단계 현장공통 안부 상태(`대면 접촉`, `비대면 접촉`, `부재 / 인기척 없음`)에 따른 실내 관찰 항목(잔반, 치아, 가택환경)의 동적 스위칭 및 허위 데이터 원천 차단.

