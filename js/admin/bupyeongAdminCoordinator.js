/**
 * @file bupyeongAdminCoordinator.js
 * @description 부평구 통합돌봄 참여기관 관리자 포털 ESM 메인 컨트롤러
 * - 게이트키퍼(wellriskkeeper/welfare_platform (2).html) 표준 관리자 명세 100% 준수
 */

// 부평구 10대 대상자 마스터 데이터 (100% 완전 가명화 준수)
const BUPYEONG_CASES = [
  { uid: 'C-28-237-01-N1001', name: '김○○', dong: '부평1동', life: '노인 (남, 74세)', risk: '8점 (고위험)', riskClass: 'h', lastDate: '2026-10-30', inspector: '이○○', status: '복지 연계 대기' },
  { uid: 'C-28-237-01-N1002', name: '이○○', dong: '산곡2동', life: '노인 (여, 81세)', risk: '5점 (주의)', riskClass: 'm', lastDate: '2026-10-28', inspector: '박○○', status: '정기 안부 관리' },
  { uid: 'C-28-237-01-N1003', name: '최○○', dong: '청천1동', life: '중장년 (남, 68세)', risk: '3점 (일반)', riskClass: 'l', lastDate: '2026-10-29', inspector: '최○○', status: '1차 관찰 완료' },
  { uid: 'C-28-237-01-N1004', name: '박○○', dong: '부평4동', life: '노인 (남, 79세)', risk: '7점 (고위험)', riskClass: 'h', lastDate: '2026-10-31', inspector: '이○○', status: '연락두절 (위기)' },
  { uid: 'C-28-237-01-N1005', name: '정○○', dong: '갈산2동', life: '노인 (여, 76세)', risk: '4점 (주의)', riskClass: 'm', lastDate: '2026-10-25', inspector: '최○○', status: '정기 안부 관리' },
  { uid: 'C-28-237-01-N1006', name: '강○○', dong: '삼산1동', life: '중장년 (남, 65세)', risk: '2점 (일반)', riskClass: 'l', lastDate: '2026-10-27', inspector: '박○○', status: '1차 관찰 완료' },
  { uid: 'C-28-237-01-N1007', name: '조○○', dong: '부개2동', life: '노인 (남, 83세)', risk: '6점 (고위험)', riskClass: 'h', lastDate: '2026-10-24', inspector: '이○○', status: '집중 방문 진행' },
  { uid: 'C-28-237-01-N1008', name: '윤○○', dong: '십정1동', life: '노인 (여, 72세)', risk: '4점 (주의)', riskClass: 'm', lastDate: '2026-10-26', inspector: '박○○', status: '정기 안부 관리' },
  { uid: 'C-28-237-01-N1009', name: '장○○', dong: '일신동', life: '노인 (남, 77세)', risk: '5점 (주의)', riskClass: 'm', lastDate: '2026-10-22', inspector: '최○○', status: '정기 안부 관리' },
  { uid: 'C-28-237-01-N1010', name: '임○○', dong: '부평5동', life: '노인 (여, 80세)', risk: '4점 (주의)', riskClass: 'm', lastDate: '2026-10-20', inspector: '이○○', status: '정기 안부 관리' }
];

// 차수별 활동관리카드 누적 일지 데이터 (시계열)
const ACTIVITY_RECORDS = [
  { date: '2026-10-31 14:00', inspector: '이○○', uid: 'C-28-237-01-N1004', name: '박○○', round: '3차', type: '정기 안부방문', result: '부재중 (문앞 안내문 부착)', chipClass: 'h', approved: '승인 대기' },
  { date: '2026-10-30 11:30', inspector: '이○○', uid: 'C-28-237-01-N1001', name: '김○○', round: '2차', type: '2차 심층진단', result: '8점 고위험 (식사 결핍 상담)', chipClass: 'h', approved: '완료' },
  { date: '2026-10-29 15:20', inspector: '최○○', uid: 'C-28-237-01-N1003', name: '최○○', round: '2차', type: '1차 관찰', result: '건강 양호 · 주거 외관 정상', chipClass: 'ok', approved: '완료' },
  { date: '2026-10-28 10:40', inspector: '박○○', uid: 'C-28-237-01-N1002', name: '이○○', round: '2차', type: '정기 안부방문', result: '혈압약 복용 확인 및 말벗', chipClass: 'ok', approved: '완료' },
  { date: '2026-10-27 14:10', inspector: '박○○', uid: 'C-28-237-01-N1006', name: '강○○', round: '1차', type: '1차 관찰', result: '우편물 양호 · 거주상태 확인', chipClass: 'ok', approved: '완료' },
  { date: '2026-10-26 16:00', inspector: '박○○', uid: 'C-28-237-01-N1008', name: '윤○○', round: '2차', type: '정기 안부방문', result: '난방기기 점검 및 안부 확인', chipClass: 'ok', approved: '완료' },
  { date: '2026-10-25 13:30', inspector: '최○○', uid: 'C-28-237-01-N1005', name: '정○○', round: '1차', type: '1차 관찰', result: '식사 섭취 상태 양호', chipClass: 'ok', approved: '완료' },
  { date: '2026-10-24 11:00', inspector: '이○○', uid: 'C-28-237-01-N1007', name: '조○○', round: '2차', type: '2차 심층진단', result: '6점 고위험 (보행 불편 호소)', chipClass: 'm', approved: '완료' },
  { date: '2026-10-22 15:00', inspector: '최○○', uid: 'C-28-237-01-N1009', name: '장○○', round: '1차', type: '정기 안부방문', result: '말벗 지원 및 복약 지도', chipClass: 'ok', approved: '완료' },
  { date: '2026-10-20 14:00', inspector: '이○○', uid: 'C-28-237-01-N1010', name: '임○○', round: '1차', type: '정기 안부방문', result: '환절기 건강 안부 확인', chipClass: 'ok', approved: '완료' }
];

