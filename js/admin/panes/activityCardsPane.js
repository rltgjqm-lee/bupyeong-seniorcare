/**
 * @file activityCardsPane.js
 * @description 참여기관 관리자 포털: 활동관리카드 차수별 누적 관리 페인 (ESM)
 * - 사용자 기획 분리 핵심 반영: 차수별 방문일지 누적 조회 및 상담불가/부재 가구 집중 관제
 */

import { notifier } from '../../utils/notifier.js';

export class ActivityCardsPane {
  constructor(options = {}) {
    this.cases = options.cases || [];
    this.selectedCaseUid = 'ALL';
    this.filterConsult = 'ALL'; // ALL | SUCCESS | FAIL
  }

  setCases(newCases) {
    this.cases = newCases;
    this.render();
  }

  render() {
    const el = document.getElementById('paneActivityCards');
    if (!el) return;

    // 목데이터 기반 차수별 활동일지 평탄화 목록 생성
    const activityLogs = [];
    this.cases.forEach(c => {
      for (let r = 1; r <= c.roundCount; r++) {
        const isLast = (r === c.roundCount);
        const isConsulted = isLast ? (c.lastConsultResult !== '상담 불가') : true;
        activityLogs.push({
          caseUid: c.uid,
          targetName: c.name,
          dong: c.dong,
          round: r,
          date: isLast ? c.lastConsultDate : `2026-10-${String(10 + r * 3).padStart(2, '0')}`,
          time: '14:00~14:30',
          isConsulted: isConsulted,
          unmetReason: isConsulted ? '' : '대상자 부재',
          content: isConsulted ? (isLast ? c.lastConsultResult : '정기 안부 확인 및 건강 상태 점검') : '방문 시 부재중으로 문앞 안내문 부착'
        });
      }
    });

    // 필터링 적용
    const filtered = activityLogs.filter(log => {
      if (this.selectedCaseUid !== 'ALL' && log.caseUid !== this.selectedCaseUid) return false;
      if (this.filterConsult === 'SUCCESS' && !log.isConsulted) return false;
      if (this.filterConsult === 'FAIL' && log.isConsulted) return false;
      return true;
    });

    el.innerHTML = `
      <div class="pane-header-title" style="display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <h2>⭐ 활동관리카드 누적 대장</h2>
          <p>현장 활동가의 차수별 방문 일시, 상담실시/불가 여부 및 세부 활동내용 시계열 관리</p>
        </div>
        <div style="font-size: 13px; font-weight: 700; color: #64748b;">
          총 누적 기록: <strong style="color: #0f172a;">${activityLogs.length}</strong>건
        </div>
      </div>

      <!-- 상단 필터바 -->
      <div class="admin-card" style="padding: 14px 18px; margin-bottom: 14px;">
        <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 13px; font-weight: 600; color: #475569;">대상자 가구:</span>
            <select class="filter-ctrl" id="selCaseFilter" style="height: 32px; font-size: 12.5px; padding: 0 8px; border: 1px solid #cbd5e1; border-radius: 6px;">
              <option value="ALL">전체 가구 누적 보기</option>
              ${this.cases.map(c => `<option value="${c.uid}" ${this.selectedCaseUid === c.uid ? 'selected' : ''}>${c.uid} (${c.name}, ${c.dong})</option>`).join('')}
            </select>
          </div>

          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 13px; font-weight: 600; color: #475569;">상담 상태:</span>
            <select class="filter-ctrl" id="selConsultFilter" style="height: 32px; font-size: 12.5px; padding: 0 8px; border: 1px solid #cbd5e1; border-radius: 6px;">
              <option value="ALL">전체 이력</option>
              <option value="SUCCESS" ${this.filterConsult === 'SUCCESS' ? 'selected' : ''}>대면 상담실시</option>
              <option value="FAIL" ${this.filterConsult === 'FAIL' ? 'selected' : ''}>미대면 상담불가 (부재 등)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 누적 테이블 -->
      <div class="admin-card" style="padding: 0; overflow: hidden;">
        <div style="overflow-x: auto;">
          <table class="admin-table">
            <thead>
              <tr>
                <th style="width: 140px;">대상자 UID</th>
                <th style="width: 90px;">성명</th>
                <th style="width: 85px;">행정동</th>
                <th style="width: 65px; text-align: center;">차수</th>
                <th style="width: 95px;">활동날짜</th>
                <th style="width: 90px;">활동시간</th>
                <th style="width: 95px; text-align: center;">상담여부</th>
                <th>세부 활동내용 (간단 서술)</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr><td colspan="8" style="text-align: center; padding: 32px; color: #94a3b8;">일치하는 활동일지 이력이 없습니다.</td></tr>
              ` : filtered.map(log => `
                <tr>
                  <td class="font-mono" style="font-weight: 700; color: #2563eb;">${log.caseUid}</td>
                  <td><strong>${log.targetName}</strong></td>
                  <td><span class="badge badge-secondary">${log.dong}</span></td>
                  <td style="text-align: center; font-weight: 800; color: #0f172a;">${log.round}차</td>
                  <td class="font-mono">${log.date}</td>
                  <td style="font-size: 12px; color: #475569;">${log.time}</td>
                  <td style="text-align: center;">
                    <span class="badge ${log.isConsulted ? 'badge-primary' : 'badge-danger'}">
                      ${log.isConsulted ? '대면 상담실시' : `상담불가(${log.unmetReason})`}
                    </span>
                  </td>
                  <td style="color: #334155; font-size: 12.5px;">${log.content}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const selCase = document.getElementById('selCaseFilter');
    const selConsult = document.getElementById('selConsultFilter');

    if (selCase) {
      selCase.addEventListener('change', (e) => {
        this.selectedCaseUid = e.target.value;
        this.render();
      });
    }

    if (selConsult) {
      selConsult.addEventListener('change', (e) => {
        this.filterConsult = e.target.value;
        this.render();
      });
    }
  }
}
