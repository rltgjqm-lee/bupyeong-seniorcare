/**
 * @file statsAndFormsPane.js
 * @description 참여기관 관리자 포털: 만족도 통계 분석 및 공공 서식 대시보드 페인 (ESM)
 */

import { notifier } from '../../utils/notifier.js';

export class StatsAndFormsPane {
  constructor(options = {}) {
    this.cases = options.cases || [];
  }

  setCases(newCases) {
    this.cases = newCases;
    this.render();
  }

  render() {
    const el = document.getElementById('paneStatsAndForms');
    if (!el) return;

    el.innerHTML = `
      <div class="pane-header-title">
        <h2>만족도 통계 분석 및 공공 서식 관리</h2>
        <p>2026년 부평형 지역사회 통합돌봄서비스 이용자 만족도 7대 지표 실시간 분석</p>
      </div>

      <!-- 요약 KPI 카드 -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px;">
        <div class="admin-card" style="padding: 16px; text-align: center;">
          <div style="font-size: 12px; color: #64748b; font-weight: 600;">종합 만족도 평균</div>
          <div style="font-size: 26px; font-weight: 800; color: #2563eb; margin: 4px 0;">4.86 <span style="font-size: 14px; color: #64748b;">/ 5.0</span></div>
          <div style="font-size: 11px; color: #16a34a; font-weight: 700;">▲ 97.2% 긍정 응답</div>
        </div>
        <div class="admin-card" style="padding: 16px; text-align: center;">
          <div style="font-size: 12px; color: #64748b; font-weight: 600;">서비스 지속 이용 의향</div>
          <div style="font-size: 26px; font-weight: 800; color: #0f172a; margin: 4px 0;">4.90 <span style="font-size: 14px; color: #64748b;">/ 5.0</span></div>
          <div style="font-size: 11px; color: #64748b;">재이용 의향 98%</div>
        </div>
        <div class="admin-card" style="padding: 16px; text-align: center;">
          <div style="font-size: 12px; color: #64748b; font-weight: 600;">서비스 품질 평가</div>
          <div style="font-size: 26px; font-weight: 800; color: #0f172a; margin: 4px 0;">4.88 <span style="font-size: 14px; color: #64748b;">/ 5.0</span></div>
          <div style="font-size: 11px; color: #64748b;">상황 이해 및 적절성</div>
        </div>
        <div class="admin-card" style="padding: 16px; text-align: center;">
          <div style="font-size: 12px; color: #64748b; font-weight: 600;">총 설문 완료 가구</div>
          <div style="font-size: 26px; font-weight: 800; color: #0f172a; margin: 4px 0;">${this.cases.length} <span style="font-size: 14px; color: #64748b;">가구</span></div>
          <div style="font-size: 11px; color: #2563eb; font-weight: 700;">부평구 22개동 전역</div>
        </div>
      </div>

      <!-- 5점 척도 7문항 세부 점수 차트 그리드 -->
      <div class="admin-card">
        <div class="card-section-title">서비스 비용·이용 만족도 7대 세부 지표 분석</div>
        <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 12px;">
          ${[
            { num: 2, label: '접근성 (신청·이용 절차 편리성)', score: 4.75, pct: 95 },
            { num: 3, label: '적시성 (적절한 시기 서비스 연계)', score: 4.82, pct: 96.4 },
            { num: 4, label: '적합성 (제공 서비스 내용 만족도)', score: 4.88, pct: 97.6 },
            { num: 5, label: '효과성 (실제 생활 도움 여부)', score: 4.85, pct: 97.0 },
            { num: 6, label: '서비스 품질 (활동가 상황 이해도)', score: 4.90, pct: 98.0 },
            { num: 7, label: '종합 만족도 (전반적 사업 만족)', score: 4.86, pct: 97.2 },
            { num: 8, label: '지속 이용 의향 (재이용 의향)', score: 4.92, pct: 98.4 }
          ].map(item => `
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 4px;">
                <span style="font-weight: 600; color: #1e293b;">${item.num}. ${item.label}</span>
                <span style="font-weight: 800; color: #2563eb; font-family: monospace;">${item.score} 점 (${item.pct}%)</span>
              </div>
              <div style="width: 100%; height: 10px; background: #e2e8f0; border-radius: 5px; overflow: hidden;">
                <div style="width: ${item.pct}%; height: 100%; background: #2563eb; border-radius: 5px;"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 도움 분야 분포 -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
        <div class="admin-card">
          <div class="card-section-title">가장 도움이 된 분야 분포</div>
          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
            <div style="display: flex; justify-content: space-between; font-size: 12.5px;">
              <span>1. 일상생활 지원 (가사, 식사 등)</span>
              <strong>48% (120건)</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12.5px;">
              <span>2. 보건·의료 서비스</span>
              <strong>26% (65건)</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12.5px;">
              <span>3. 건강관리 및 예방</span>
              <strong>14% (35건)</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12.5px;">
              <span>4. 주거 환경 지원 및 정서지원</span>
              <strong>12% (30건)</strong>
            </div>
          </div>
        </div>

        <div class="admin-card">
          <div class="card-section-title">불만 및 건의사항 키워드 분석</div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px;">
            <span class="badge badge-secondary" style="font-size: 12px; padding: 5px 10px;">방문 횟수 확대 희망 (42건)</span>
            <span class="badge badge-secondary" style="font-size: 12px; padding: 5px 10px;">반찬 종류 다양화 (18건)</span>
            <span class="badge badge-secondary" style="font-size: 12px; padding: 5px 10px;">병원 동행 서비스 확대 (15건)</span>
            <span class="badge badge-success" style="font-size: 12px; padding: 5px 10px;">활동가 친절도 매우 만족 (88건)</span>
          </div>
        </div>
      </div>
    `;
  }
}
