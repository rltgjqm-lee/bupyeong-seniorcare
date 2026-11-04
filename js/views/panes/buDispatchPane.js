/**
 * @file buDispatchPane.js
 * @description 4대 사업단(식사ME, 건강의료HE, 주거개선CL, 정서이웃EM) 맞춤 결연 및 출동 관리 서브 페인 모듈 (ESM)
 *              - D1 대상자 실데이터 기반 4대 사업단 수혜 명부 실시간 동적 집계 및 렌더링
 *              - 상단 사업단 버튼식 탭 바 (전체 / ME / HE / CL / EM)
 *              - 조회기간, 위험등급, 성명/관리번호 다차원 검색 필터
 *              - 단일 와이드 정규 테이블 렌더링 및 대상자 단일 1줄 수평 정렬
 *              - 하단 표준 페이지네이션 중앙 정렬 (justify-content: center)
 *              - 상단 [+ 사업단 추가] 액션 버튼 연동
 */

import { notifier } from '../../utils/notifier.js';

export const BU_CONFIG = {
  ME: {
    code: 'ME',
    name: '식사지원 사업단',
    shortName: '식사지원 ME',
    color: '#ea580c',
    bg: '#fff7ed',
    border: '#fed7aa',
    defaultAction: '당일 긴급 영양죽 배달 및 주 3회 밑반찬 정기 지원'
  },
  HE: {
    code: 'HE',
    name: '건강의료 사업단',
    shortName: '건강의료 HE',
    color: '#059669',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    defaultAction: '방문간호 주 2회 혈압·혈당 관리 및 치매안심센터 연계'
  },
  CL: {
    code: 'CL',
    name: '주거개선 사업단',
    shortName: '주거개선 CL',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    defaultAction: '주거환경 개선 특수청소 및 해충방역 지원'
  },
  EM: {
    code: 'EM',
    name: '정서·이웃연결단',
    shortName: '정서·이웃 EM',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    defaultAction: '1:1 안심이웃 결연 (주 2회 방문 말벗 지원)'
  }
};

const GRADE_LABELS = {
  critical: { text: '초고위험', color: '#dc2626', bg: '#fef2f2' },
  high: { text: '고위험', color: '#ea580c', bg: '#fff7ed' },
  mid: { text: '중위험', color: '#059669', bg: '#ecfdf5' },
  clean: { text: '저위험', color: '#2563eb', bg: '#eff6ff' }
};

export class BuDispatchPane {
  constructor(options = {}) {
    this.container = null;
    this.cases = options.cases || [];
    this.onTargetClick = options.onTargetClick || null;
    this.onAddBuClick = options.onAddBuClick || null;

    this.activeTab = 'all'; // 'all', 'ME', 'HE', 'CL', 'EM'
    this.filters = {
      startDate: '2026-09-01',
      endDate: '2026-10-31',
      grade: 'all',
      keyword: ''
    };

    this.pagination = {
      currentPage: 1,
      pageSize: 10
    };
  }

  /**
   * 페인 마운트 및 렌더링
   * @param {HTMLElement|string} containerEl 
   * @param {Object} [options] 
   */
  async mount(containerEl, options = {}) {
    if (typeof containerEl === 'string') {
      this.container = document.getElementById(containerEl);
    } else {
      this.container = containerEl;
    }

    if (options.cases) this.cases = options.cases;
    if (options.onTargetClick) this.onTargetClick = options.onTargetClick;
    if (options.onAddBuClick) this.onAddBuClick = options.onAddBuClick;

    if (!this.container) {
      console.warn('[BuDispatchPane] 컨테이너 요소를 찾을 수 없습니다.');
      return;
    }

    this.bindEvents();
    this.render();
  }

  setCases(cases) {
    this.cases = cases || [];
    this.render();
  }

