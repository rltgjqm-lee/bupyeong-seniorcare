/**
 * @file schedulePane.js
 * @description 정기 상담 일정 및 4대 사업단(ME/HE/CL/EM) 배정 스케줄 서브 페인 모듈 (ESM)
 *              - 위험등급별 순찰 주기 관리 (초고위험 주 3회, 고위험 주 2회, 중위험 주 1회, 저위험 월 2회)
 *              - 4대 사업단(식사, 건강의료, 주거개선, 정서이웃) 배정 뱃지 가로 슬림형 표출 및 추가
 *              - 다차원 검색 & 필터링 (성명, 관리번호, 행정동, 위기등급, 사업단)
 *              - 대규모 가구 대응 표준 페이지네이션 탑재
 *              - 방문 일정 배정 및 수정 모달
 */

import { notifier } from '../../utils/notifier.js';

export const GRADE_LABELS = {
  critical: { text: '초고위험', period: '주 3회', color: '#dc2626', bg: '#fef2f2' },
  high: { text: '고위험', period: '주 2회', color: '#d97706', bg: '#fffbeb' },
  mid: { text: '중위험', period: '주 1회', color: '#16a34a', bg: '#f0fdf4' },
  clean: { text: '저위험', period: '월 2회', color: '#475569', bg: '#f8fafc' }
};

