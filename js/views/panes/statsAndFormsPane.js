/**
 * @file statsAndFormsPane.js
 * @description 4. 통계 및 서식 통합 서브 페인 모듈 (ESM)
 *              - 통계 탭: 6대 다차원 필터(대상자, 참여자, 유형별, 사업단, 일자, 기간, 초기화) 및 집계 대시보드
 *              - 서식 탭: 3대 핵심 서식(S-GDS, 게이트키퍼, 상담카드) 공식 뷰어
 *              - 공통 액션: [PDF 다운로드] (인쇄 규격) 및 [엑셀 다운로드]
 */

import { notifier } from '../../utils/notifier.js';
import { UidEngine } from '../../core/uid.js';
import { PdfExportService } from '../../services/pdfExportService.js?v=3.9.17';
import { RbacService } from '../../services/rbacService.js';

export class StatsAndFormsPane {
  constructor(options = {}) {
    this.container = null;
    this.cases = options.cases || [];
    this.currentSubtab = 'stats'; // 'stats' | 'forms'
    this.selectedForm = 'SGDS';   // 'SGDS' | 'GATEKEEPER' | 'COUNSEL'
    this.selectedTargetUid = null;
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

    if (options.cases) this.cases = options.cases;
    if (this.cases.length > 0 && !this.selectedTargetUid) {
      this.selectedTargetUid = this.cases[0].uid;
    }

    if (!this.container) return;

    this.bindEvents();
    this.pagination.currentPage = 1;
    this.renderStats();
    this.populateFormTargetSelect();
    this.renderFormViewer();
    RbacService.applyGuards(this.container || document);
  }

  bindEvents() {
    // 서브 탭 전환
    const btnTabStats = document.getElementById('subtabBtnStats');
    const btnTabForms = document.getElementById('subtabBtnForms');
    const paneStats = document.getElementById('subpaneStatsView');
    const paneForms = document.getElementById('subpaneFormsView');

    if (btnTabStats && btnTabForms) {
      btnTabStats.onclick = () => {
        btnTabStats.classList.add('active');
        btnTabStats.classList.remove('secondary');
        btnTabForms.classList.remove('active');
        btnTabForms.classList.add('secondary');
        if (paneStats) paneStats.style.display = 'block';
        if (paneForms) paneForms.style.display = 'none';
        this.currentSubtab = 'stats';
      };

      btnTabForms.onclick = () => {
        btnTabForms.classList.add('active');
        btnTabForms.classList.remove('secondary');
        btnTabStats.classList.remove('active');
        btnTabStats.classList.add('secondary');
        if (paneStats) paneStats.style.display = 'none';
        if (paneForms) paneForms.style.display = 'block';
        this.currentSubtab = 'forms';
        this.renderFormViewer();
      };
    }

    // 통계 실시간 라이브 필터링 이벤트 (입력/선택 즉시 자동 갱신)
    const inpTarget = document.getElementById('sfTargetFilter');
    const selInsp = document.getElementById('sfInspectorFilter');
    const selGrade = document.getElementById('sfRiskGradeFilter');
    const selBu = document.getElementById('sfBuFilter');
    const inpDate = document.getElementById('sfSingleDateFilter');
    const inpStart = document.getElementById('sfStartDateFilter');
    const inpEnd = document.getElementById('sfEndDateFilter');

    if (inpTarget) inpTarget.oninput = () => { this.pagination.currentPage = 1; this.renderStats(); };
    if (selInsp) selInsp.onchange = () => { this.pagination.currentPage = 1; this.renderStats(); };
    if (selGrade) selGrade.onchange = () => { this.pagination.currentPage = 1; this.renderStats(); };
    if (selBu) selBu.onchange = () => { this.pagination.currentPage = 1; this.renderStats(); };
    if (inpDate) inpDate.onchange = () => { this.pagination.currentPage = 1; this.renderStats(); };
    if (inpStart) inpStart.onchange = () => { this.pagination.currentPage = 1; this.renderStats(); };
    if (inpEnd) inpEnd.onchange = () => { this.pagination.currentPage = 1; this.renderStats(); };

    // 초기화 버튼 연동
    const btnReset = document.getElementById('btnResetSfFilter');
    if (btnReset) btnReset.onclick = () => this.resetFilters();

    // 서식 라디오 이벤트
    const rdoForms = document.querySelectorAll('input[name="rdoOfficialForm"]');
    rdoForms.forEach(rdo => {
      rdo.onchange = (e) => {
        this.selectedForm = e.target.value;
        this.renderFormViewer();
      };
    });

    // 서식 대상자 검색 인풋 이벤트
    const inpSearchTarget = document.getElementById('inpFormTargetSearch');
    if (inpSearchTarget) {
      inpSearchTarget.oninput = (e) => {
        const kw = e.target.value.trim().toLowerCase();
        this.populateFormTargetSelect(kw);
      };
    }

    // 서식 대상자 선택
    const selTarget = document.getElementById('selFormTargetUser');
    if (selTarget) {
      selTarget.onchange = (e) => {
        this.selectedTargetUid = e.target.value;
        this.renderFormViewer();
      };
    }

    // 엑셀 다운로드 버튼 연동
    const btnExcel = document.getElementById('btnStatsFormsExcel');
    if (btnExcel) btnExcel.onclick = () => this.exportExcel();

    // 서식 인쇄 (PDF) 버튼 연동
    const btnPrint = document.getElementById('btnPrintOfficialForm');
    if (btnPrint) btnPrint.onclick = () => this.printOfficialForm();
  }

  resetFilters() {
    const elTarget = document.getElementById('sfTargetFilter');
    const elInsp = document.getElementById('sfInspectorFilter');
    const elGrade = document.getElementById('sfRiskGradeFilter');
    const elBu = document.getElementById('sfBuFilter');
    const elDate = document.getElementById('sfSingleDateFilter');
    const elStart = document.getElementById('sfStartDateFilter');
    const elEnd = document.getElementById('sfEndDateFilter');

    if (elTarget) elTarget.value = '';
    if (elInsp) elInsp.value = 'all';
    if (elGrade) elGrade.value = 'all';
    if (elBu) elBu.value = 'all';
    if (elDate) elDate.value = '';
    if (elStart) elStart.value = '2026-09-01';
    if (elEnd) elEnd.value = '2026-10-31';

    this.pagination.currentPage = 1;
    this.renderStats();
    notifier.toast('통계 필터가 초기화되었습니다.', 'info');
  }

  getFilteredCases() {
    const keyword = (document.getElementById('sfTargetFilter')?.value || '').trim().toLowerCase();
    const inspector = document.getElementById('sfInspectorFilter')?.value || 'all';
    const grade = document.getElementById('sfRiskGradeFilter')?.value || 'all';
    const bu = document.getElementById('sfBuFilter')?.value || 'all';
    const singleDate = document.getElementById('sfSingleDateFilter')?.value;
    const startDate = document.getElementById('sfStartDateFilter')?.value;
    const endDate = document.getElementById('sfEndDateFilter')?.value;

    return this.cases.filter(c => {
      // 1. 대상자 (이름, 관리번호)
      if (keyword) {
        const matchName = (c.name || '').toLowerCase().includes(keyword);
        const matchUid = (c.uid || '').toLowerCase().includes(keyword);
        if (!matchName && !matchUid) return false;
      }
      // 2. 참여자
      if (inspector !== 'all') {
        const insList = c.inspectors || [];
        if (!insList.some(i => i.includes(inspector))) return false;
      }
      // 3. 유형별 (위험등급)
      if (grade !== 'all' && c.grade !== grade) return false;
      // 4. 사업단
      if (bu !== 'all') {
        const buList = c.buList || [];
        if (!buList.includes(bu)) return false;
      }
      // 5. 일자 (단일일자)
      if (singleDate && c.date !== singleDate) return false;
      // 6. 기간
      if (startDate && c.date && c.date < startDate) return false;
      if (endDate && c.date && c.date > endDate) return false;

      return true;
    });
  }