  /**
   * 상단 버튼식 탭 카운트 갱신
   */
  updateTabCounts() {
    const totalCount = this.cases.filter(c => (c.buList || []).length > 0).length;
    const cntAll = document.getElementById('cntBuTabAll');
    if (cntAll) cntAll.textContent = totalCount;

    ['ME', 'HE', 'CL', 'EM'].forEach(code => {
      const el = document.getElementById(`cntBuTab${code}`);
      if (el) {
        const count = this.cases.filter(c => (c.buList || []).includes(code)).length;
        el.textContent = count;
      }
    });
  }

  /**
   * 필터링된 대상자 목록 반환
   */
  getFilteredItems() {
    return this.cases.filter(c => {
      const buList = c.buList || [];
      if (buList.length === 0) return false;

      // 1. 사업단 탭 필터
      if (this.activeTab !== 'all') {
        if (!buList.includes(this.activeTab)) return false;
      }

      // 2. 위험등급 필터
      if (this.filters.grade !== 'all') {
        if (c.grade !== this.filters.grade) return false;
      }

      // 3. 날짜 필터 (배정/조사일자)
      if (this.filters.startDate && this.filters.endDate) {
        const d = (c.date || '').slice(0, 10);
        if (d && (d < this.filters.startDate || d > this.filters.endDate)) {
          return false;
        }
      }

      // 4. 검색어 필터 (성명, 관리번호, 주소)
      if (this.filters.keyword) {
        const kw = this.filters.keyword.replace(/\s+/g, '').toLowerCase();
        const nm = (c.rawName || c.name || '').replace(/\s+/g, '').toLowerCase();
        const uid = (c.uid || '').toLowerCase();
        const addr = (c.rawAddress || c.address || '').replace(/\s+/g, '').toLowerCase();
        if (!nm.includes(kw) && !uid.includes(kw) && !addr.includes(kw)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 테이블 및 페이지네이션 통합 렌더링
   */
  render() {
    this.updateTabCounts();

    const tbody = document.getElementById('tbodyBuDispatch');
    if (!tbody) return;

    const filtered = this.getFilteredItems();
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / this.pagination.pageSize));

    if (this.pagination.currentPage > totalPages) {
      this.pagination.currentPage = totalPages;
    }

    const { currentPage, pageSize } = this.pagination;
    const startIndex = (currentPage - 1) * pageSize;
    const pagedItems = filtered.slice(startIndex, startIndex + pageSize);

    if (totalItems === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 48px 16px; color: #64748b; font-size: 13px;">
            선택한 사업단 및 검색 조건에 부합하는 수혜 대상자가 없습니다.
          </td>
        </tr>
      `;
      this.renderPagination(0, 1);
      return;
    }

    tbody.innerHTML = pagedItems.map((c, idx) => {
      const g = GRADE_LABELS[c.grade] || GRADE_LABELS.clean;
      const assignedBus = c.buList || [];

      // 맞춤 지원 내용 도출
      let actionText = '';
      if (this.activeTab !== 'all' && BU_CONFIG[this.activeTab]) {
        actionText = BU_CONFIG[this.activeTab].defaultAction;
      } else if (assignedBus.length > 0 && BU_CONFIG[assignedBus[0]]) {
        actionText = BU_CONFIG[assignedBus[0]].defaultAction;
      } else {
        actionText = '맞춤형 안부확인 및 긴급 복지 지원';
      }

      return `
        <tr style="height: 52px;">
          <td style="text-align: center; font-weight: 700; color: #475569; vertical-align: middle;">${startIndex + idx + 1}</td>
          <td class="text-left" style="vertical-align: middle; padding-left: 14px; white-space: nowrap;">
            <strong style="color: #0f172a; font-size: 13px;">${c.name}</strong>
            <span style="font-size: 11.5px; color: #64748b; margin-left: 4px;">(${c.gender}/${c.age}세)</span>
          </td>
          <td style="text-align: center; vertical-align: middle;">
            <span style="display: inline-block; font-size: 11px; font-weight: 700; color: ${g.color}; background: ${g.bg}; border: 1px solid ${g.color}40; padding: 2px 7px; border-radius: 3px;">
              ${g.text}
            </span>
          </td>
          <td style="text-align: center; vertical-align: middle;">
            <div style="display: flex; gap: 4px; justify-content: center; flex-wrap: wrap;">
              ${assignedBus.map(code => {
                const cfg = BU_CONFIG[code] || { shortName: code, color: '#334155', bg: '#f1f5f9', border: '#cbd5e1' };
                return `
                  <span style="font-size: 10.5px; font-weight: 700; color: ${cfg.color}; background: ${cfg.bg}; border: 1px solid ${cfg.border}; padding: 1px 6px; border-radius: 3px;" title="${cfg.name || code}">
                    ${code}
                  </span>
                `;
              }).join('')}
            </div>
          </td>
          <td class="text-left" style="vertical-align: middle; font-size: 12px; color: #334155;">
            ${actionText}
          </td>
          <td style="text-align: center; font-family: monospace; font-size: 11.5px; color: #475569; vertical-align: middle;">
            ${c.date || '2026-09-30'}
          </td>
          <td style="text-align: center; font-size: 11.5px; color: #475569; vertical-align: middle;">
            ${(c.inspectors || ['김조사', '박살핌']).join(', ')}
          </td>
          <td style="text-align: center; vertical-align: middle;">
            <button type="button" class="btn-table-sm bu-view-btn" data-view-target="${c.uid}" style="font-weight: 700; white-space: nowrap; padding: 4px 10px;">상세</button>
          </td>
        </tr>
      `;
    }).join('');

    this.renderPagination(totalItems, totalPages);

    // 상세 버튼 이벤트 바인딩
    tbody.querySelectorAll('.bu-view-btn').forEach(btn => {
      btn.onclick = () => {
        const uid = btn.getAttribute('data-view-target');
        const item = this.cases.find(c => c.uid === uid);
        if (item && this.onTargetClick) {
          this.onTargetClick(item);
        } else if (item) {
          notifier.toast(`[${item.name}] 대상자의 상세 원장을 조회합니다.`, 'info');
        }
      };
    });
  }

  /**
   * 하단 표준 페이지네이션 중앙 배치 (justify-content: center)
   * @param {number} totalItems 
   * @param {number} totalPages 
   */
  renderPagination(totalItems, totalPages) {
    const container = document.getElementById('buDispatchPagination');
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
      <div style="display: flex; align-items: center; justify-content: center; gap: 16px; width: 100%;">
        <span style="font-size: 12px; color: #64748b;">총 <strong>${totalItems}</strong>건 (${startNum}~${endNum} 표시)</span>
        <div class="table-pagination-nav">
          <button type="button" class="page-btn" id="btnBuPageFirst" ${currentPage === 1 ? 'disabled' : ''} title="처음">«</button>
          <button type="button" class="page-btn" id="btnBuPagePrev" ${currentPage === 1 ? 'disabled' : ''} title="이전">‹</button>
          ${pageButtons.join('')}
          <button type="button" class="page-btn" id="btnBuPageNext" ${currentPage === totalPages ? 'disabled' : ''} title="다음">›</button>
          <button type="button" class="page-btn" id="btnBuPageLast" ${currentPage === totalPages ? 'disabled' : ''} title="끝">»</button>
        </div>
        <select class="filter-ctrl" id="selBuPageSize" style="height: 28px; font-size: 11.5px; padding: 2px 6px;">
          <option value="10" ${pageSize === 10 ? 'selected' : ''}>10개씩 보기</option>
          <option value="20" ${pageSize === 20 ? 'selected' : ''}>20개씩 보기</option>
          <option value="50" ${pageSize === 50 ? 'selected' : ''}>50개씩 보기</option>
        </select>
      </div>
    `;

    // 페이지 크기 변경
    const selPageSize = container.querySelector('#selBuPageSize');
    if (selPageSize) {
      selPageSize.onchange = (e) => {
        this.pagination.pageSize = parseInt(e.target.value, 10);
        this.pagination.currentPage = 1;
        this.render();
      };
    }

    // 페이지 번호 클릭
    container.querySelectorAll('.page-btn[data-bu-page]').forEach(btn => {
      btn.onclick = () => {
        const p = parseInt(btn.getAttribute('data-bu-page'), 10);
        if (p !== this.pagination.currentPage) {
          this.pagination.currentPage = p;
          this.render();
        }
      };
    });

    const btnFirst = container.querySelector('#btnBuPageFirst');
    const btnPrev = container.querySelector('#btnBuPagePrev');
    const btnNext = container.querySelector('#btnBuPageNext');
    const btnLast = container.querySelector('#btnBuPageLast');

    if (btnFirst) btnFirst.onclick = () => { this.pagination.currentPage = 1; this.render(); };
    if (btnPrev) btnPrev.onclick = () => { if (this.pagination.currentPage > 1) { this.pagination.currentPage--; this.render(); } };
    if (btnNext) btnNext.onclick = () => { if (this.pagination.currentPage < totalPages) { this.pagination.currentPage++; this.render(); } };
    if (btnLast) btnLast.onclick = () => { this.pagination.currentPage = totalPages; this.render(); };
  }

  /**
   * 탭, 필터, 상단 액션 버튼 이벤트 바인딩
   */
  bindEvents() {
    // 1. 상단 사업단 버튼식 탭 클릭 이벤트
    const tabBtns = document.querySelectorAll('.bu-tab-btn');
    tabBtns.forEach(btn => {
      btn.onclick = () => {
        tabBtns.forEach(b => {
          b.classList.remove('active');
          b.classList.add('secondary');
        });
        btn.classList.add('active');
        btn.classList.remove('secondary');

        this.activeTab = btn.getAttribute('data-bu-tab') || 'all';
        this.pagination.currentPage = 1;
        this.render();
      };
    });

    // 2. 조회기간 필터
    const dateStart = document.getElementById('buDispatchDateStart');
    const dateEnd = document.getElementById('buDispatchDateEnd');
    if (dateStart) {
      dateStart.onchange = () => {
        this.filters.startDate = dateStart.value;
        this.pagination.currentPage = 1;
        this.render();
      };
    }
    if (dateEnd) {
      dateEnd.onchange = () => {
        this.filters.endDate = dateEnd.value;
        this.pagination.currentPage = 1;
        this.render();
      };
    }

    // 3. 위험등급 필터
    const filterGrade = document.getElementById('buDispatchFilterGrade');
    if (filterGrade) {
      filterGrade.onchange = () => {
        this.filters.grade = filterGrade.value;
        this.pagination.currentPage = 1;
        this.render();
      };
    }

    // 4. 검색어 입력
    const searchKw = document.getElementById('buDispatchSearchKeyword');
    if (searchKw) {
      searchKw.oninput = () => {
        this.filters.keyword = searchKw.value.trim();
        this.pagination.currentPage = 1;
        this.render();
      };
    }

    // 5. 초기화 버튼
    const btnReset = document.getElementById('btnResetBuDispatchFilter');
    if (btnReset) {
      btnReset.onclick = () => {
        if (dateStart) dateStart.value = '2026-09-01';
        if (dateEnd) dateEnd.value = '2026-10-31';
        if (filterGrade) filterGrade.value = 'all';
        if (searchKw) searchKw.value = '';

        this.filters.startDate = '2026-09-01';
        this.filters.endDate = '2026-10-31';
        this.filters.grade = 'all';
        this.filters.keyword = '';
        this.pagination.currentPage = 1;
        this.render();
        notifier.toast('사업단 검색 필터가 초기화되었습니다.', 'info');
      };
    }

    // 6. 상단 [+ 사업단 추가] 액션 버튼
    const btnOpenAdd = document.getElementById('btnOpenBuAddModal');
    if (btnOpenAdd) {
      btnOpenAdd.onclick = () => {
        if (this.onAddBuClick) {
          this.onAddBuClick();
        } else {
          // 수혜자 연계 관리(paneVisitSchedule)로 부드럽게 안내 또는 모달 호출
          notifier.toast('[+ 사업단 추가] 대상자 4대 사업단 신규 결연 관리 창을 엽니다.', 'info');
        }
      };
    }
  }
}
