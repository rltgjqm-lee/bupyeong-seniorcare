# 🛡️ 부평구 통합돌봄 최신 핸드오버 및 거버넌스 완료 보고서 (v06)

> **문서 번호**: BUPYEONG-HANDOVER-2026-V06  
> **기준 일시**: 2026년 11월 05일 08:52  
> **관련 프로젝트**:  
> 1. `bupyeong-seniorcare` (부평구 통합돌봄 현장 PWA 및 관리자 포털)  
> 2. `wellriskkeeper` (고독사 예방 게이트키퍼 통합 플랫폼)  
> **절대 준수 거버넌스**: `.agents/AGENTS.md` (사전 보고 및 승인 철칙, 100% 완전 가명화, ESM 모듈화, API 계층 분리, UID 정책 엄수)

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
