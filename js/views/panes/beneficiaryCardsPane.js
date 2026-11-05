/**
 * @file beneficiaryCardsPane.js
 * @description 수혜자 관리카드 (대면 방문 & 비대면 유선상담) 통합 서브 페인 모듈 (ESM)
 *              - D1 beneficiary_monitoring_cards 실시간 원장 연동
 *              - 슬림화된 테이블: 연번 | 대상자 | 확인일시 | 접촉방식 | 다음 예정일 | 담당 살핌단 | 관리
 *              - [관리] 버튼 클릭 시 BeneficiaryManageModal과 연동하여
 *                1.과거 일정, 2.누적 목록, 3.건강, 4.심리, 5.특이사항, 6.다음일정 분리 관리
 *              - 관리자 비대면 전화상담 수혜관리카드 직접 등록 (게이트키퍼 5대 지표)
 *              - 다차원 검색/필터링 및 표준 페이지네이션 탑재
 */

import { notifier } from '../../utils/notifier.js';
import { maskBirth } from '../../utils/mask.js';
import { BeneficiaryManageModal } from '../modals/beneficiaryManageModal.js?v=3.9.33';

export class BeneficiaryCardsPane {
  constructor(options = {}) {
    this.container = null;
    this.cases = options.cases || [];
    this.cards = [];
    this.onScheduleUpdated = options.onScheduleUpdated || null;
    this.manageModal = null;

    this.filters = {
      inspector: 'all',
      method: 'all',
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

  setCases(cases) {
    this.cases = cases || [];
    this.render();
  }

  /**
   * 페인 마운트 및 초기화
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

    // 모달 분리 인스턴스화
    this.manageModal = new BeneficiaryManageModal({
      onSaved: (updatedCase, newCard) => {
        const existingIdx = this.cards.findIndex(c => c.case_uid === updatedCase.uid);
        if (existingIdx !== -1) {
          this.cards[existingIdx].next_date = updatedCase.nextScheduleDate;
          this.cards[existingIdx].health_check = newCard.health_check;
          this.cards[existingIdx].health_note = newCard.health_note;
          this.cards[existingIdx].psycho_check = newCard.psycho_check;
          this.cards[existingIdx].psycho_note = newCard.psycho_note;
          this.cards[existingIdx].inspector = updatedCase.nextScheduleInspector;
        }
        this.cards.unshift(newCard);
        this.render();
        if (this.onScheduleUpdated) {
          this.onScheduleUpdated(updatedCase);
        }
      }
    });

    await this.loadCardsFromD1();
    this.bindEvents();
    this.render();
  }

  /**
   * D1 실시간 모니터링 카드 수신
   */
  async loadCardsFromD1() {
    try {
      const res = await fetch('/api/v1/monitoring-cards');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          this.cards = json.data;
        }
      }
    } catch (e) {
      console.warn('[BeneficiaryCardsPane] D1 loadCards error:', e);
    }

    // 초기 데이터가 부족할 경우 cases 기반으로 매핑 보강
    if (this.cards.length === 0 && this.cases.length > 0) {
      this.cards = this.cases.map((c, i) => ({
        card_uid: `CRD-INIT-${c.uid}`,
        case_uid: c.uid,
        org_uid: 'O-28-237-01',
        participant_uid: 'U-28-237-01-GD-001',
        check_date: `${c.date} 10:00`,
        contact_method: i % 2 === 0 ? '방문' : '통화',
        health_check: c.grade === 'critical' ? '악화' : c.grade === 'high' ? '보통' : '양호',
        health_note: c.causesSummary || '식사 및 복약 확인',
        psycho_check: c.grade === 'critical' ? '우울' : c.grade === 'high' ? '불안' : '안정',
        psycho_note: '말벗 상담 및 정서 확인',
        living_check: (c.living || '').includes('반지하') ? '심각' : '청결',
        living_note: c.living || '',
        anomaly_check: c.grade === 'critical' ? '고립조짐' : '없음',
        anomaly_note: '',
        etc_check: '없음',
        etc_note: '',
        next_date: '2026-10-28',
        inspector: (c.inspectors || ['김조사', '박살핌']).join(', ')
      }));
    }
  }