export const BU_BADGES = {
  ME: { name: '식사지원', code: 'ME', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  HE: { name: '건강의료', code: 'HE', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  CL: { name: '주거개선', code: 'CL', color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
  EM: { name: '정서이웃', code: 'EM', color: '#7e22ce', bg: '#faf5ff', border: '#e9d5ff' }
};

export class SchedulePane {
  constructor(options = {}) {
    this.container = null;
    this.cases = options.cases || [];
    this.onScheduleUpdated = options.onScheduleUpdated || null;
    this.currentAssignTargetUid = null;

    this.filters = {
      keyword: '',
      grade: 'all',
      bu: 'all'
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
    if (options.onScheduleUpdated) this.onScheduleUpdated = options.onScheduleUpdated;

    if (!this.container) {
      console.warn('[SchedulePane] 컨테이너 요소를 찾을 수 없습니다.');
      return;
    }

    this.renderSchedule();
    this.bindEvents();
  }

  setCases(cases) {
    this.cases = cases || [];
    this.renderSchedule();
  }

  /**
   * 검색 및 필터 조건에 부합하는 대상자 필터링
   */
  getFilteredCases() {
    return this.cases.filter(c => {
      // 1. 키워드 검색 (성명, 관리번호 전용)
      if (this.filters.keyword) {
        const kw = this.filters.keyword.replace(/\s+/g, '').toLowerCase();
        const rawNm = (c.rawName || c.name || '').replace(/\s+/g, '').toLowerCase();
        const uid = (c.uid || '').toLowerCase();
        const shortUid = uid.replace(/^c-28-237-01-/, '');

        const matchKw = rawNm.includes(kw) || uid.includes(kw) || shortUid.includes(kw);
        if (!matchKw) return false;
      }

      // 2. 위험등급 필터
      if (this.filters.grade !== 'all') {
        if (c.grade !== this.filters.grade) return false;
      }

      // 3. 4대 사업단 필터
      if (this.filters.bu !== 'all') {
        const assignedBus = c.buList || [];
        if (!assignedBus.includes(this.filters.bu)) return false;
      }

      return true;
    });
  }

  /**
   * 방문 일정 및 4대 사업단 배정 테이블 슬림 렌더링
   */
  renderSchedule() {
    const tbody = document.getElementById('tbodySchedule');
    if (!tbody) return;

    const filtered = this.getFilteredCases();
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
          <td colspan="7" style="text-align: center; padding: 48px 16px; color: #64748b; font-size: 13px;">
            검색 및 필터 조건에 부합하는 안부대상자가 없습니다.
          </td>
        </tr>
      `;
      this.renderPagination(0, 1);
      return;
    }

    const allBus = ['ME', 'HE', 'CL', 'EM'];

    tbody.innerHTML = pagedItems.map((c, idx) => {
      const g = GRADE_LABELS[c.grade] || GRADE_LABELS.clean;
      const assignedBus = c.buList || ['EM'];
      const unassignedBus = allBus.filter(b => !assignedBus.includes(b));

      return `
        <tr style="height: 52px;">
          <td style="text-align: center; font-weight: 700; color: #475569;">${startIndex + idx + 1}</td>
          <td class="text-left" style="vertical-align: middle; padding-left: 14px; white-space: nowrap;">
            <strong style="color: #0f172a; font-size: 13px;">${c.name}</strong>
            <span style="font-size: 11.5px; color: #64748b; margin-left: 4px;">(${c.gender}/${c.age}세)</span>
          </td>
          <td style="text-align: center;">
            <span style="display:inline-block; font-size:11px; font-weight:700; color:${g.color}; background:${g.bg}; border:1px solid ${g.color}40; padding:2px 7px; border-radius:3px;">
              ${g.text}
            </span>
            <div style="font-size: 11px; font-weight: 700; color: ${g.color}; margin-top: 2px;">${g.period}</div>
          </td>
          <td class="text-left" style="vertical-align: middle;">
            <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 6px;">
              ${assignedBus.map(b => {
                const badge = BU_BADGES[b] || { name: b, code: b, color: '#334155', bg: '#f1f5f9', border: '#cbd5e1' };
                return `
                  <span style="display: inline-flex; align-items: center; font-size: 11.5px; font-weight: 700; color: ${badge.color}; background: ${badge.bg}; border: 1px solid ${badge.border}; padding: 3px 8px; border-radius: 4px;">
                    ${badge.name} (${badge.code})
                  </span>
                `;
              }).join('')}
              ${unassignedBus.map(b => {
                const badge = BU_BADGES[b] || { name: b, code: b };
                return `
                  <button type="button" class="sched-add-chip" data-add-bu="${b}" data-uid="${c.uid}" style="display: inline-flex; align-items: center; font-size: 11px; color: #64748b; background: #ffffff; border: 1px dashed #cbd5e1; padding: 2px 7px; border-radius: 4px; cursor: pointer;" title="${badge.name} 사업단 즉시 추가 배정">
                    + ${badge.name}
                  </button>
                `;
              }).join('')}
            </div>
          </td>
          <td style="text-align: center; font-size: 12px; color: #475569; font-family: monospace;">
            ${c.date || '2026-09-30'}
          </td>
          <td style="text-align: center;">
            <span class="grade-pill clean" style="font-size: 11px; padding: 2px 6px;">${c.status || '완료'}</span>
          </td>
          <td style="text-align: center;">
            <button type="button" class="btn-table-sm" data-edit-sched="${c.uid}" style="font-weight: 700; white-space: nowrap; padding: 4px 10px;">연계 관리</button>
          </td>
        </tr>
      `;
    }).join('');

    this.renderPagination(totalItems, totalPages);

    // 이벤트 바인딩
    tbody.querySelectorAll('button[data-edit-sched]').forEach(btn => {
      btn.addEventListener('click', () => {
        const uid = btn.getAttribute('data-edit-sched');
        this.openAssignScheduleModal(uid);
      });
    });

    tbody.querySelectorAll('button[data-add-bu]').forEach(btn => {
      btn.addEventListener('click', () => {
        const uid = btn.getAttribute('data-uid');
        const bu = btn.getAttribute('data-add-bu');
        const item = this.cases.find(c => c.uid === uid);
        if (item) {
          if (!item.buList) item.buList = ['EM'];
          if (!item.buList.includes(bu)) item.buList.push(bu);
          this.renderSchedule();
          if (this.onScheduleUpdated) this.onScheduleUpdated(item);
          notifier.toast(`[${item.name}] 대상자에게 [${BU_BADGES[bu]?.name || bu}] 사업단이 추가 배정되었습니다.`, 'success');
        }
      });
    });
  }

  /**
   * 대규모 데이터 표준 페이지네이션 컨트롤 렌더링
   * @param {number} totalItems 
   * @param {number} totalPages 
   */
  renderPagination(totalItems, totalPages) {
    const container = document.getElementById('schedPagination');
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
        <button type="button" class="page-btn ${p === currentPage ? 'active' : ''}" data-sched-page="${p}">${p}</button>
      `);
    }

    const showNav = totalPages > 1;
    const navHtml = showNav ? `
      <div class="table-pagination-nav">
        <button type="button" class="page-btn" id="btnSchedPageFirst" ${currentPage === 1 ? 'disabled' : ''} title="처음">«</button>
        <button type="button" class="page-btn" id="btnSchedPagePrev" ${currentPage === 1 ? 'disabled' : ''} title="이전">‹</button>
        ${pageButtons.join('')}
        <button type="button" class="page-btn" id="btnSchedPageNext" ${currentPage === totalPages ? 'disabled' : ''} title="다음">›</button>
        <button type="button" class="page-btn" id="btnSchedPageLast" ${currentPage === totalPages ? 'disabled' : ''} title="끝">»</button>
      </div>
    ` : `
      <div class="table-pagination-nav">
        ${pageButtons.join('')}
      </div>
    `;

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; gap: 16px; width: 100%;">
        <span style="font-size: 12px; color: #64748b;">총 <strong>${totalItems}</strong>건 (${startNum}~${endNum} 표시)</span>
        ${navHtml}
        <select class="filter-ctrl" id="selSchedPageSize" style="height: 28px; font-size: 11.5px; padding: 2px 6px;">
          <option value="10" ${pageSize === 10 ? 'selected' : ''}>10개씩 보기</option>
          <option value="20" ${pageSize === 20 ? 'selected' : ''}>20개씩 보기</option>
          <option value="50" ${pageSize === 50 ? 'selected' : ''}>50개씩 보기</option>
        </select>
      </div>
    `;

    // 페이지 크기 변경
    const selPageSize = container.querySelector('#selSchedPageSize');
    if (selPageSize) {
      selPageSize.onchange = (e) => {
        this.pagination.pageSize = parseInt(e.target.value, 10);
        this.pagination.currentPage = 1;
        this.renderSchedule();
      };
    }

    // 페이지 번호 클릭
    container.querySelectorAll('.page-btn[data-sched-page]').forEach(btn => {
      btn.onclick = () => {
        const p = parseInt(btn.getAttribute('data-sched-page'), 10);
        if (p !== this.pagination.currentPage) {
          this.pagination.currentPage = p;
          this.renderSchedule();
        }
      };
    });

    // 처음, 이전, 다음, 끝
    const btnFirst = container.querySelector('#btnSchedPageFirst');
    const btnPrev = container.querySelector('#btnSchedPagePrev');
    const btnNext = container.querySelector('#btnSchedPageNext');
    const btnLast = container.querySelector('#btnSchedPageLast');

    if (btnFirst) btnFirst.onclick = () => { this.pagination.currentPage = 1; this.renderSchedule(); };
    if (btnPrev) btnPrev.onclick = () => { if (this.pagination.currentPage > 1) { this.pagination.currentPage--; this.renderSchedule(); } };
    if (btnNext) btnNext.onclick = () => { if (this.pagination.currentPage < totalPages) { this.pagination.currentPage++; this.renderSchedule(); } };
    if (btnLast) btnLast.onclick = () => { this.pagination.currentPage = totalPages; this.renderSchedule(); };
  }

  /**
   * 사업단 배정 모달 오픈
   * @param {string} [uid] 
   */
  openAssignScheduleModal(uid = null) {
    const modal = document.getElementById('assignScheduleModal');
    if (!modal) return;

    const target = this.cases.find(c => c.uid === uid) || this.cases[0];
    if (!target) return;

    this.currentAssignTargetUid = target.uid;

    const nameEl = document.getElementById('schedModalTargetName');
    const uidEl = document.getElementById('schedModalTargetUid');
    const gradeEl = document.getElementById('schedModalTargetGrade');

    if (nameEl) nameEl.textContent = `${target.name} (${target.gender}/${target.age}세, ${target.address})`;
    if (uidEl) uidEl.textContent = target.uid;
    if (gradeEl) {
      gradeEl.className = `grade-pill ${target.grade}`;
      const period = target.grade === 'critical' ? '주 3회 배정 주기' : target.grade === 'high' ? '주 2회 배정 주기' : '주 1회 배정 주기';
      gradeEl.textContent = `${target.grade === 'critical' ? '초고위험' : target.grade === 'high' ? '고위험' : '중위험'} (${period})`;
    }

    const chkME = document.getElementById('chkSchedME');
    const chkHE = document.getElementById('chkSchedHE');
    const chkCL = document.getElementById('chkSchedCL');
    const chkEM = document.getElementById('chkSchedEM');

    if (chkME) chkME.checked = (target.buList || []).includes('ME');
    if (chkHE) chkHE.checked = (target.buList || []).includes('HE');
    if (chkCL) chkCL.checked = (target.buList || []).includes('CL');
    if (chkEM) chkEM.checked = (target.buList || []).includes('EM');

    modal.classList.add('active');
  }

  closeAssignScheduleModal() {
    const modal = document.getElementById('assignScheduleModal');
    if (modal) modal.classList.remove('active');
  }

  /**
   * 검색, 필터 및 모달 버튼 이벤트 바인딩
   */
  bindEvents() {
    const searchKw = document.getElementById('schedSearchKeyword');
    const filterGrade = document.getElementById('schedFilterGrade');
    const filterBu = document.getElementById('schedFilterBu');
    const btnReset = document.getElementById('btnResetSchedFilter');

    if (searchKw) {
      searchKw.oninput = () => {
        this.filters.keyword = searchKw.value.trim();
        this.pagination.currentPage = 1;
        this.renderSchedule();
      };
    }

    if (filterGrade) {
      filterGrade.onchange = () => {
        this.filters.grade = filterGrade.value;
        this.pagination.currentPage = 1;
        this.renderSchedule();
      };
    }

    if (filterBu) {
      filterBu.onchange = () => {
        this.filters.bu = filterBu.value;
        this.pagination.currentPage = 1;
        this.renderSchedule();
      };
    }

    if (btnReset) {
      btnReset.onclick = () => {
        if (searchKw) searchKw.value = '';
        if (filterGrade) filterGrade.value = 'all';
        if (filterBu) filterBu.value = 'all';
        this.filters.keyword = '';
        this.filters.grade = 'all';
        this.filters.bu = 'all';
        this.pagination.currentPage = 1;
        this.renderSchedule();
        notifier.toast('필터가 초기화되었습니다.', 'info');
      };
    }

    const btnAssignSched = document.getElementById('btnAssignNewSchedule');
    const btnViewSched = document.getElementById('btnViewAssignStatus');
    const btnCloseAssign = document.getElementById('btnCloseAssignModal');
    const btnCancelAssign = document.getElementById('btnCancelAssignModal');
    const btnSaveAssign = document.getElementById('btnSaveAssignSchedule');

    if (btnAssignSched) {
      btnAssignSched.onclick = () => {
        this.openAssignScheduleModal(this.cases[0]?.uid);
      };
    }

    if (btnCloseAssign) btnCloseAssign.onclick = () => this.closeAssignScheduleModal();
    if (btnCancelAssign) btnCancelAssign.onclick = () => this.closeAssignScheduleModal();

    if (btnSaveAssign) {
      btnSaveAssign.onclick = () => {
        const target = this.cases.find(c => c.uid === this.currentAssignTargetUid);
        if (target) {
          const newBuList = [];
          if (document.getElementById('chkSchedME')?.checked) newBuList.push('ME');
          if (document.getElementById('chkSchedHE')?.checked) newBuList.push('HE');
          if (document.getElementById('chkSchedCL')?.checked) newBuList.push('CL');
          if (document.getElementById('chkSchedEM')?.checked) newBuList.push('EM');

          target.buList = newBuList.length > 0 ? newBuList : ['EM'];
          this.renderSchedule();
          if (this.onScheduleUpdated) this.onScheduleUpdated(target);
          this.closeAssignScheduleModal();
          notifier.toast(`[${target.name}] 대상자의 4대 사업단 방문 일정이 성공적으로 배정·저장되었습니다.`, 'success');
        }
      };
    }

    if (btnViewSched) {
      btnViewSched.onclick = () => {
        notifier.toast('주기별(초고위험 주3회/고위험 주2회/중위험 주1회) 4대 사업단 배정 현황이 정상 조회되었습니다.', 'info');
      };
    }
  }
}