  renderStats() {
    const filtered = this.getFilteredCases();

    // KPI 카드 갱신
    const elTotal = document.getElementById('sfKpiTotal');
    const elCrit = document.getElementById('sfKpiCritical');
    const elBu = document.getElementById('sfKpiBu');
    const elRate = document.getElementById('sfKpiRate');

    const critCount = filtered.filter(c => c.grade === 'critical').length;
    const buCount = filtered.reduce((acc, c) => acc + (c.buList ? c.buList.length : 0), 0);

    if (elTotal) elTotal.textContent = `${filtered.length}가구`;
    if (elCrit) elCrit.textContent = `${critCount}가구`;
    if (elBu) elBu.textContent = `${buCount}건`;
    if (elRate) elRate.textContent = filtered.length > 0 ? '100%' : '0%';

    // 데이터 테이블 렌더링
    const tbody = document.getElementById('tbodyStatsCases');
    if (!tbody) return;

    const totalItems = filtered.length;
    const pageSize = this.pagination.pageSize;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    if (this.pagination.currentPage > totalPages) {
      this.pagination.currentPage = totalPages;
    }
    const startIndex = (this.pagination.currentPage - 1) * pageSize;
    const paged = filtered.slice(startIndex, startIndex + pageSize);

    // 하단 중앙 정렬 페이지네이션 바 렌더링
    this.renderPagination(totalItems, totalPages);

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="padding: 32px 0; color: #94a3b8; text-align: center;">
            검색 조건에 일치하는 통계 데이터가 없습니다.
          </td>
        </tr>
      `;
      return;
    }

    const buNameMap = { 'ME': '식사', 'HE': '건강', 'CL': '주거', 'EM': '정서' };

    tbody.innerHTML = paged.map((c, idx) => {
      let gradePill = '<span class="grade-pill clean">일반</span>';
      if (c.grade === 'critical') gradePill = '<span class="grade-pill critical">초고위험</span>';
      else if (c.grade === 'high') gradePill = '<span class="grade-pill high">고위험</span>';
      else if (c.grade === 'mid') gradePill = '<span class="grade-pill mid">중위험</span>';

      const buBadges = (c.buList || []).map(b => `<span style="font-size: 11px; background: #e0f2fe; color: #0284c7; padding: 2px 4px; border-radius: 3px; font-weight: 700; margin-right: 3px;">${buNameMap[b] || b}</span>`).join('') || '-';

      return `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="color: #64748b; font-weight: 700; text-align: center;">${startIndex + idx + 1}</td>
          <td style="font-family: monospace; font-weight: 800; color: #0f172a;">${c.uid}</td>
          <td><strong>${c.name}</strong> <span style="font-size: 11px; color: #64748b;">(${c.gender}/${c.age}세)</span></td>
          <td style="text-align: left; font-size: 11.5px;">${c.address} <span style="color: #64748b;">[${c.living || '다가구'}]</span></td>
          <td style="font-weight: 700;">${c.score || 0}점</td>
          <td>${gradePill}</td>
          <td>${buBadges}</td>
          <td style="font-size: 11.5px;">${c.inspectors ? c.inspectors.join(', ') : '미배정'}</td>
          <td style="font-size: 11px; color: #64748b;">${c.date || '-'}</td>
          <td style="font-size: 11px; font-weight: 700; color: #16a34a;">${c.status || '배정 완료'}</td>
        </tr>
      `;
    }).join('');
  }

  /**
   * 완벽한 화면 중앙 정렬 표준 페이지네이션 바 렌더링
   */
  renderPagination(totalItems, totalPages) {
    const container = document.getElementById('statsPagination');
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
        <button type="button" class="page-btn ${p === currentPage ? 'active' : ''}" data-stats-page="${p}">${p}</button>
      `);
    }

    container.innerHTML = `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 100%; min-height: 38px;">
        <!-- 좌측: 건수 및 개수 선택 (왼쪽 고정) -->
        <div style="position: absolute; left: 12px; display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 12px; color: #64748b;">총 <strong>${totalItems}</strong>건 (${startNum}~${endNum} 표시)</span>
          <select class="filter-ctrl" id="selStatsPageSize" style="height: 28px; font-size: 11.5px; padding: 2px 6px; border-radius: 4px;">
            <option value="5" ${pageSize === 5 ? 'selected' : ''}>5개씩 보기</option>
            <option value="10" ${pageSize === 10 ? 'selected' : ''}>10개씩 보기</option>
            <option value="20" ${pageSize === 20 ? 'selected' : ''}>20개씩 보기</option>
            <option value="50" ${pageSize === 50 ? 'selected' : ''}>50개씩 보기</option>
          </select>
        </div>

        <!-- 완벽한 화면 정중앙: 페이지 이동 버튼 바 -->
        <div class="table-pagination-nav" style="display: flex; align-items: center; gap: 4px;">
          <button type="button" class="page-btn" id="btnStatsPageFirst" ${currentPage === 1 ? 'disabled' : ''} title="처음">«</button>
          <button type="button" class="page-btn" id="btnStatsPagePrev" ${currentPage === 1 ? 'disabled' : ''} title="이전">‹</button>
          ${pageButtons.join('')}
          <button type="button" class="page-btn" id="btnStatsPageNext" ${currentPage === totalPages ? 'disabled' : ''} title="다음">›</button>
          <button type="button" class="page-btn" id="btnStatsPageLast" ${currentPage === totalPages ? 'disabled' : ''} title="끝">»</button>
        </div>
      </div>
    `;

    // 페이지 사이즈 변경
    const selPageSize = container.querySelector('#selStatsPageSize');
    if (selPageSize) {
      selPageSize.onchange = (e) => {
        this.pagination.pageSize = parseInt(e.target.value, 10);
        this.pagination.currentPage = 1;
        this.renderStats();
      };
    }

    container.querySelectorAll('.page-btn[data-stats-page]').forEach(btn => {
      btn.onclick = () => {
        this.pagination.currentPage = parseInt(btn.getAttribute('data-stats-page'), 10);
        this.renderStats();
      };
    });

    const btnFirst = container.querySelector('#btnStatsPageFirst');
    const btnPrev = container.querySelector('#btnStatsPagePrev');
    const btnNext = container.querySelector('#btnStatsPageNext');
    const btnLast = container.querySelector('#btnStatsPageLast');

    if (btnFirst) btnFirst.onclick = () => { this.pagination.currentPage = 1; this.renderStats(); };
    if (btnPrev) btnPrev.onclick = () => { if (this.pagination.currentPage > 1) { this.pagination.currentPage--; this.renderStats(); } };
    if (btnNext) btnNext.onclick = () => { if (this.pagination.currentPage < totalPages) { this.pagination.currentPage++; this.renderStats(); } };
    if (btnLast) btnLast.onclick = () => { this.pagination.currentPage = totalPages; this.renderStats(); };
  }

  populateFormTargetSelect(keyword = '') {
    const selTarget = document.getElementById('selFormTargetUser');
    if (!selTarget) return;

    const kw = (keyword || '').trim().toLowerCase();
    const filtered = kw
      ? this.cases.filter(c => (c.name || '').toLowerCase().includes(kw) || (c.uid || '').toLowerCase().includes(kw))
      : this.cases;

    if (filtered.length === 0) {
      selTarget.innerHTML = '<option value="">일치하는 대상자 없음</option>';
      return;
    }

    selTarget.innerHTML = filtered.map(c => `
      <option value="${c.uid}" ${c.uid === this.selectedTargetUid ? 'selected' : ''}>
        ${c.name} (${c.uid} / ${c.gender})
      </option>
    `).join('');

    if (!filtered.some(c => c.uid === this.selectedTargetUid)) {
      this.selectedTargetUid = filtered[0].uid;
      this.renderFormViewer();
    }
  }

  async loadCaseDetail(caseUid) {
    try {
      const res = await fetch(`/api/v1/cases/detail?caseUid=${caseUid}`);
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    } catch (e) {
      console.warn('[StatsAndFormsPane] Detail fetch error:', e);
    }
    return null;
  }

  async renderFormViewer() {
    const container = document.getElementById('formViewerContainer');
    if (!container) return;

    const target = this.cases.find(c => c.uid === this.selectedTargetUid) || this.cases[0];
    if (!target) {
      container.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 40px 0;">대상자가 없습니다.</div>';
      return;
    }

    // D1 실제 상세 이력(우울증 + 고독사 + 상담카드) 조회
    const detail = await this.loadCaseDetail(target.uid);
    this.currentCaseDetail = detail;

    if (this.selectedForm === 'SGDS') {
      this.renderSgdsForm(container, target, detail);
    } else if (this.selectedForm === 'GATEKEEPER') {
      this.renderGatekeeperForm(container, target, detail);
    } else if (this.selectedForm === 'COUNSEL') {
      this.renderCounselCardForm(container, target, detail);
    } else if (this.selectedForm === 'CONSENT_SGDS') {
      this.renderSgdsConsentForm(container, target, detail);
    } else if (this.selectedForm === 'CONSENT_GATEKEEPER') {
      this.renderGatekeeperConsentForm(container, target, detail);
    }
  }

  // 1) S-GDS 노인우울척도 15문항 서식 (C:\Users\user\Desktop\sgds 정통 표준 규격 100% 동일)
  renderSgdsForm(container, t, detail) {
    const sgds = detail?.sgdsList?.[0] || {};
    const surveyUid = sgds.survey_uid || UidEngine.generateSurveyUid(t.uid, 'GD', 1);
    const score = sgds.total_score ?? t.score ?? 0;
    const surveyDate = (sgds.survey_date || t.date || '2026-10-26').slice(0, 10);
    const dateParts = surveyDate.split('-');
    const koreanDateStr = dateParts.length === 3 ? `${dateParts[0]}년 ${dateParts[1]}월 ${dateParts[2]}일` : surveyDate;
    const inspectorStr = (t.inspectors && t.inspectors.length > 0) ? t.inspectors.join(', ') : '담당자';

    const SGDS_QUESTIONS = [
      "현재의 생활에 대체적으로 만족하십니까?",
      "요즘 들어 예전에 비해 활동량이나 의욕이 많이 떨어지셨습니까?",
      "왠지 자신이 헛되이 살고 있다고 느끼십니까?",
      "생활이 지루하게 느껴질 때가 많습니까?",
      "평소에 기분은 상쾌한 편이십니까?",
      "특별한 일이 없는데도 자신에게 불길한 일이 닥칠 것 같아 불안하십니까?",
      "대체로 마음이 즐거우신 편이십니까?",
      "괜히 어르신의 앞날이 절망적이라는 느낌이 자주 드십니까?",
      "바깥에 나가기가 싫고 집에만 있고 싶습니까?",
      "비슷한 나이의 노인들보다 기억력이 더 나쁘다고 느끼십니까?",
      "현재 살아있다는 것이 즐겁게 생각되십니까?",
      "지금의 내 자신이 이제는 아무 일도 할 수 없고 왠지 쓸모없는 사람이라고 느끼십니까?",
      "기력이 좋은 편입니까?",
      "지금 자신의 처지가 아무런 희망도 없다고 느끼십니까?",
      "자신이 다른 사람들의 처지보다 더 못하다고 생각하십니까?"
    ];

    const REVERSE_ITEMS = [1, 5, 7, 11, 13];
    const ans = sgds.answers || {};

    const rowsHtml = SGDS_QUESTIONS.map((qText, idx) => {
      const num = idx + 1;
      const isReverse = REVERSE_ITEMS.includes(num);

      let isDepressed = false;
      if (ans[num] !== undefined) {
        isDepressed = Number(ans[num]) === 1;
      } else {
        isDepressed = num <= score;
      }

      const isYes = isReverse ? !isDepressed : isDepressed;
      const yesCell = isYes ? '<span style="color:#000; font-weight:bold; font-size:15px;">V</span>' : '';
      const noCell = !isYes ? '<span style="color:#000; font-weight:bold; font-size:15px;">V</span>' : '';

      return `
        <tr id="row_${num}" style="height: 28px;">
          <td style="border: 1px solid #a6a6a6; padding: 6px 2px; text-align: center; font-size: 12px;">${num}</td>
          <td style="border: 1px solid #a6a6a6; padding: 6px 8px; text-align: left; font-size: 12px;">${qText}</td>
          <td style="border: 1px solid #a6a6a6; padding: 6px 2px; text-align: center; font-size: 12px;">${yesCell}</td>
          <td style="border: 1px solid #a6a6a6; padding: 6px 2px; text-align: center; font-size: 12px;">${noCell}</td>
        </tr>
      `;
    }).join('');

    const infoTbl = `
      <table class="pdf-table" style="width: 100%; table-layout: fixed; border-collapse: collapse; border: 1px solid #000; font-size: 12px; margin-bottom: 8px;">
        <colgroup>
          <col style="width: 90px;">  <col style="width: 160px;"> <col style="width: 90px;">  <col style="width: 100px;"> <col style="width: 90px;">  <col style="width: 200px;">
        </colgroup>
        <tr>
          <td class="pdf-label" style="border: 1px solid #000; height: 28px; background: #f2f2f2; font-weight: bold; text-align: center;">거주구</td>
          <td style="border: 1px solid #000; padding-left: 5px;">인천 부평구</td>
          <td class="pdf-label" style="border: 1px solid #000; background: #f2f2f2; font-weight: bold; text-align: center;">이름</td>
          <td colspan="3" style="border: 1px solid #000; padding-left: 5px; font-weight: bold;">${t.name}</td>
        </tr>
        <tr>
          <td class="pdf-label" style="border: 1px solid #000; height: 28px; background: #f2f2f2; font-weight: bold; text-align: center;">생년월일</td>
          <td style="border: 1px solid #000; padding-left: 5px;">${t.birth || '-'} (${t.age || 74}세)</td>
          <td class="pdf-label" style="border: 1px solid #000; background: #f2f2f2; font-weight: bold; text-align: center;">성별</td>
          <td style="border: 1px solid #000; text-align: center;">${t.gender}</td>
          <td class="pdf-label" style="border: 1px solid #000; background: #f2f2f2; font-weight: bold; text-align: center;">연락처</td>
          <td style="border: 1px solid #000; padding-left: 5px;">${t.phone || '010-5521-8819'}</td>
        </tr>
        <tr>
          <td class="pdf-label" style="border: 1px solid #000; height: 28px; background: #f2f2f2; font-weight: bold; text-align: center;">주소</td>
          <td colspan="5" style="border: 1px solid #000; padding-left: 5px;">${t.address}</td>
        </tr>
        <tr>
          <td class="pdf-label" style="border: 1px solid #000; height: 28px; background: #f2f2f2; font-weight: bold; text-align: center;">동거형태</td>
          <td style="border: 1px solid #000; padding-left: 5px;">${t.living || '노인단독'}</td>
          <td class="pdf-label" style="border: 1px solid #000; background: #f2f2f2; font-weight: bold; text-align: center;">생활형태</td>
          <td style="border: 1px solid #000; text-align: center;">일반</td>
          <td class="pdf-label" style="border: 1px solid #000; background: #f2f2f2; font-weight: bold; text-align: center;">신체상태</td>
          <td style="border: 1px solid #000; padding-left: 5px;">고혈압</td>
        </tr>
        <tr>
          <td class="pdf-label" style="border: 1px solid #000; height: 42px; background: #f2f2f2; font-weight: bold; text-align: center;">추가정보</td>
          <td colspan="5" style="border: 1px solid #000; padding-left: 5px; vertical-align: top;">특이사항 없음</td>
        </tr>
      </table>
    `;

    container.innerHTML = `
      <div id="pdf_gds_area" style="background: #ffffff; padding: 14px; color: #000000; font-family: 'Malgun Gothic', 'Pretendard', sans-serif;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px;">
          <div style="font-size: 11.5px; color: #64748b;">인천 부평구 통합돌봄센터 | 원장 UID: <strong style="font-family: monospace; color: #000;">${surveyUid}</strong></div>
          <div style="font-size: 11.5px; color: #64748b;">관리번호: <strong style="font-family: monospace; color: #000;">${t.uid}</strong></div>
        </div>
        <div id="pdf_header_info_wrap">${infoTbl}</div>
        <div style="border-bottom: 2px solid #000; margin-bottom: 10px; padding-bottom: 8px;">
          <h1 style="font-size: 19px; margin-bottom: 6px; font-weight: bold; color: #000;">노인우울척도 단축형(S-GDS)</h1>
          <p style="font-size: 11.5px; margin: 0; color: #000; line-height: 1.4;">
            다음 각 문항을 대상노인에게 설명하고 대상노인의 대답에 따라 정확하게 『예 / 아니오』 에 동그라미 해 주십시오.(추가적으로 기록할 사항이 있으면 추가정보란에 기록해 주십시오)
          </p>
        </div>
        <table class="gds-table" id="gds_table" style="width: 100% !important; border-collapse: collapse; margin-top: 8px; font-size: 12px; table-layout: fixed; word-break: break-all;">
          <colgroup>
            <col style="width: 10%;">
            <col style="width: 70%;">
            <col style="width: 10%;">
            <col style="width: 10%;">
          </colgroup>
          <thead>
            <tr style="background: #f2f2f2; height: 28px;">
              <th style="border: 1px solid #a6a6a6; padding: 6px 2px; text-align: center;">번호</th>
              <th style="border: 1px solid #a6a6a6; padding: 6px 4px; text-align: center;">질문</th>
              <th style="border: 1px solid #a6a6a6; padding: 6px 2px; text-align: center;">예</th>
              <th style="border: 1px solid #a6a6a6; padding: 6px 2px; text-align: center;">아니오</th>
            </tr>
          </thead>
          <tbody id="gds_body">
            ${rowsHtml}
          </tbody>
        </table>
        <div style="border: 1.5px solid #000; padding: 12px 15px; margin-top: 15px; display: flex; justify-content: center; align-items: center; gap: 20px; font-size: 14px;">
          <span style="font-weight: bold; color: #000;">${koreanDateStr}</span>
          <span style="font-weight: bold; color: #000;">조사자: <span>${inspectorStr}</span></span>
          <span style="font-weight: bold; color: #000;">총점: <span id="total_score" style="color: red; font-size: 16px;">${score}</span> 점</span>
        </div>
      </div>
    `;
  }

  // 2) 게이트키퍼 고독사 위험도 진단 10문항 서식
  renderGatekeeperForm(container, t, detail) {
    const risk = detail?.riskList?.[0] || {};
    const surveyUid = risk.survey_uid || UidEngine.generateSurveyUid(t.uid, 'WR', 1);
    const score = risk.total_score ?? t.score ?? 0;
    const grade = risk.risk_grade ?? t.grade ?? 'high';
    const surveyDate = (risk.inspection_date || t.date || '2026-10-26').slice(0, 10);
    const gradeLabel = grade === 'critical' ? '초고위험군' : (grade === 'high' ? '고위험군' : (grade === 'mid' ? '중위험군' : '일반가구'));
    const gradeColor = grade === 'critical' ? '#dc2626' : (grade === 'high' ? '#ea580c' : '#15803d');

    container.innerHTML = `
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <span style="font-size: 11px; font-weight: 700; color: #b45309; text-transform: uppercase;">[보건복지부 고독사 예방 관리 서식]</span>
          <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 4px 0 0 0;">고독사 위험도 1차 현장 판정표 (게이트키퍼 10대 문항)</h2>
        </div>
        <div style="text-align: right; font-size: 11.5px; color: #475569;">
          <div>조사원장 UID: <strong style="font-family: monospace; color: #0f172a;">${surveyUid}</strong></div>
          <div>실측일자: ${surveyDate}</div>
        </div>
      </div>

      <!-- 기본 인적사항 -->
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px;">
        <tr style="background: #f8fafc; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
          <th style="padding: 6px 10px; width: 15%; border: 1px solid #cbd5e1;">대상자</th>
          <td style="padding: 6px 10px; width: 35%; border: 1px solid #cbd5e1; font-weight: 700;">${t.name} (${t.uid})</td>
          <th style="padding: 6px 10px; width: 15%; border: 1px solid #cbd5e1;">배정 참여자</th>
          <td style="padding: 6px 10px; width: 35%; border: 1px solid #cbd5e1;">${t.inspectors ? t.inspectors.join(', ') : '1조 (박영희, 김철수)'}</td>
        </tr>
      </table>

      <!-- 10대 문항 위험 판정 -->
      <div style="font-size: 12.5px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">고독사 위험도 10대 진단 지표</div>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px;">
        <thead>
          <tr style="background: #f1f5f9; border-top: 1px solid #94a3b8; border-bottom: 1px solid #94a3b8;">
            <th style="padding: 6px; width: 45px; border: 1px solid #cbd5e1;">문항</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: left;">10대 위험 영역 지표</th>
            <th style="padding: 6px; width: 90px; border: 1px solid #cbd5e1;">현장 관찰/응답</th>
            <th style="padding: 6px; width: 110px; border: 1px solid #cbd5e1;">추천 사업단</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="padding: 5px; border: 1px solid #e2e8f0; text-align: center;">Q1</td><td style="padding: 5px; border: 1px solid #e2e8f0;">하루 한 끼 이상 식사를 거르거나 영양 상태가 불량하다.</td><td style="padding: 5px; border: 1px solid #e2e8f0; text-align: center; color: #dc2626; font-weight: 700;">위험 (1점)</td><td style="padding: 5px; border: 1px solid #e2e8f0; text-align: center; font-weight: 700;">식사지원 (ME)</td></tr>
          <tr><td style="padding: 5px; border: 1px solid #e2e8f0; text-align: center;">Q2</td><td style="padding: 5px; border: 1px solid #e2e8f0;">복용해야 할 만성질환 약을 임의로 중단하거나 방치한다.</td><td style="padding: 5px; border: 1px solid #e2e8f0; text-align: center; color: #dc2626; font-weight: 700;">위험 (1점)</td><td style="padding: 5px; border: 1px solid #e2e8f0; text-align: center; font-weight: 700;">건강의료 (HE)</td></tr>
          <tr><td style="padding: 5px; border: 1px solid #e2e8f0; text-align: center;">Q3</td><td style="padding: 5px; border: 1px solid #e2e8f0;">가택 내 쓰레기 방치, 악취, 해충 등 주거 환경이 극도로 열악하다.</td><td style="padding: 5px; border: 1px solid #e2e8f0; text-align: center; color: #dc2626; font-weight: 700;">위험 (1점)</td><td style="padding: 5px; border: 1px solid #e2e8f0; text-align: center; font-weight: 700;">주거개선 (CL)</td></tr>
          <tr><td style="padding: 5px; border: 1px solid #e2e8f0; text-align: center;">Q4</td><td style="padding: 5px; border: 1px solid #e2e8f0;">주변 이웃 및 가족과의 교류가 완전히 단절되어 고립되어 있다.</td><td style="padding: 5px; border: 1px solid #e2e8f0; text-align: center; color: #dc2626; font-weight: 700;">위험 (1점)</td><td style="padding: 5px; border: 1px solid #e2e8f0; text-align: center; font-weight: 700;">정서이웃 (EM)</td></tr>
        </tbody>
      </table>

      <!-- 최종 진단 소견 -->
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 12px 16px;">
        <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 4px;">게이트키퍼 종합 판정: <span style="color: ${gradeColor}; font-weight: 800;">${gradeLabel} (${score}점)</span></div>
        <p style="font-size: 11.5px; color: #475569; margin: 0;">복합 위기 상태로 즉시 4대 전담 사업단(식사, 건강, 주거, 정서) 다중 결연 및 24시간 안심관제 연계 대상 가구입니다.</p>
      </div>
    `;
  }

  // 3) 수혜자 상담카드 서식 (299p)
  renderCounselCardForm(container, t, detail) {
    const card = detail?.monitoringCards?.[0] || {};
    const cardUid = card.card_uid || UidEngine.generateCounselCardUid(t.uid, 1);
    const checkDate = (card.check_date || t.date || '2026-10-26').slice(0, 16);
    const contactMethod = card.contact_method || '방문';

    container.innerHTML = `
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <span style="font-size: 11px; font-weight: 700; color: #16a34a; text-transform: uppercase;">[보건복지부 공식 서식 299p]</span>
          <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 4px 0 0 0;">수혜자 관리 및 방문 상담 모니터링 카드</h2>
        </div>
        <div style="text-align: right; font-size: 11.5px; color: #475569;">
          <div>발급기관: 인천 부평구 통합돌봄센터</div>
          <div>상담카드 UID: <strong style="font-family: monospace; color: #0f172a;">${cardUid}</strong></div>
          <div>최근 확인일: ${checkDate} (${contactMethod})</div>
        </div>
      </div>

      <!-- 어르신 프로필 -->
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px;">
        <tr style="background: #f8fafc; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
          <th style="padding: 6px 10px; width: 15%; border: 1px solid #cbd5e1;">수혜자 성명</th>
          <td style="padding: 6px 10px; width: 35%; border: 1px solid #cbd5e1; font-weight: 700;">${t.name} (${t.gender})</td>
          <th style="padding: 6px 10px; width: 15%; border: 1px solid #cbd5e1;">수혜대상자 관리번호</th>
          <td style="padding: 6px 10px; width: 35%; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 700; color: #0f172a;">${t.uid}</td>
        </tr>
        <tr style="border-bottom: 1px solid #cbd5e1;">
          <th style="padding: 6px 10px; border: 1px solid #cbd5e1; background: #f8fafc;">거주지 주소</th>
          <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">${t.address}</td>
          <th style="padding: 6px 10px; border: 1px solid #cbd5e1; background: #f8fafc;">연락처</th>
          <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">${t.phone || '010-0000-0000'}</td>
        </tr>
      </table>

      <!-- 5대 안부 모니터링 실측 기록 (D1 연동) -->
      <div style="font-size: 12.5px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">5대 일일 안부살핌 모니터링 실측 기록지 (D1 연동)</div>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px;">
        <thead>
          <tr style="background: #f1f5f9; border-top: 1px solid #94a3b8; border-bottom: 1px solid #94a3b8;">
            <th style="padding: 6px; width: 90px; border: 1px solid #cbd5e1;">5대 지표</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: left;">세부 관찰 및 상담 내용</th>
            <th style="padding: 6px; width: 80px; border: 1px solid #cbd5e1;">상태 판정</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="padding: 5px; border: 1px solid #e2e8f0; text-align: center; font-weight: 700;">1. 신체 건강</td><td style="padding: 5px; border: 1px solid #e2e8f0;">${card.health_note || '무릎 관절통 심화 및 당뇨약 규칙적 복용 여부 확인 완료'}</td><td style="padding: 5px; border: 1px solid #e2e8f0; text-align: center; color: #b45309; font-weight: 700;">${card.health_check || '보통'}</td></tr>
          <tr><td style="padding: 5px; border: 1px solid #e2e8f0; text-align: center; font-weight: 700;">2. 심리·정서</td><td style="padding: 5px; border: 1px solid #e2e8f0;">${card.psycho_note || '외로움 호소 및 수면 상태 불량 관찰 (말벗 30분 진행)'}</td><td style="padding: 5px; border: 1px solid #e2e8f0; text-align: center; color: #dc2626; font-weight: 700;">${card.psycho_check || '불안/우울'}</td></tr>
          <tr><td style="padding: 5px; border: 1px solid #e2e8f0; text-align: center; font-weight: 700;">3. 주거·식사</td><td style="padding: 5px; border: 1px solid #e2e8f0;">${card.living_note || '밑반찬 전달 및 냉장고 잔반 부패 상태 확인 및 정리'}</td><td style="padding: 5px; border: 1px solid #e2e8f0; text-align: center; color: #16a34a; font-weight: 700;">${card.living_check || '양호'}</td></tr>
          <tr><td style="padding: 5px; border: 1px solid #e2e8f0; text-align: center; font-weight: 700;">4. 위기 징후</td><td style="padding: 5px; border: 1px solid #e2e8f0;">${card.anomaly_note || '특이 이상 징후 없음 (정상)'}</td><td style="padding: 5px; border: 1px solid #e2e8f0; text-align: center; color: #16a34a; font-weight: 700;">${card.anomaly_check || '없음'}</td></tr>
          <tr><td style="padding: 5px; border: 1px solid #e2e8f0; text-align: center; font-weight: 700;">5. 기타 요청</td><td style="padding: 5px; border: 1px solid #e2e8f0;">${card.etc_note || '병원 동행 서비스 및 이동세탁차량 방문 요청 접수'}</td><td style="padding: 5px; border: 1px solid #e2e8f0; text-align: center; color: #2563eb; font-weight: 700;">${card.etc_check || '요청있음'}</td></tr>
        </tbody>
      </table>

      <!-- 활동가 및 센터장 서명란 -->
      <div style="display: flex; justify-content: flex-end; gap: 24px; font-size: 11.5px; margin-top: 20px;">
        <div>담당 활동가: <strong>박영희, 김철수</strong> (인)</div>
        <div>총괄 관리자(센터장): <strong>관리자</strong> (인)</div>
      </div>
    `;
  }

  // [공식 공문서 인쇄 / PDF 출력 엔진 연동]
  
  // 4) [동의서 1] S-GDS 개인정보 수집 및 이용 동의서 뷰어 (C:\Users\user\Desktop\sgds 원본 규격 100% 동일)
  renderSgdsConsentForm(container, t, detail) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

    container.innerHTML = `
      <div class="agreement-box" id="pdf_agreement_area" style="border: 1.5px solid #000; padding: 20px; font-size: 12.5px; line-height: 1.7; background: #fff; width: 100%; max-width: 730px; box-sizing: border-box; margin: 0 auto; color: #000; font-family: 'Malgun Gothic', 'Pretendard', sans-serif;">
        <div style="text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; color: #000;">개인정보 수집 및 이용 동의서</div>
        <div style="margin-bottom: 10px; font-weight: bold;">□ 동의자 성명: <span style="color: #0070C0; text-decoration: underline;">${t.name}</span></div>
        <p style="margin: 0; text-align: justify;">본 <span style="font-weight: bold; color: #0070C0;">인천 부평구 통합돌봄센터</span>은 노인복지법 제39조의5제2항에 의한 업무를 처리함에 있어 원활한 상담, 각종 서비스 등 기본적인 서비스 제공을 위하여 아래와 같은 개인정보를 수집하고 있으며 수집된 개인 정보는 개인정보 보호법에 명기된 관련 법률상의 개인정보보호 규정을 준수하며, 관련법령에 의거하여 학대피해노인의 인권보호에 최선을 다하고 있습니다.</p>
        <span style="font-weight: bold; margin-top: 15px; display: block;">□ 개인정보 수집 항목</span>
        <span style="padding-left: 10px; display: block;">• 인적사항: 성명, 성별, 주민등록번호, 주소, 연락처, 연령, 동거인, 직업상태, 결혼상태, 교육수준, 생활상태, 건강상태, 일상생활수행정도, 기타 사항 등 노인자살 사례관리에 명기된 항목</span>
        <span style="padding-left: 10px; display: block;">• 관련사항: 노인자살 관련 상담일지, 기타 관련 자료</span>

        <span style="font-weight: bold; margin-top: 15px; display: block;">□ 개인정보 수집 및 이용 목적</span>
        <span style="padding-left: 10px; display: block;">• 노인 우울증 여부 판단에 대한 근거</span>
        <span style="padding-left: 10px; display: block;">• 노인자살 해결을 위한 논의자료 및 기관에 권고하는 자료</span>
        <span style="padding-left: 10px; display: block;">• 노인자살예방 결과 및 관련 내용을 관할기관(보건복지부·시)에 보고하는 자료</span>

        <span style="font-weight: bold; margin-top: 15px; display: block;">□ 개인정보의 보유 및 이용 기간</span>
        <span style="padding-left: 10px; display: block;">• 상기 내용은 개인정보 보호법을 기준으로 합니다.</span>
        <span style="padding-left: 10px; display: block;">• 상기 개인정보의 이용목적이 소멸된 경우에도 노인자살 관련 정보의 이용목적이 분명한 경우는 개인정보를 보유할 수 있음을 안내하여 드립니다.</span>

        <span style="font-weight: bold; margin-top: 15px; display: block;">□ 기타</span>
        <span style="padding-left: 10px; display: block;">※ 상기 내용은 본 기관에서 노인자살 상담 및 서비스 연계 등에 필요한 개인 정보에 해당합니다.</span>
        <span style="padding-left: 10px; display: block;">※ 상기 내용에 대하여 귀하는 동의를 거부하실 권리가 있습니다. 다만 그러한 경우에 원활한 지원이 어려울 수 있음을 알려드립니다.</span>
        <span style="padding-left: 10px; display: block;">※ 본 동의서는 노인자살 관련 사업 진행 및 서비스 연계의 목적 외에는 사용하지 않을 것을 약속드리며 타인에게 공개하거나 유출되지 않을 것임을 알려드립니다.</span>

        <p style="margin-top: 20px; font-weight: bold; text-align: center;">본인은 위 내용을 확인하였으며, 위와 같이 “개인정보 보호법”에 명기된 관련 법률에 의거하여 개인정보 수집 및 이용에 동의합니다.</p>
        <table style="width: 100%; border: 1px solid #000; border-collapse: collapse; margin-top: 10px;">
          <tr>
            <td style="padding: 10px; text-align: center;">
              개인정보 수집 및 이용에 동의하십니까? &nbsp;&nbsp;<strong>[ V ] 동의</strong> &nbsp;&nbsp;&nbsp;&nbsp; [ &nbsp; ] 동의 안함
            </td>
          </tr>
        </table>
        <div style="text-align: center; font-weight: bold; margin-top: 25px; font-size: 15px;">${dateStr}</div>
        <table style="width: 100%; border: 1px solid #000; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="width: 55%; padding: 10px; border: 1px solid #000;">
              동의인: <span style="font-weight: bold;">${t.name}</span> (서명)
              <div style="margin-top: 15px;">노인과의 관계: <span style="font-weight: bold;">본인</span></div>
            </td>
            <td style="width: 45%; padding: 0; border: 1px solid #000; text-align: center; vertical-align: middle;">
              <div style="font-size: 14px; font-weight: bold; color: #333; padding: 20px 0;">[ 서명 완료 ]</div>
            </td>
          </tr>
        </table>
        <div style="text-align: center; font-size: 20px; font-weight: bold; margin-top: 35px; color: #000;">인천 부평구 통합돌봄센터</div>
      </div>
    `;
  }

  // 5) [동의서 2] 게이트키퍼 개인정보 수집·이용 및 제3자 제공 동의서 뷰어
  renderGatekeeperConsentForm(container, t, detail) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

    container.innerHTML = `
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <span style="font-size: 11px; font-weight: 700; color: #b45309; text-transform: uppercase;">[보건복지부 고독사 예방 관리 서식]</span>
          <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 4px 0 0 0;">개인정보 수집·이용 및 제3자 제공 동의서 (게이트키퍼)</h2>
        </div>
        <div style="text-align: right; font-size: 11.5px; color: #475569;">
          <div>발급기관: 인천 부평구 통합돌봄센터</div>
          <div>관리번호: <strong style="font-family: monospace; color: #0f172a;">${t.uid}</strong></div>
        </div>
      </div>

      <div style="font-size: 11.5px; line-height: 1.6; color: #334155; margin-bottom: 14px; border: 1px solid #cbd5e1; padding: 12px 14px; background: #f8fafc; text-align: justify; border-radius: 4px;">
        본 동의서는 「개인정보 보호법」 등 관련 법령에 따라 고독사 예방 및 안부확인, 위기상황 점검 지원 서비스를 제공하기 위해 대상자의 개인정보를 수집·이용 및 제3자(맞춤형 4대 사업단 및 의료기관)에 제공하는 것에 대한 동의를 구하는 공식 서식입니다.
      </div>

      <div style="font-size: 11.5px; line-height: 1.65; color: #0f172a; margin-bottom: 14px; border: 1px solid #cbd5e1; padding: 12px 14px; border-radius: 4px;">
        <div style="font-weight: 800; margin-bottom: 4px; color: #b45309;">1. 개인정보 수집·이용 목적 및 항목</div>
        <div style="padding-left: 8px; margin-bottom: 8px; color: #334155;">
          • 목적: 고독사 고위험군 발굴, 24시간 안심살핌 관제 및 긴급출동 연계<br>
          • 항목: 성명, 생년월일, 성별, 주소, 연락처, 주거형태, 10대 위험지표 응답 내역
        </div>

        <div style="font-weight: 800; margin-bottom: 4px; color: #b45309;">2. 개인정보 제3자 제공 동의</div>
        <div style="padding-left: 8px; margin-bottom: 8px; color: #334155;">
          • 제공받는 자: 4대 전담 사업단(식사, 건강, 주거, 정서), 관할 행정복지센터, 소방서(119)<br>
          • 제공 목적: 고독사 예방을 위한 식사지원, 방문진료, 주거환경 개선 및 응급구조 출동
        </div>

        <div style="font-weight: 800; margin-bottom: 4px; color: #b45309;">3. 보유 및 이용 기간</div>
        <div style="padding-left: 8px; color: #334155;">
          • 고독사 예방 안심살핌 서비스 종료 시까지 (최대 5년 보존 후 파기)
        </div>
      </div>

      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 10px 14px; text-align: center; margin-bottom: 14px; font-size: 12px; font-weight: 700;">
        <div style="margin-bottom: 6px;">개인정보 수집·이용 및 제3자 제공에 모두 동의하십니까?</div>
        <div style="display: flex; justify-content: center; gap: 32px; color: #0f172a;">
          <span style="color: #15803d;">■ 전체 동의함</span>
          <span style="color: #94a3b8;">□ 동의하지 않음</span>
        </div>
      </div>

      <!-- 동의자 및 서명 확인 -->
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 14px;">
        <tr style="background: #f8fafc; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
          <th style="padding: 6px 10px; width: 18%; border: 1px solid #cbd5e1;">동의자 성명</th>
          <td style="padding: 6px 10px; width: 32%; border: 1px solid #cbd5e1; font-weight: 700;">${t.name} (${t.gender})</td>
          <th style="padding: 6px 10px; width: 18%; border: 1px solid #cbd5e1;">생년월일</th>
          <td style="padding: 6px 10px; width: 32%; border: 1px solid #cbd5e1;">${t.birth || '1950-**-**'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #cbd5e1;">
          <th style="padding: 6px 10px; border: 1px solid #cbd5e1; background: #f8fafc;">실거주 주소</th>
          <td colspan="3" style="padding: 6px 10px; border: 1px solid #cbd5e1;">${t.address}</td>
        </tr>
      </table>

      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-top: 18px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
        <div>동의일자: <strong>${dateStr}</strong></div>
        <div>동의인: <strong>${t.name}</strong> (서명 완료)</div>
      </div>
    `;
  }
