/**
 * @file step3ActivityCardView.js
 * @description PWA 현장조사 Step 4: 활동관리카드 (이전 이력 확인 및 당일 활동 등록)
 * - 이전 방문 상담 이력 조회
 * - 미래 날짜 선택 원천 차단 (max=today)
 * - 활동 시간: 시작~종료 2단 분리, [현재] 버튼 지원 및 근태 관리용 활동시간(분) 자동 산출
 * - 세부 활동내용은 Step 5(모니터링)에서 상태 체크 후 작성
 */

import { notifier } from '../../utils/notifier.js';
import { getLocalTodayString, getLocalTimeString } from '../../utils/date.js';

export class Step3ActivityCardView {
  constructor(mediator) {
    this.mediator = mediator;
  }

  // 시작~종료 시간 차이(분) 계산 헬퍼
  calcDurationMinutes(startTime, endTime) {
    if (!startTime || !endTime) return 0;
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    const diff = (eH * 60 + eM) - (sH * 60 + sM);
    return diff > 0 ? diff : 0;
  }

  render(containerId = 'step4Container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const a = this.mediator.state.activityCard;
    const cur = a.currentEntry;
    const nextRound = a.records.length + 1;
    const isConsulted = cur.isConsulted !== false;
    const today = getLocalTodayString();

    // 기본 날짜 및 시간 세팅
    if (!cur.date) cur.date = today;
    if (!cur.startTime) cur.startTime = getLocalTimeString();
    if (!cur.endTime) {
      // 시작 시간 30분 뒤 기본값
      const [h, m] = cur.startTime.split(':').map(Number);
      const endTotal = h * 60 + m + 30;
      const eH = String(Math.floor(endTotal / 60) % 24).padStart(2, '0');
      const eM = String(endTotal % 60).padStart(2, '0');
      cur.endTime = `${eH}:${eM}`;
    }
    cur.durationMinutes = this.calcDurationMinutes(cur.startTime, cur.endTime);
    cur.time = `${cur.startTime} ~ ${cur.endTime}`;

    if (!cur.unmetReason) cur.unmetReason = '대상자 부재';

    const UNMET_REASONS = ['대상자 부재', '상담 거부', '사망', '병원(시설)이용', '기타'];

    container.innerHTML = `
      <!-- 1. 이전 활동 및 상담일지 이력 확인 카드 -->
      <div class="pwa-card">
        <div class="card-header-bar" style="display: flex; justify-content: space-between; align-items: center;">
          <span class="card-main-title">이전 활동 및 상담 이력</span>
          <span style="font-size: 11px; font-weight: 600; background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 4px;">
            총 ${a.records.length}건
          </span>
        </div>

        ${a.records.length === 0 ? `
          <div style="text-align: center; color: #64748b; padding: 18px 0; font-size: 13px;">
            이전 방문 이력이 없습니다. (첫 방문 대상자)
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 4px;">
            ${a.records.map((r) => `
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <span style="font-size: 12px; font-weight: 700; color: #0f172a;">제 ${r.round} 회차</span>
                  <span style="font-size: 11.5px; color: #64748b;">${r.date} (${r.time || '시간 미기재'})</span>
                </div>
                <div style="font-size: 12px; margin-bottom: 4px;">
                  <span style="display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; ${r.isConsulted ? 'background:#e0f2fe; color:#0369a1;' : 'background:#fee2e2; color:#b91c1c;'}">
                    ${r.isConsulted ? '상담 실시' : `상담 불가 (${r.unmetReason || '사유 미기재'})`}
                  </span>
                </div>
                ${r.content ? `
                  <div style="font-size: 12.5px; color: #334155; line-height: 1.45; margin-top: 4px; white-space: pre-wrap; background: #ffffff; padding: 8px; border-radius: 6px; border: 1px solid #f1f5f9;">
                    ${r.content}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- 2. 당일 활동 등록 카드 -->
      <div class="pwa-card">
        <div class="card-header-bar">
          <span class="card-main-title">당일 활동 등록 (제 ${nextRound} 회차)</span>
        </div>

        <!-- 활동 날짜 -->
        <div class="form-group" style="margin-bottom: 12px;">
          <label class="form-label" for="inputActDate">활동 날짜 <span class="req">*</span></label>
          <input type="date" class="form-input" id="inputActDate" value="${cur.date}" style="font-size: 13.5px; height: 40px;">
        </div>

        <!-- 활동 시간 (시작 ~ 종료 근태관리 연동) -->
        <div class="form-group" style="margin-bottom: 14px;">
          <label class="form-label">활동 시간 (근태 연동) <span class="req">*</span></label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div>
              <span style="font-size: 11px; color: #64748b; font-weight: 600;">시작 시간</span>
              <div style="display: flex; gap: 4px; margin-top: 3px;">
                <input type="time" class="form-input" id="inputActStartTime" value="${cur.startTime}" style="font-size: 13px; height: 38px;">
                <button type="button" id="btnNowStartTime" style="min-width: 44px; padding: 0 6px; font-size: 11.5px; font-weight: 600; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; color: #334155;">현재</button>
              </div>
            </div>
            <div>
              <span style="font-size: 11px; color: #64748b; font-weight: 600;">종료 시간</span>
              <div style="display: flex; gap: 4px; margin-top: 3px;">
                <input type="time" class="form-input" id="inputActEndTime" value="${cur.endTime}" style="font-size: 13px; height: 38px;">
                <button type="button" id="btnNowEndTime" style="min-width: 44px; padding: 0 6px; font-size: 11.5px; font-weight: 600; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; color: #334155;">현재</button>
              </div>
            </div>
          </div>
          <div id="txtActDuration" style="font-size: 12px; color: #334155; font-weight: 700; margin-top: 6px; background: #f8fafc; padding: 6px 10px; border-radius: 4px; border: 1px solid #e2e8f0;">
            총 인정 활동시간: <span style="color: #0f172a;" id="valDurationText">${cur.durationMinutes}분 (${(cur.durationMinutes / 60).toFixed(1)}시간)</span>
          </div>
        </div>

        <!-- 상담 실시 여부 -->
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label">상담 실시 여부 <span class="req">*</span></label>
          <div style="display: flex; gap: 8px; margin-bottom: 8px;">
            <button type="button" class="obs-btn-switch ${isConsulted ? 'selected-clean' : ''}" id="btnConsultConducted" style="flex: 1; height: 40px; font-size: 13px;">
              상담 실시 (대면)
            </button>
            <button type="button" class="obs-btn-switch ${!isConsulted ? 'selected-clean' : ''}" id="btnConsultUnmet" style="flex: 1; height: 40px; font-size: 13px;">
              상담 불가 (미대면)
            </button>
          </div>

          <!-- 상담 불가 사유 (미대면 선택 시 활성화) -->
          <div id="unmetReasonBox" style="display: ${!isConsulted ? 'block' : 'none'}; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-top: 8px;">
            <label class="form-label" style="font-size: 12px; color: #991b1b; margin-bottom: 6px;">상담 불가 사유 선택 <span class="req">*</span></label>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 8px;">
              ${UNMET_REASONS.map(reason => `
                <button type="button" class="btn-secondary-action btn-unmet-chip ${cur.unmetReason === reason ? 'active-unmet' : ''}" data-reason="${reason}" style="min-height: 34px; font-size: 12px; padding: 4px; ${cur.unmetReason === reason ? 'background:#991b1b; color:#ffffff; font-weight:700; border-color:#991b1b;' : ''}">
                  ${reason}
                </button>
              `).join('')}
            </div>
            <div id="unmetOtherWrap" style="display: ${cur.unmetReason === '기타' ? 'block' : 'none'};">
              <input type="text" class="form-input" id="inputUnmetOther" value="${cur.unmetReasonDetail || ''}" placeholder="기타 사유 직접 기재" style="font-size: 12px;">
            </div>
          </div>
        </div>
      </div>

      <!-- 3. 하단 액션 버튼: 이전 버튼 배제, 우측 정렬된 차분한 톤 -->
      <div style="display: flex; justify-content: flex-end; margin-top: 18px; margin-bottom: 30px;">
        ${isConsulted ? `
          <button type="button" class="btn-primary-action" id="btnNextToStep5" style="min-width: 160px; height: 46px; font-size: 14.5px; font-weight: 700; background: #1e293b; color: #ffffff; border-radius: 6px; border: none; cursor: pointer; padding: 0 20px;">
            다음 (모니터링) ➔
          </button>
        ` : `
          <button type="button" class="btn-primary-action" id="btnSaveUnmet" style="min-width: 200px; height: 46px; font-size: 14.5px; font-weight: 700; background: #334155; color: #ffffff; border-radius: 6px; border: none; cursor: pointer; padding: 0 20px;">
            상담 불가 기록 저장 후 완료
          </button>
        `}
      </div>
    `;

    this.bindEvents();
  }

  updateTimeState() {
    const a = this.mediator.state.activityCard;
    const cur = a.currentEntry;
    const sInput = document.getElementById('inputActStartTime');
    const eInput = document.getElementById('inputActEndTime');
    const txtDur = document.getElementById('valDurationText');

    if (sInput) cur.startTime = sInput.value;
    if (eInput) cur.endTime = eInput.value;

    cur.durationMinutes = this.calcDurationMinutes(cur.startTime, cur.endTime);
    cur.time = `${cur.startTime} ~ ${cur.endTime}`;

    if (txtDur) {
      txtDur.textContent = `${cur.durationMinutes}분 (${(cur.durationMinutes / 60).toFixed(1)}시간)`;
    }
  }

  bindEvents() {
    const a = this.mediator.state.activityCard;
    const cur = a.currentEntry;
    const today = getLocalTodayString();

    // 날짜 바인딩
    const dateEl = document.getElementById('inputActDate');
    if (dateEl) {
      dateEl.addEventListener('change', (e) => {
        cur.date = e.target.value;
      });
    }

    // 시간 입력 바인딩
    const sInput = document.getElementById('inputActStartTime');
    const eInput = document.getElementById('inputActEndTime');
    const btnNowStart = document.getElementById('btnNowStartTime');
    const btnNowEnd = document.getElementById('btnNowEndTime');

    if (sInput) sInput.addEventListener('change', () => this.updateTimeState());
    if (eInput) eInput.addEventListener('change', () => this.updateTimeState());

    if (btnNowStart) {
      btnNowStart.addEventListener('click', () => {
        const now = getLocalTimeString();
        if (sInput) sInput.value = now;
        this.updateTimeState();
      });
    }

    if (btnNowEnd) {
      btnNowEnd.addEventListener('click', () => {
        const now = getLocalTimeString();
        if (eInput) eInput.value = now;
        this.updateTimeState();
      });
    }

    // 상담 실시 / 불가 토글
    const btnConducted = document.getElementById('btnConsultConducted');
    const btnUnmet = document.getElementById('btnConsultUnmet');

    if (btnConducted && btnUnmet) {
      btnConducted.addEventListener('click', () => {
        cur.isConsulted = true;
        this.render('step4Container');
      });

      btnUnmet.addEventListener('click', () => {
        cur.isConsulted = false;
        this.render('step4Container');
      });
    }

    // 상담 불가 사유 칩 선택
    const otherWrap = document.getElementById('unmetOtherWrap');
    document.querySelectorAll('.btn-unmet-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const reason = btn.getAttribute('data-reason');
        cur.unmetReason = reason;
        document.querySelectorAll('.btn-unmet-chip').forEach(b => {
          b.style.background = '';
          b.style.color = '';
          b.style.fontWeight = '';
          b.style.borderColor = '';
        });
        btn.style.background = '#991b1b';
        btn.style.color = '#ffffff';
        btn.style.fontWeight = '700';
        btn.style.borderColor = '#991b1b';

        if (reason === '기타') {
          if (otherWrap) otherWrap.style.display = 'block';
        } else {
          if (otherWrap) otherWrap.style.display = 'none';
          cur.unmetReasonDetail = '';
        }
      });
    });

    const inputOther = document.getElementById('inputUnmetOther');
    if (inputOther) {
      inputOther.addEventListener('input', (e) => { cur.unmetReasonDetail = e.target.value; });
    }

    // 다음 (모니터링)
    const btnNext = document.getElementById('btnNextToStep5');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        this.updateTimeState();
        this.mediator.switchTab(5);
      });
    }

    // 상담 불가 기록 저장 후 완료
    const btnSaveUnmet = document.getElementById('btnSaveUnmet');
    if (btnSaveUnmet) {
      btnSaveUnmet.addEventListener('click', () => {
        this.updateTimeState();
        const roundNum = a.records.length + 1;
        const reasonText = cur.unmetReason === '기타' && cur.unmetReasonDetail ? `기타(${cur.unmetReasonDetail})` : cur.unmetReason;

        a.records.push({
          round: roundNum,
          date: cur.date,
          time: cur.time,
          isConsulted: false,
          unmetReason: reasonText,
          content: `상담 불가: ${reasonText}`
        });

        notifier.toast(`제 ${roundNum} 회차 상담 불가 기록이 저장되었습니다.`, 'info');
        this.mediator.switchTab(6);
      });
    }
  }
}
