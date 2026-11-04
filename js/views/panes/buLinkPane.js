/**
 * @file buLinkPane.js
 * @description 3-1. 사업단별 연계 서브 페인 모듈 (ESM)
 *              - 사업단별 대상자 개인 매칭 현황 표출
 *              - 성명, 관리번호 검색 및 진행상태 필터링
 *              - 상단 우측 [+ 사업단 추가] 모달 연동
 *              - 사업단별 / 전체 실시간 페이지네이션 완전 연동
 */

import { notifier } from '../../utils/notifier.js';

export const BU_LINK_SAMPLE_CASES = [
  {
    linkUid: 'LNK-28-237-01-K1001-01',
    uid: 'C-28-237-01-K1001',
    name: '김*수',
    gender: '남',
    age: 74,
    grade: 'critical',
    buList: ['ME', 'CL', 'EM'],
    causesSummary: 'Q1 치아통증, Q6 공과금체납, Q8 주거악화, Q10 생명위기',
    inspectors: ['김조사', '박살핌'],
    date: '2026-09-30',
    status: '배정 완료'
  },
  {
    linkUid: 'LNK-28-237-01-K1002-01',
    uid: 'C-28-237-01-K1002',
    name: '박*진',
    gender: '여',
    age: 76,
    grade: 'critical',
    buList: ['ME', 'CL', 'EM'],
    causesSummary: 'Q1 치아통증, Q6 공과금체납, Q8 주거악화, Q10 생명위기',
    inspectors: ['김조사', '박살핌'],
    date: '2026-09-29',
    status: '배정 완료'
  },
  {
    linkUid: 'LNK-28-237-01-K1003-01',
    uid: 'C-28-237-01-K1003',
    name: '이*애',
    gender: '여',
    age: 81,
    grade: 'high',
    buList: ['ME', 'HE', 'EM'],
    causesSummary: 'Q1 식사결손, Q3 사회고립, Q7 당뇨악화중단',
    inspectors: ['이순신'],
    date: '2026-09-28',
    status: '배정 완료'
  },
  {
    linkUid: 'LNK-28-237-01-K1004-01',
    uid: 'C-28-237-01-K1004',
    name: '최*철',
    gender: '남',
    age: 68,
    grade: 'high',
    buList: ['ME', 'HE', 'EM'],
    causesSummary: 'Q1 식사결손, Q3 사회고립, Q7 당뇨악화중단',
    inspectors: ['김조사', '박살핌'],
    date: '2026-09-25',
    status: '배정 완료'
  },
  {
    linkUid: 'LNK-28-237-01-K1005-01',
    uid: 'C-28-237-01-K1005',
    name: '정*자',
    gender: '여',
    age: 79,
    grade: 'mid',
    buList: ['EM'],
    causesSummary: '정기 안부확인 진행',
    inspectors: ['이순신'],
    date: '2026-09-22',
    status: '배정 완료'
  },
  {
    linkUid: 'LNK-28-237-01-K1001-01',
    uid: 'C-28-237-01-K1001',
    name: '강*순',
    gender: '여',
    age: 75,
    grade: 'high',
    buList: ['ME', 'HE', 'EM'],
    causesSummary: 'Q1 식사결손, Q3 사회고립, Q7 당뇨약중단',
    inspectors: ['이순신'],
    date: '2026-10-24',
    status: '배정 완료'
  },
  {
    linkUid: 'LNK-28-237-01-N1001-01',
    uid: 'C-28-237-01-N1001',
    name: '홍*동',
    gender: '남',
    age: 78,
    grade: 'high',
    buList: ['ME', 'HE', 'CL', 'EM'],
    causesSummary: 'Q1 치아통증, Q6 공과금체납, Q8 주거악화, Q10 생명위기 (현장 발굴 1차 연계)',
    inspectors: ['김조사', '박살핌'],
    date: '2026-10-24',
    status: '배정 완료'
  }
];

export class BuLinkPane {
  constructor(options = {}) {
    this.container = null;
    this.cases = (options.cases && options.cases.length > 0) ? options.cases : BU_LINK_SAMPLE_CASES;
    this.currentBu = 'all';
    this.isUidMasked = true; // 기본값: 관리번호 마스킹 적용 (C-**-***-**-K1001)
    this.onViewDetail = options.onViewDetail || null;
    this.pagination = {
      currentPage: 1,
      pageSize: 10
    };
  }