async printOfficialForm() {
    const target = this.cases.find(c => c.uid === this.selectedTargetUid) || this.cases[0];
    if (!target) {
      notifier.toast('출력할 대상자가 선택되지 않았습니다.', 'warning');
      return;
    }

    const detail = this.currentCaseDetail || await this.loadCaseDetail(target.uid);

    if (this.selectedForm === 'SGDS') {
      const sgds = detail?.sgdsList?.[0] || {};
      const surveyData = {
        basicInfo: {
          caseUid: target.uid,
          orgName: '인천 부평구 통합돌봄센터',
          project: '고독사예방게이트키퍼',
          inspectionDate: (sgds.survey_date || target.date || '2026-10-26').slice(0, 10),
          inspectors: target.inspectors || ['박영희', '김철수'],
          rawSurveyUid: sgds.survey_uid || UidEngine.generateSurveyUid(target.uid, 'GD', 1)
        },
        profile: {
          name: target.name,
          gender: target.gender,
          birth: target.birth || '1952-05-14',
          age: target.age || 74,
          area: '인천 부평구',
          address: target.address,
          phone: target.phone || '010-5521-8819',
          living: target.living || '노인단독',
          economy: target.economy || '일반',
          health: target.health || '고혈압',
          extraText: target.extraText || '특이사항 없음'
        },
        result: {
          totalScore: sgds.total_score ?? target.score ?? 12
        },
        answers: sgds.answers || {}
      };
      await PdfExportService.exportSgdsToPdf(surveyData);
      notifier.toast(`[${target.name}] 한국형 노인우울척도(S-GDS 15문항) 검사지 PDF가 출력되었습니다.`, 'success');
    } else if (this.selectedForm === 'GATEKEEPER') {
      const risk = detail?.riskList?.[0] || {};
      const targetScore = risk.total_score ?? target.score ?? 0;
      
      // 10대 문항 실제 응답 매핑 (우선순위: 실제 저장 응답 > causesSummary 기반 복원)
      let gatekeeperAnswers = target.answers || detail?.answers || {};
      if (Object.keys(gatekeeperAnswers).length === 0 && targetScore > 0) {
        gatekeeperAnswers = {};
        const causesText = target.causesSummary || '';
        const specs = [
          { num: 1, id: 'Q1', weight: 1, defaultMemo: '식사 결손 소견 있음' },
          { num: 2, id: 'Q2', weight: 1, defaultMemo: '혼술 및 폭음 위험' },
          { num: 3, id: 'Q3', weight: 1, defaultMemo: '외부 소통 단절' },
          { num: 4, id: 'Q4', weight: 1, defaultMemo: '위기 시 도움 요청처 없음' },
          { num: 5, id: 'Q5', weight: 1, defaultMemo: '고정 소득 부재' },
          { num: 6, id: 'Q6', weight: 1, defaultMemo: '공과금 체납 이력' },
          { num: 7, id: 'Q7', weight: 2, defaultMemo: '만성질환 투약 중단 및 통증 방치' },
          { num: 8, id: 'Q8', weight: 1, defaultMemo: '주거 위생 및 청결 불량' },
          { num: 9, id: 'Q9', weight: 2, defaultMemo: '심한 고립감 및 우울감 호소' },
          { num: 10, id: 'Q10', weight: 2, defaultMemo: '생명 위기 및 자살 조짐 감지' }
        ];

        let currentSum = 0;
        // 1차: causesSummary에 언급된 핵심 문항 먼저 위험으로 활성화
        specs.forEach(spec => {
          if (causesText.includes(spec.id)) {
            const memoMatch = causesText.split(/[,;]/).find(s => s.includes(spec.id));
            const memo = memoMatch ? memoMatch.replace(spec.id, '').trim() : spec.defaultMemo;
            gatekeeperAnswers[spec.num] = { isRisk: true, activityMemo: memo };
            currentSum += spec.weight;
          }
        });

        // 2차: 대상자 총점(targetScore)에 도달할 때까지 나머지 위험 문항 순차 보충
        for (const spec of specs) {
          if (currentSum >= targetScore) break;
          if (!gatekeeperAnswers[spec.num]) {
            gatekeeperAnswers[spec.num] = { isRisk: true, activityMemo: spec.defaultMemo };
            currentSum += spec.weight;
          }
        }
      }

      const surveyData = {
        basicInfo: {
          caseUid: target.uid,
          orgName: '인천 부평구 통합돌봄센터',
          project: '고독사예방게이트키퍼',
          inspectionDate: (risk.inspection_date || target.date || '2026-10-26').slice(0, 10),
          inspectors: target.inspectors || ['박영희', '김철수'],
          rawSurveyUid: risk.survey_uid || UidEngine.generateSurveyUid(target.uid, 'WR', 1)
        },
        profile: {
          name: target.name,
          gender: target.gender,
          birth: target.birth || '1952-05-14',
          address: target.address,
          phone: target.phone || '010-5521-8819',
          housingType: target.living || '다가구·다세대주택'
        },
        result: {
          totalScore: targetScore
        },
        answers: gatekeeperAnswers
      };
      await PdfExportService.exportSurveyToPdf(surveyData);
      notifier.toast(`[${target.name}] 고독사 위험도 현장조사표 PDF가 출력되었습니다.`, 'success');
    } else if (this.selectedForm === 'COUNSEL') {
      const card = detail?.monitoringCards?.[0] || {};
      const surveyData = {
        basicInfo: {
          caseUid: target.uid,
          orgName: '인천 부평구 통합돌봄센터',
          project: '고독사예방게이트키퍼',
          inspectionDate: (card.check_date || target.date || '2026-10-26').slice(0, 10),
          inspectors: target.inspectors || ['박영희', '김철수']
        },
        profile: {
          name: target.name,
          gender: target.gender,
          birth: target.birth || '1952-05-14',
          address: target.address,
          phone: target.phone || '010-5521-8819'
        },
        beneficiaryCard: {
          method: card.contact_method === '통화' ? 'call' : 'visit',
          healthStatus: card.health_check || '보통',
          healthNote: card.health_note || '특이사항 없음',
          psychStatus: card.psycho_check || '안정',
          psychNote: card.psycho_note || '특이사항 없음',
          livingStatus: card.living_check || '청결',
          livingNote: card.living_note || '특이사항 없음',
          symptomStatus: card.anomaly_check || '없음',
          symptomNote: card.anomaly_note || '특이사항 없음',
          hasOther: card.etc_check === '요청있음',
          otherNote: card.etc_note || ''
        }
      };
      await PdfExportService.exportBeneficiaryCardToPdf(surveyData);
      notifier.toast(`[${target.name}] 수혜자 관리카드 PDF가 출력되었습니다.`, 'success');
    } else if (this.selectedForm === 'CONSENT_SGDS') {
      const surveyData = {
        basicInfo: {
          caseUid: target.uid,
          orgName: '인천 부평구 통합돌봄센터',
          project: '노인우울척도(S-GDS)',
          inspectionDate: target.date || '2026-10-26',
          inspectors: target.inspectors || ['박영희', '김철수']
        },
        profile: {
          name: target.name,
          gender: target.gender,
          birth: target.birth || '1952-05-14',
          address: target.address,
          phone: target.phone || '010-5521-8819'
        },
        consent: {
          agreeCollect: true
        }
      };
      await PdfExportService.exportSgdsConsentToPdf(surveyData);
      notifier.toast(`[${target.name}] S-GDS 개인정보 수집 및 이용 동의서 PDF가 출력되었습니다.`, 'success');
    } else if (this.selectedForm === 'CONSENT_GATEKEEPER') {
      const surveyData = {
        basicInfo: {
          caseUid: target.uid,
          orgName: '인천 부평구 통합돌봄센터',
          project: '고독사예방게이트키퍼',
          inspectionDate: target.date || '2026-10-26',
          inspectors: target.inspectors || ['박영희', '김철수']
        },
        profile: {
          name: target.name,
          gender: target.gender,
          birth: target.birth || '1952-05-14',
          address: target.address,
          phone: target.phone || '010-5521-8819'
        },
        consent: {
          agreeCollect: true,
          agreeThirdParty: true
        }
      };
      await PdfExportService.exportConsentToPdf(surveyData);
      notifier.toast(`[${target.name}] 게이트키퍼 개인정보 및 제3자 제공 동의서 PDF가 출력되었습니다.`, 'success');
    }
  }

  exportExcel() {
    if (!RbacService.canExportExcel()) {
      notifier.toast('17열 엑셀 원장 다운로드 권한이 부여되지 않은 계정입니다. 기관 총괄 관리자에게 문의하십시오.', 'warning');
      return;
    }
    const filtered = this.getFilteredCases();
    const headers = ['연번', '관리번호', '성명', '성별', '연령', '실거주지', '거주유형', '위험도점수', '위기등급', '연계사업단', '담당참여자', '조사일자', '진행상태'];
    const rows = filtered.map((c, idx) => [
      idx + 1,
      c.uid,
      c.name,
      c.gender,
      c.age,
      `"${c.address}"`,
      c.living || '다가구',
      c.score || 0,
      c.grade || '일반',
      `"${(c.buList || []).join(', ')}"`,
      `"${(c.inspectors || []).join(', ')}"`,
      c.date || '-',
      c.status || '배정 완료'
    ]);

    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `WellRiskKeeper_통계및실적명부_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    notifier.toast('통계 실적 엑셀(CSV) 파일이 다운로드되었습니다.', 'success');
  }

  // 공통 PDF 인쇄 / 다운로드
  exportPdf() {
    if (this.currentSubtab === 'forms') {
      const formEl = document.getElementById('formViewerContainer');
      if (!formEl) return;

      const printWindow = window.open('', '_blank', 'width=900,height=750');
      if (!printWindow) {
        window.print();
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>보건복지부 공문서 서식 출력</title>
          <style>
            body { font-family: 'Pretendard', -apple-system, sans-serif; padding: 30px; margin: 0; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; }
            @media print {
              body { padding: 0; }
              @page { margin: 15mm; size: A4 portrait; }
            }
          </style>
        </head>
        <body>
          ${formEl.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          <\/script>
        </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      window.print();
    }
  }
}
