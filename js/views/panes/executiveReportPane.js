/**
 * @file executiveReportPane.js
 * @description 종합 실적 보고서 및 보건복지부 제출용 KPI 집계 서브 페인 모듈 (ESM)
 *              - 핵심 실적 요약 KPI (총 발굴 가구, 집중 위기군, 4대 사업단 배차)
 *              - 등급별 필터링 및 종합 실적 명부 테이블 렌더링
 *              - 보고서 A4/PDF 인쇄 엔진
 *              - 전사 표준 UTF-8 BOM 엑셀(CSV) 내보내기 엔진
 */

import { notifier } from '../../utils/notifier.js';

export const GRADE_KOR = {
  critical: '초고위험',
  high: '고위험',
  mid: '중위험',
  clean: '저위험'
};

export class ExecutiveReportPane {
  constructor(options = {}) {
    this.container = null;
    this.cases = options.cases || [];
    this.onRefreshRequested = options.onRefreshRequested || null;
    this.filterGrade = 'all';
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
    if (options.onRefreshRequested) this.onRefreshRequested = options.onRefreshRequested;

    if (!this.container) {
      console.warn('[ExecutiveReportPane] 컨테이너 요소를 찾을 수 없습니다.');
      return;
    }

    this.renderReport();
    this.bindEvents();
  }

  setCases(cases) {
    this.cases = cases || [];
    this.renderReport();
  }

  /**
   * 실적 보고서 및 KPI 집계 렌더링
   */
  renderReport() {
    const repGenAt = document.getElementById('repGeneratedAt');
    const repSignDate = document.getElementById('repSignDate');

    const now = new Date();
    const dateStr = `${now.getFullYear()}년 ${String(now.getMonth() + 1).padStart(2, '0')}월 ${String(now.getDate()).padStart(2, '0')}일 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const signDateStr = `${now.getFullYear()}년 ${String(now.getMonth() + 1).padStart(2, '0')}월 ${String(now.getDate()).padStart(2, '0')}일`;

    if (repGenAt) repGenAt.innerText = dateStr;
    if (repSignDate) repSignDate.innerText = signDateStr;

    const total = this.cases.length;
    const critical = this.cases.filter(c => c.grade === 'critical').length;
    const high = this.cases.filter(c => c.grade === 'high').length;
    const riskTotal = critical + high;

    let buTotal = 0;
    this.cases.forEach(c => { buTotal += (c.buList ? c.buList.length : 0); });

    const elTotal = document.getElementById('repKpiTotal');
    const elRisk = document.getElementById('repKpiRisk');
    const elBu = document.getElementById('repKpiBu');

    if (elTotal) elTotal.innerText = `${total}가구`;
    if (elRisk) elRisk.innerText = `${riskTotal}가구 (초고위험 ${critical} + 고위험 ${high})`;
    if (elBu) elBu.innerText = `${buTotal}건`;

    const tbody = document.getElementById('tbodyReportCases');
    if (!tbody) return;

    let filtered = [...this.cases];
    if (this.filterGrade !== 'all') {
      filtered = filtered.filter(c => c.grade === this.filterGrade);
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; color: #94a3b8; padding: 32px;">
            조건에 일치하는 실적 대상자가 없습니다.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map((c, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="font-family: monospace; font-size: 11.5px; white-space: nowrap; text-align: center;">${c.uid}</td>
        <td><strong>${c.name}</strong> (${c.gender}/${c.age}세)</td>
        <td class="text-left">${c.address} <span style="font-size: 11px; color: #64748b;">[${c.living}]</span></td>
        <td style="text-align: center;"><strong>${c.score}점</strong></td>
        <td style="text-align: center;"><span class="grade-pill ${c.grade}">${GRADE_KOR[c.grade] || c.grade}</span></td>
        <td style="font-weight: 600; color: #334155; text-align: center;">${(c.buList || []).join(', ')}</td>
        <td style="font-size: 11.5px; color: #475569;">${(c.mohwList || []).join(', ')}</td>
        <td style="text-align: center;">${(c.inspectors || []).join(', ')}</td>
      </tr>
    `).join('');
  }

  /**
   * 전사 표준 UTF-8 BOM CSV 생성 및 다운로드 엔진
   */
  exportToCsv() {
    const headers = ['연번', '조사일자', '활동가(2인)', '대상자', '성별', '연령', '관리번호', '소재지 주소', '거주유형', '위험도총점', '위기등급', '연계사업단', '복지부위기분류', '상태'];
    const rows = this.cases.map((c, idx) => [
      idx + 1,
      c.date,
      `"${(c.inspectors || []).join(', ')}"`,
      c.name,
      c.gender,
      c.age,
      c.uid,
      `"${c.address}"`,
      c.living,
      c.score,
      c.grade,
      `"${(c.buList || []).join(', ')}"`,
      `"${(c.mohwList || []).join(', ')}"`,
      c.status
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `WellRiskKeeper_안부살핌_현장실적_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notifier.toast('실적 엑셀(CSV) 파일이 다운로드되었습니다.', 'success');
  }

  /**
   * 이벤트 바인딩
   */
  bindEvents() {
    const btnRepExcel = document.getElementById('btnDownloadReportExcel');
    const btnRepPrint = document.getElementById('btnPrintReport');
    const btnRepRefresh = document.getElementById('btnRefreshReportData');
    const selGrade = document.getElementById('repFilterGrade');

    if (btnRepExcel) {
      btnRepExcel.onclick = () => this.exportToCsv();
    }

    if (btnRepPrint) {
      btnRepPrint.onclick = () => window.print();
    }

    if (btnRepRefresh) {
      btnRepRefresh.onclick = async () => {
        if (this.onRefreshRequested) {
          await this.onRefreshRequested();
        } else {
          this.renderReport();
        }
        notifier.toast('보고서 실측 데이터가 실시간 재집계되었습니다.', 'info');
      };
    }

    if (selGrade) {
      selGrade.onchange = (e) => {
        this.filterGrade = e.target.value;
        this.renderReport();
      };
    }
  }
}