  async mount(containerEl, options = {}) {
    if (typeof containerEl === 'string') {
      this.container = document.getElementById(containerEl);
    } else {
      this.container = containerEl;
    }

    if (options.cases && options.cases.length > 0) {
      this.cases = options.cases;
    }
    if (options.onViewDetail) this.onViewDetail = options.onViewDetail;

    if (!this.container) return;

    this.bindEvents();
    this.renderLinkTable();
  }

  bindEvents() {
    // 사업단 탭 버튼
    const tabBtns = this.container.querySelectorAll('.bu-tab-btn');
    tabBtns.forEach(btn => {
      btn.onclick = (e) => {
        tabBtns.forEach(b => {
          b.classList.remove('active');
          b.classList.add('secondary');
        });
        e.currentTarget.classList.add('active');
        e.currentTarget.classList.remove('secondary');
        this.currentBu = e.currentTarget.dataset.bu || 'all';
        this.pagination.currentPage = 1;
        this.renderLinkTable();
      };
    });

    // 검색 인풋 및 셀렉트
    const searchInput = document.getElementById('inpBuLinkSearch');
    const statusSelect = document.getElementById('selBuLinkStatus');
    const resetBtn = document.getElementById('btnResetBuLinkFilter');

    if (searchInput) {
      searchInput.oninput = () => {
        this.pagination.currentPage = 1;
        this.renderLinkTable();
      };
    }
    if (statusSelect) {
      statusSelect.onchange = () => {
        this.pagination.currentPage = 1;
        this.renderLinkTable();
      };
    }
    if (resetBtn) {
      resetBtn.onclick = () => {
        if (searchInput) searchInput.value = '';
        if (statusSelect) statusSelect.value = 'all';
        this.currentBu = 'all';
        this.pagination.currentPage = 1;
        tabBtns.forEach((b, idx) => {
          if (idx === 0) {
            b.classList.add('active');
            b.classList.remove('secondary');
          } else {
            b.classList.remove('active');
            b.classList.add('secondary');
          }
        });
        this.renderLinkTable();
        notifier.toast('필터가 초기화되었습니다.', 'info');
      };
    }

    // 사업단 추가 모달 버튼
    const btnAddBu = document.getElementById('btnAddBuModalBtn');
    if (btnAddBu) {
      btnAddBu.onclick = () => this.openAddBuModal();
    }

    // 관리번호 마스킹 숨김/보임 토글 버튼
    const btnToggleMask = document.getElementById('btnToggleBuLinkMask');
    if (btnToggleMask) {
      btnToggleMask.onclick = () => {
        this.isUidMasked = !this.isUidMasked;
        btnToggleMask.textContent = this.isUidMasked ? '👁️' : '🔒';
        btnToggleMask.title = this.isUidMasked ? '관리번호 마스킹 해제 (보임)' : '관리번호 마스킹 적용 (숨김)';
        this.renderLinkTable();
        notifier.toast(this.isUidMasked ? '관리번호가 마스킹 처리(숨김)되었습니다.' : '관리번호 마스킹이 해제(보임)되었습니다.', 'info');
      };
    }
  }

  openAddBuModal() {
    const modal = document.getElementById('modalAddBu');
    if (!modal) return;
    const title = document.getElementById('titleModalBu');
    if (title) title.textContent = '신규 전담 사업단 추가';
    const editIdx = document.getElementById('editBuIndex');
    if (editIdx) editIdx.value = '-1';

    const inpName = document.getElementById('inpBuName');
    const inpCode = document.getElementById('inpBuCode');
    const inpManager = document.getElementById('inpBuManager');
    const inpPhone = document.getElementById('inpBuPhone');
    const inpDesc = document.getElementById('inpBuDesc');

    if (inpName) inpName.value = '';
    if (inpCode) inpCode.value = '';
    if (inpManager) inpManager.value = '';
    if (inpPhone) inpPhone.value = '';
    if (inpDesc) inpDesc.value = '';

    modal.classList.add('active');
  }