export class BupyeongAdminCoordinator {
  constructor() {
    this.cases = [...BUPYEONG_CASES];
    this.records = [...ACTIVITY_RECORDS];
    this.currentPage = 'dashboard';
  }

  init() {
    this.bindSidebarEvents();
    this.bindTargetModal();
    this.bindRecordFilterEvents();
    this.renderTargetsTable();
    this.renderRecordsTable(this.records);
    this.bindLogout();
  }

  // 사이드바 탭 전환
  bindSidebarEvents() {
    document.querySelectorAll('.sidebar-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const page = e.currentTarget.dataset.page;
        if (!page) return;

        // 사이드바 활성화 갱신
        document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
        e.currentTarget.classList.add('active');

        // 메인 페이지 전환
        document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active'));
        const targetPage = document.getElementById(`ap-${page}`);
        if (targetPage) {
          targetPage.classList.add('active');
        }
        this.currentPage = page;
      });
    });
  }

  // 돌봄대상자 테이블 렌더링
  renderTargetsTable() {
    const tbody = document.getElementById('tblTargetsBody');
    if (!tbody) return;

    tbody.innerHTML = this.cases.map(c => `
      <tr>
        <td><span class="uid-tag">${c.uid}</span></td>
        <td><strong>${c.name}</strong></td>
        <td>${c.dong}</td>
        <td style="color:var(--c-text-secondary);">${c.life}</td>
        <td><span class="chip ${c.riskClass}">${c.risk}</span></td>
        <td style="color:var(--c-text-muted); font-size:11.5px;">${c.lastDate}</td>
        <td>${c.inspector}</td>
        <td><span class="chip ok">${c.status}</span></td>
      </tr>
    `).join('');
  }

  // 방문기록 (활동관리카드 누적 대장) 테이블 렌더링
  renderRecordsTable(list) {
    const tbody = document.getElementById('tblRecordsBody');
    if (!tbody) return;

    tbody.innerHTML = list.map(r => `
      <tr>
        <td style="color:var(--c-text-muted); font-size:11.5px;">${r.date}</td>
        <td><strong>${r.inspector}</strong></td>
        <td><span class="uid-tag">${r.uid}</span></td>
        <td>${r.name}</td>
        <td><strong>${r.round}</strong></td>
        <td>${r.type}</td>
        <td><span class="chip ${r.chipClass}">${r.result}</span></td>
        <td>
          ${r.approved === '승인 대기'
            ? `<button class="action-btn primary" onclick="alert('활동일지 승인이 완료되었습니다.')">승인</button>`
            : `<span class="chip ok">완료</span>`}
        </td>
      </tr>
    `).join('');
  }

  // 방문기록 필터
  bindRecordFilterEvents() {
    const btnAll = document.getElementById('btnFilterAllRecords');
    const btnUnmet = document.getElementById('btnFilterUnmetRecords');

    if (btnAll) {
      btnAll.addEventListener('click', () => {
        this.renderRecordsTable(this.records);
      });
    }

    if (btnUnmet) {
      btnUnmet.addEventListener('click', () => {
        const unmetList = this.records.filter(r => r.result.includes('부재') || r.result.includes('미응답'));
        this.renderRecordsTable(unmetList);
      });
    }
  }

  // 신규 대상자 등록 모달
  bindTargetModal() {
    const btnOpen = document.getElementById('btnOpenTargetRegister');
    const modal = document.getElementById('targetRegisterModal');
    const btnClose = document.getElementById('btnCloseTargetModal');
    const btnCancel = document.getElementById('btnCancelTargetModal');
    const form = document.getElementById('formNewTarget');

    if (btnOpen && modal) {
      btnOpen.addEventListener('click', () => {
        modal.style.display = 'flex';
      });
    }

    const closeModal = () => {
      if (modal) modal.style.display = 'none';
    };

    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const uid = document.getElementById('inpNewCaseUid').value.trim();
        const name = document.getElementById('inpNewCaseName').value.trim();
        const dong = document.getElementById('selNewCaseDong').value;
        const life = document.getElementById('selNewCaseLife').value;

        const newTarget = {
          uid,
          name,
          dong,
          life,
          risk: '평가 대기',
          riskClass: 'l',
          lastDate: '신규 등록',
          inspector: '배정 대기',
          status: '매칭 대기'
        };

        this.cases.unshift(newTarget);
        this.renderTargetsTable();
        closeModal();
        alert(`신규 대상자 [${uid}]가 정상 등록되었습니다. 매칭 검수 탭에서 활동가를 배정해 주세요.`);
      });
    }
  }

  // 로그아웃
  bindLogout() {
    const btn = document.getElementById('btnAdminLogout');
    if (btn) {
      btn.addEventListener('click', () => {
        sessionStorage.removeItem('bupyeong_admin_auth');
        sessionStorage.removeItem('bupyeong_admin_id');
        window.location.replace('/pages/admin.html');
      });
    }
  }
}

// 브라우저 초기화
window.addEventListener('DOMContentLoaded', () => {
  const coordinator = new BupyeongAdminCoordinator();
  coordinator.init();
});