  /**
   * 필터링된 관리카드 리스트 반환
   */
  getFilteredCards() {
    return this.cards.filter(crd => {
      const targetCase = this.cases.find(c => c.uid === crd.case_uid) || {};

      // 1. 참여자 필터 (담당 살핌단)
      if (this.filters.inspector !== 'all') {
        const inspector = crd.inspector || '';
        if (!inspector.includes(this.filters.inspector)) return false;
      }

      // 2. 접촉방식 필터 (방문 vs 통화)
      if (this.filters.method !== 'all') {
        if (crd.contact_method !== this.filters.method) return false;
      }

      // 3. 확인기간 필터 (YYYY-MM-DD 범위)
      if (this.filters.startDate && this.filters.endDate) {
        const checkDate = (crd.check_date || '').slice(0, 10);
        if (checkDate) {
          if (checkDate < this.filters.startDate || checkDate > this.filters.endDate) {
            return false;
          }
        }
      }

      // 4. 위험등급 필터 (critical, high, mid, clean)
      if (this.filters.grade !== 'all') {
        if (targetCase.grade !== this.filters.grade) return false;
      }

      // 5. 키워드 검색 (성명, 관리번호, 주소)
      if (this.filters.keyword) {
        const kw = this.filters.keyword.replace(/\s+/g, '').toLowerCase();
        const rawNm = (targetCase.rawName || targetCase.name || '').replace(/\s+/g, '').toLowerCase();
        const rawAddr = (targetCase.rawAddress || targetCase.address || '').replace(/\s+/g, '').toLowerCase();
        const uid = (crd.case_uid || '').toLowerCase();
        const shortUid = uid.replace(/^c-28-237-01-/, '');

        const match = rawNm.includes(kw) || rawAddr.includes(kw) || uid.includes(kw) || shortUid.includes(kw);
        if (!match) return false;
      }

      return true;
    });
  }