  renderLinkTable() {
    const tbody = document.getElementById('tbodyBuLinkCases');
    if (!tbody) return;

    const searchKeyword = (document.getElementById('inpBuLinkSearch')?.value || '').trim().toLowerCase();
    const statusFilter = document.getElementById('selBuLinkStatus')?.value || 'all';

    let filtered = this.cases;

    // 사업단 필터
    if (this.currentBu !== 'all') {
      filtered = filtered.filter(c => {
        const buList = c.buList || [];
        return buList.includes(this.currentBu) || (this.currentBu === 'ME' && (c.living?.includes('식사') || buList.includes('ME')));
      });
    }

    // 진행상태 필터 (완료, 진행중, 대기 정규화 매칭)
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => {
        const st = (c.status || '대기').trim();
        return st.includes(statusFilter);
      });
    }

    // 검색어 필터 (성명, 관리번호)
    if (searchKeyword) {
      filtered = filtered.filter(c => 
        (c.name || '').toLowerCase().includes(searchKeyword) ||
        (c.uid || '').toLowerCase().includes(searchKeyword)
      );
    }

    const totalItems = filtered.length;
    const pageSize = this.pagination.pageSize;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    if (this.pagination.currentPage > totalPages) {
      this.pagination.currentPage = totalPages;
    }
    const startIndex = (this.pagination.currentPage - 1) * pageSize;
    const paged = filtered.slice(startIndex, startIndex + pageSize);

    // 하단 페이지네이션 바 렌더링
    this.renderPagination(totalItems, totalPages);

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="padding: 32px 0; color: #94a3b8; text-align: center;">
            조건에 부합하는 사업단 매칭 안부대상자가 없습니다.
          </td>
        </tr>
      `;
      return;
    }

    const buNameMap = {
      'ME': '식사지원 (ME)',
      'HE': '건강의료 (HE)',
      'CL': '주거개선 (CL)',
      'EM': '정서이웃 (EM)'
    };

    tbody.innerHTML = paged.map((c, idx) => {
      const buBadges = (c.buList && c.buList.length > 0)
        ? c.buList.map(b => `<span style="font-size: 11px; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 3px; font-weight: 700; margin-right: 4px;">${buNameMap[b] || b}</span>`).join('')
        : `<span style="font-size: 11px; background: #f1f5f9; color: #64748b; padding: 2px 6px; border-radius: 3px;">정서이웃 (EM)</span>`;

      let gradeBadge = '<span class="grade-pill clean">일반</span>';
      if (c.grade === 'critical') gradeBadge = '<span class="grade-pill critical">초고위험</span>';
      else if (c.grade === 'high') gradeBadge = '<span class="grade-pill high">고위험</span>';
      else if (c.grade === 'mid') gradeBadge = '<span class="grade-pill mid">중위험</span>';

      const status = c.status || '배정 대기';
      let statusColor = '#64748b';
      if (status.includes('완료')) statusColor = '#16a34a';
      else if (status.includes('진행중')) statusColor = '#2563eb';

      // 관리번호 마스킹 처리 (기본: 마스킹 C-**-***-**-K1001, 토글 시 원문)
      let dispUid = c.uid;
      if (this.isUidMasked && c.uid) {
        const parts = String(c.uid).split('-');
        if (parts.length >= 5) {
          dispUid = `${parts[0]}-**-***-**-${parts[4]}`;
        } else {
          dispUid = 'C-**-***-**-****';
        }
      }

      return `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="color: #64748b; font-weight: 700; text-align: center;">${startIndex + idx + 1}</td>
          <td style="font-family: monospace; font-weight: 800; color: #0f172a;">${dispUid}</td>
          <td><strong>${c.name}</strong> <span style="font-size: 11px; color: #64748b;">(${c.gender}/${c.age}세)</span></td>
          <td>${gradeBadge}</td>
          <td>${buBadges}</td>
          <td style="text-align: left; font-size: 11.5px; color: #334155;">${c.causesSummary || '맞춤 돌봄 연계 진행'}</td>
          <td style="font-size: 11.5px;">${c.inspectors ? c.inspectors.join(', ') : '미배정'}</td>
          <td style="font-size: 11px; color: #64748b;">${c.date || '-'}</td>
          <td><span style="font-size: 11px; font-weight: 700; color: ${statusColor};">${status}</span></td>
          <td>
            <button type="button" class="btn-table-sm btn-bu-view-detail" data-uid="${c.uid}" style="font-size: 11px; padding: 2px 8px;">보기</button>
          </td>
        </tr>
      `;
    }).join('');

    // 상세 보기 버튼 이벤트
    tbody.querySelectorAll('.btn-bu-view-detail').forEach(btn => {
      btn.onclick = (e) => {
        const uid = e.currentTarget.dataset.uid;
        const target = this.cases.find(c => c.uid === uid);
        if (target) {
          if (window.admin && window.admin.targetListPane) {
            window.admin.targetListPane.openDetailModal(target);
          } else if (this.onViewDetail) {
            this.onViewDetail(uid);
          }
        }
      };
    });
  }

  renderPagination(totalItems, totalPages) {
    const container = document.getElementById('buLinkPagination');
    if (!container) return;

    if (totalItems === 0) {
      container.innerHTML = '';
      return;
    }

    const { currentPage, pageSize } = this.pagination;
    const startNum = (currentPage - 1) * pageSize + 1;
    const endNum = Math.min(totalItems, currentPage * pageSize);

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }

    const pageButtons = [];
    for (let p = startPage; p <= endPage; p++) {
      pageButtons.push(`
        <button type="button" class="page-btn ${p === currentPage ? 'active' : ''}" data-bu-page="${p}">${p}</button>
      `);
    }

    container.innerHTML = `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 100%; min-height: 38px;">
        <div style="position: absolute; left: 12px; display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 12px; color: #64748b;">총 <strong>${totalItems}</strong>건 (${startNum}~${endNum} 표시)</span>
          <select class="filter-ctrl" id="selBuLinkPageSize" style="height: 28px; font-size: 11.5px; padding: 2px 6px; border-radius: 4px;">
            <option value="5" ${pageSize === 5 ? 'selected' : ''}>5개씩 보기</option>
            <option value="10" ${pageSize === 10 ? 'selected' : ''}>10개씩 보기</option>
            <option value="20" ${pageSize === 20 ? 'selected' : ''}>20개씩 보기</option>
            <option value="50" ${pageSize === 50 ? 'selected' : ''}>50개씩 보기</option>
          </select>
        </div>
        <div class="table-pagination-nav" style="display: flex; align-items: center; gap: 4px;">
          <button type="button" class="page-btn" id="btnBuPageFirst" ${currentPage === 1 ? 'disabled' : ''} title="처음">«</button>
          <button type="button" class="page-btn" id="btnBuPagePrev" ${currentPage === 1 ? 'disabled' : ''} title="이전">‹</button>
          ${pageButtons.join('')}
          <button type="button" class="page-btn" id="btnBuPageNext" ${currentPage === totalPages ? 'disabled' : ''} title="다음">›</button>
          <button type="button" class="page-btn" id="btnBuPageLast" ${currentPage === totalPages ? 'disabled' : ''} title="끝">»</button>
        </div>
      </div>
    `;

    // 페이지 사이즈 변경
    const selPageSize = container.querySelector('#selBuLinkPageSize');
    if (selPageSize) {
      selPageSize.onchange = (e) => {
        this.pagination.pageSize = parseInt(e.target.value, 10);
        this.pagination.currentPage = 1;
        this.renderLinkTable();
      };
    }

    container.querySelectorAll('.page-btn[data-bu-page]').forEach(btn => {
      btn.onclick = () => {
        this.pagination.currentPage = parseInt(btn.getAttribute('data-bu-page'), 10);
        this.renderLinkTable();
      };
    });

    const btnFirst = container.querySelector('#btnBuPageFirst');
    const btnPrev = container.querySelector('#btnBuPagePrev');
    const btnNext = container.querySelector('#btnBuPageNext');
    const btnLast = container.querySelector('#btnBuPageLast');

    if (btnFirst) btnFirst.onclick = () => { this.pagination.currentPage = 1; this.renderLinkTable(); };
    if (btnPrev) btnPrev.onclick = () => { if (this.pagination.currentPage > 1) { this.pagination.currentPage--; this.renderLinkTable(); } };
    if (btnNext) btnNext.onclick = () => { if (this.pagination.currentPage < totalPages) { this.pagination.currentPage++; this.renderLinkTable(); } };
    if (btnLast) btnLast.onclick = () => { this.pagination.currentPage = totalPages; this.renderLinkTable(); };
  }
}
