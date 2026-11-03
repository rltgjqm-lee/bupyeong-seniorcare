/**
 * @file monitoringRecordsPane.js
 * @description 참여기관 관리자 포털: 정밀 모니터링 및 동 행정복지센터 심층상담 연계 관리 페인 (ESM)
 */

import { notifier } from '../../utils/notifier.js';

export class MonitoringRecordsPane {
  constructor(options = {}) {
    this.cases = options.cases || [];
    this.filterLinkOnly = false;
  }

  setCases(newCases) {
    this.cases = newCases;
    this.render();
  }

  render() {
    const el = document.getElementById('paneMonitoringRecords');
    if (!el) return;

    const displayCases = this.filterLinkOnly
      ? this.cases.filter(c => c.needsDeepLink)
      : this.cases;

    const deepLinkCount = this.cases.filter(c => c.needsDeepLink).length;

    el.innerHTML = `
      <div class="pane-header-title" style="display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <h2>정밀 모니터링 및 심층상담 연계 관리</h2>
          <p>어르신 가택 생활·건강 실태 종합 진단 및 동 행정복지센터 심층상담 이첩 관리</p>
        </div>
        <div>
          <button type="button" id="btnToggleLinkFilter" style="padding: 7px 14px; font-size: 13px; font-weight: 700; border-radius: 6px; cursor: pointer; border: 1px solid ${this.filterLinkOnly ? '#2563eb' : '#cbd5e1'}; background: ${this.filterLinkOnly ? '#2563eb' : '#ffffff'}; color: ${this.filterLinkOnly ? '#ffffff' : '#334155'};">
            ★ 심층연계의뢰 대상만 보기 (${deepLinkCount}건)
          </button>
        </div>
      </div>

      <div class="admin-card" style="padding: 0; overflow: hidden;">
        <div style="overflow-x: auto;">
          <table class="admin-table">
            <thead>
              <tr>
                <th style="width: 140px;">대상자 UID</th>
                <th style="width: 90px;">성명</th>
                <th style="width: 85px;">행정동</th>
                <th style="width: 80px;">주거환경</th>
                <th>대상자 건강상태 및 세부 실태</th>
                <th style="width: 170px;">상담 결과 판정</th>
                <th style="width: 120px; text-align: center;">공공 이첩 연계</th>
              </tr>
            </thead>
            <tbody>
              ${displayCases.length === 0 ? `
                <tr><td colspan="7" style="text-align: center; padding: 32px; color: #94a3b8;">해당하는 모니터링 데이터가 없습니다.</td></tr>
              ` : displayCases.map(c => `
                <tr style="${c.needsDeepLink ? 'background: #eff6ff;' : ''}">
                  <td class="font-mono" style="font-weight: 700; color: #2563eb;">${c.uid}</td>
                  <td><strong>${c.name}</strong></td>
                  <td><span class="badge badge-secondary">${c.dong}</span></td>
                  <td><span class="badge ${c.needsDeepLink ? 'badge-danger' : 'badge-success'}">${c.needsDeepLink ? '보통/불량' : '청결'}</span></td>
                  <td style="font-size: 12.5px; color: #334155;">
                    <div><strong>건강:</strong> 만성질환 투약 및 거동 불편 모니터링 (${c.targetFeature})</div>
                    <div style="font-size: 11.5px; color: #64748b; margin-top: 2px;">가구형태: ${c.livingType} | 수혜자격: ${c.socialSecurity}</div>
                  </td>
                  <td style="font-size: 12px; font-weight: 600;">
                    ${c.needsDeepLink ? `
                      <span style="color: #2563eb;">★ 서비스 연계 필요<br><span style="font-size: 11px; font-weight: normal; color: #64748b;">(동 복지센터 심층상담)</span></span>
                    ` : `
                      <span style="color: #64748b;">희망 서비스 없음 (안정)</span>
                    `}
                  </td>
                  <td style="text-align: center;">
                    ${c.needsDeepLink ? `
                      <button type="button" class="btn-dispatch-link" data-uid="${c.uid}" style="padding: 4px 10px; font-size: 11.5px; font-weight: 700; background: #2563eb; color: #ffffff; border: none; border-radius: 4px; cursor: pointer;">
                        이첩 접수 완료
                      </button>
                    ` : `
                      <span style="font-size: 11.5px; color: #94a3b8;">-</span>
                    `}
                  </td>
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
    const btnToggle = document.getElementById('btnToggleLinkFilter');
    if (btnToggle) {
      btnToggle.addEventListener('click', () => {
        this.filterLinkOnly = !this.filterLinkOnly;
        this.render();
      });
    }

    document.querySelectorAll('.btn-dispatch-link').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const uid = e.currentTarget.dataset.uid;
        notifier.toast(`[${uid}] 가구가 부평구 관할 동 행정복지센터로 심층상담 이첩되었습니다.`, 'success', 3500);
      });
    });
  }
}