  render() {
    const tbody = document.getElementById('tbodyBeneficiaryCards');
    if (!tbody) return;

    const filtered = this.getFilteredCards();
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
            검색 및 필터 조건에 부합하는 수혜자 관리카드 이력이 없습니다.
          </td>
        </tr>
      `;
      this.renderPagination(0, 1);
      return;
    }

    tbody.innerHTML = pagedItems.map((crd, idx) => {
      const targetCase = this.cases.find(c => c.uid === crd.case_uid) || {
        name: '대상자',
        gender: '남',
        age: 75,
        address: '인천광역시 부평구 산곡동',
        uid: crd.case_uid,
        inspectors: ['김조사', '박살핌']
      };

      const isVisit = crd.contact_method === '방문';

      return `
        <tr style="height: 52px;">
          <td style="text-align: center; font-weight: 700; color: #475569; vertical-align: middle;">${startIndex + idx + 1}</td>
          <td class="text-left" style="vertical-align: middle; padding-left: 14px; white-space: nowrap;">
            <strong style="color: #0f172a; font-size: 13px;">${targetCase.name}</strong>
            <span style="font-size: 11.5px; color: #64748b; margin-left: 4px;">(${targetCase.gender}/${targetCase.age}세)</span>
          </td>
          <td style="text-align: center; font-family: monospace; font-size: 11.5px; color: #334155; vertical-align: middle;">
            ${(crd.check_date || '').slice(0, 16)}
          </td>
          <td style="text-align: center; vertical-align: middle;">
            <span style="display: inline-block; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 4px; ${isVisit ? 'color:#15803d; background:#f0fdf4; border:1px solid #bbf7d0;' : 'color:#1d4ed8; background:#eff6ff; border:1px solid #bfdbfe;'}">
              ${isVisit ? '대면 방문' : '비대면 통화'}
            </span>
          </td>
          <td style="text-align: center; font-size: 11.5px; font-weight: 700; color: #1e40af; vertical-align: middle;">
            ${crd.next_date || targetCase.nextScheduleDate || '2026-10-28'}
          </td>
          <td style="text-align: center; font-size: 11.5px; color: #475569; vertical-align: middle;">
            ${crd.inspector || (targetCase.inspectors || ['김조사', '박살핌']).join(', ')}
          </td>
          <td style="text-align: center; vertical-align: middle;">
            <button type="button" class="btn-table-sm" data-view-bene-manage="${crd.case_uid}" style="font-weight: 700;">관리</button>
          </td>
        </tr>
      `;
    }).join('');

    this.renderPagination(totalItems, totalPages);

    // [관리] 버튼 클릭 바인딩
    tbody.querySelectorAll('button[data-view-bene-manage]').forEach(btn => {
      btn.onclick = () => {
        const uid = btn.getAttribute('data-view-bene-manage');
        const targetCase = this.cases.find(c => c.uid === uid) || { uid, name: '대상자' };
        if (this.manageModal) {
          this.manageModal.open(targetCase, this.cards);
        }
      };
    });
  }

  /**
   * 대규모 데이터 표준 페이지네이션 컨트롤
   */
  renderPagination(totalItems, totalPages) {
    const container = document.getElementById('benePagination');
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
        <button type="button" class="page-btn ${p === currentPage ? 'active' : ''}" data-bene-page="${p}">${p}</button>
      `);
    }

    const showNav = totalPages > 1;
    const navHtml = showNav ? `
      <div class="table-pagination-nav">
        <button type="button" class="page-btn" id="btnBenePageFirst" ${currentPage === 1 ? 'disabled' : ''} title="처음">«</button>
        <button type="button" class="page-btn" id="btnBenePagePrev" ${currentPage === 1 ? 'disabled' : ''} title="이전">‹</button>
        ${pageButtons.join('')}
        <button type="button" class="page-btn" id="btnBenePageNext" ${currentPage === totalPages ? 'disabled' : ''} title="다음">›</button>
        <button type="button" class="page-btn" id="btnBenePageLast" ${currentPage === totalPages ? 'disabled' : ''} title="끝">»</button>
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
        <select class="filter-ctrl" id="selBenePageSize" style="height: 28px; font-size: 11.5px; padding: 2px 6px;">
          <option value="10" ${pageSize === 10 ? 'selected' : ''}>10개씩 보기</option>
          <option value="20" ${pageSize === 20 ? 'selected' : ''}>20개씩 보기</option>
          <option value="50" ${pageSize === 50 ? 'selected' : ''}>50개씩 보기</option>
        </select>
      </div>
    `;

    const selPageSize = container.querySelector('#selBenePageSize');
    if (selPageSize) {
      selPageSize.onchange = (e) => {
        this.pagination.pageSize = parseInt(e.target.value, 10);
        this.pagination.currentPage = 1;
        this.render();
      };
    }

    container.querySelectorAll('.page-btn[data-bene-page]').forEach(btn => {
      btn.onclick = () => {
        const p = parseInt(btn.getAttribute('data-bene-page'), 10);
        if (p !== this.pagination.currentPage) {
          this.pagination.currentPage = p;
          this.render();
        }
      };
    });

    const btnFirst = container.querySelector('#btnBenePageFirst');
    const btnPrev = container.querySelector('#btnBenePagePrev');
    const btnNext = container.querySelector('#btnBenePageNext');
    const btnLast = container.querySelector('#btnBenePageLast');

    if (btnFirst) btnFirst.onclick = () => { this.pagination.currentPage = 1; this.render(); };
    if (btnPrev) btnPrev.onclick = () => { if (this.pagination.currentPage > 1) { this.pagination.currentPage--; this.render(); } };
    if (btnNext) btnNext.onclick = () => { if (this.pagination.currentPage < totalPages) { this.pagination.currentPage++; this.render(); } };
    if (btnLast) btnLast.onclick = () => { this.pagination.currentPage = totalPages; this.render(); };
  }

  /**
   * 비대면 전화상담 수혜관리카드 작성 모달 오픈
   */
  openCallCardModal() {
    const modal = document.getElementById('beneCallCardModal');
    if (!modal) return;

    // 대상자 드롭다운 채우기
    const selTarget = document.getElementById('selCallCardTarget');
    if (selTarget) {
      selTarget.innerHTML = this.cases.map(c => `
        <option value="${c.uid}">${c.name} (${c.gender}/${c.age}세, ${c.address ? c.address.split(' ')[2] || '' : ''}) [${c.uid}]</option>
      `).join('');
    }

    // 일시 현재 시각 기본 세팅
    const inpDate = document.getElementById('inpCallCardDate');
    if (inpDate) {
      const now = new Date();
      const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      inpDate.value = localIso;
    }

    modal.classList.add('active');
  }

  closeCallCardModal() {
    const modal = document.getElementById('beneCallCardModal');
    if (modal) modal.classList.remove('active');
  }

  /**
   * 이벤트 바인딩
   */
  bindEvents() {
    // 1. 검색 및 필터 이벤트
    const filterInspector = document.getElementById('beneCardFilterInspector');
    const filterMethod = document.getElementById('beneCardFilterMethod');
    const dateStart = document.getElementById('beneCardDateStart');
    const dateEnd = document.getElementById('beneCardDateEnd');
    const filterGrade = document.getElementById('beneCardFilterGrade');
    const searchKw = document.getElementById('beneCardSearchKeyword');
    const btnReset = document.getElementById('btnResetBeneCardFilter');

    if (filterInspector) {
      filterInspector.onchange = () => {
        this.filters.inspector = filterInspector.value;
        this.pagination.currentPage = 1;
        this.render();
      };
    }

    if (filterMethod) {
      filterMethod.onchange = () => {
        this.filters.method = filterMethod.value;
        this.pagination.currentPage = 1;
        this.render();
      };
    }

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

    if (filterGrade) {
      filterGrade.onchange = () => {
        this.filters.grade = filterGrade.value;
        this.pagination.currentPage = 1;
        this.render();
      };
    }

    if (searchKw) {
      searchKw.oninput = () => {
        this.filters.keyword = searchKw.value.trim();
        this.pagination.currentPage = 1;
        this.render();
      };
    }

    if (btnReset) {
      btnReset.onclick = () => {
        if (filterInspector) filterInspector.value = 'all';
        if (filterMethod) filterMethod.value = 'all';
        if (dateStart) dateStart.value = '2026-09-01';
        if (dateEnd) dateEnd.value = '2026-10-31';
        if (filterGrade) filterGrade.value = 'all';
        if (searchKw) searchKw.value = '';

        this.filters.inspector = 'all';
        this.filters.method = 'all';
        this.filters.startDate = '2026-09-01';
        this.filters.endDate = '2026-10-31';
        this.filters.grade = 'all';
        this.filters.keyword = '';

        this.pagination.currentPage = 1;
        this.render();
        notifier.toast('필터가 초기화되었습니다.', 'info');
      };
    }

    // 2. 상단 비대면 상담카드 작성 버튼
    const btnOpenCall = document.getElementById('btnOpenNewCallCardModal');
    if (btnOpenCall) {
      btnOpenCall.onclick = () => this.openCallCardModal();
    }

    // 3. 비대면 전화상담 모달 닫기 버튼들
    const btnCloseCall = document.getElementById('btnCloseBeneCallModal');
    const btnCancelCall = document.getElementById('btnCancelBeneCallModal');
    if (btnCloseCall) btnCloseCall.onclick = () => this.closeCallCardModal();
    if (btnCancelCall) btnCancelCall.onclick = () => this.closeCallCardModal();

    // 4. 비대면 전화상담 수혜카드 신규 저장 (D1 POST /api/v1/monitoring-cards 연동)
    const btnSaveCall = document.getElementById('btnSaveBeneCallModal');
    if (btnSaveCall) {
      btnSaveCall.onclick = async () => {
        const caseUid = document.getElementById('selCallCardTarget')?.value;
        const checkDate = document.getElementById('inpCallCardDate')?.value;
        const healthCheck = document.querySelector('input[name="callHealthCheck"]:checked')?.value || '양호';
        const healthNote = document.getElementById('inpCallHealthNote')?.value.trim();
        const psychoCheck = document.querySelector('input[name="callPsychoCheck"]:checked')?.value || '안정';
        const psychoNote = document.getElementById('inpCallPsychoNote')?.value.trim();
        const livingCheck = document.querySelector('input[name="callLivingCheck"]:checked')?.value || '청결';
        const livingNote = document.getElementById('inpCallLivingNote')?.value.trim();
        const anomalyCheck = document.querySelector('input[name="callAnomalyCheck"]:checked')?.value || '없음';
        const anomalyNote = document.getElementById('inpCallAnomalyNote')?.value.trim();
        const etcCheck = document.querySelector('input[name="callEtcCheck"]:checked')?.value || '없음';
        const etcNote = document.getElementById('inpCallEtcNote')?.value.trim();

        if (!caseUid) {
          notifier.toast('대상자를 선택해 주십시오.', 'error');
          return;
        }

        const payload = {
          caseUid,
          orgCode: 'O-28-237-01',
          participantUid: 'U-28-237-01-GD-001',
          contactMethod: '통화', // 비대면 전화통화
          healthCheck,
          healthNote,
          psychoCheck,
          psychoNote,
          livingCheck,
          livingNote,
          anomalyCheck,
          anomalyNote,
          etcCheck,
          etcNote
        };

        try {
          const res = await fetch('/api/v1/monitoring-cards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            const json = await res.json();
            if (json.success) {
              await this.loadCardsFromD1();
              this.render();
              this.closeCallCardModal();
              notifier.toast('비대면 전화상담 수혜관리카드가 D1 원장에 성공적으로 등록되었습니다.', 'success');
              return;
            }
          }
        } catch (e) {
          console.warn('[BeneficiaryCardsPane] D1 save call card error:', e);
        }

        // 로컬 fallback
        const newCard = {
          card_uid: `CRD-CALL-${Date.now()}`,
          case_uid: caseUid,
          org_uid: 'O-28-237-01',
          participant_uid: 'U-28-237-01-GD-001',
          check_date: checkDate ? checkDate.replace('T', ' ') : new Date().toISOString().slice(0, 16).replace('T', ' '),
          contact_method: '통화',
          health_check: healthCheck,
          health_note: healthNote,
          psycho_check: psychoCheck,
          psycho_note: psychoNote,
          living_check: livingCheck,
          living_note: livingNote,
          anomaly_check: anomalyCheck,
          anomaly_note: anomalyNote,
          etc_check: etcCheck,
          etc_note: etcNote,
          next_date: '2026-10-28',
          inspector: '센터 전담 관리자'
        };
        this.cards.unshift(newCard);
        this.render();
        this.closeCallCardModal();
        notifier.toast('비대면 전화상담 수혜관리카드가 등록되었습니다.', 'success');
      };
    }
  }
}
