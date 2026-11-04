/**
 * @file step3ObservationView.js
 * @description PWA 현장 조사 Step 3: 현장 외부 관찰 지표(외부 6종 + 탐문 + 방문 결과 판정) 뷰 (ESM)
 */

import { OUTDOOR_OBSERVATION_QUESTIONS } from '../../config/constants.js';
import { ValidationService } from '../../services/validationService.js';
import { signaturePad } from '../../utils/signaturePad.js';
import { notifier } from '../../utils/notifier.js';

export class Step3ObservationView {
  constructor(mediator) {
    this.mediator = mediator;
  }

  render() {
    const container = document.getElementById('step3Container');
    if (!container) return;

    const b = this.mediator.state.basicInfo;
    const obs = this.mediator.state.observation;
    const c = this.mediator.state.consent;

    const UNMET_PRESET_REASONS = [
      '부재중 (문 잠김/인기척 없음)',
      '대면 및 진입 거부 (문전박대)',
      '주소지 불명 / 공가 / 이사',
      '병원 입원 / 시설 입소 확인'
    ];

    container.innerHTML = `
      <div class="pwa-card">
        <div class="card-header-bar">
          <span class="card-main-title">현장 방문 개요</span>
          <span class="uid-badge">${b.maskedSurveyUid}</span>
        </div>

        <div class="obs-summary-meta">
          <div><strong>방문일:</strong> ${b.inspectionDate}</div>
          <div><strong>방문 살핌단:</strong> ${b.inspectors.join(', ')}</div>
        </div>
      </div>

      <!-- 섹션 1: 집 밖 외부 관찰 -->
      <div class="pwa-card">
        <div class="card-header-bar">
          <span class="card-main-title">확인 사항 (집 밖 외부 관찰)</span>
          <span style="font-size: 11px; color: var(--navy-500); font-weight: 600;">외부 징후 체크 <span class="req">*</span></span>
        </div>

        <div id="outdoorObsList">
          ${OUTDOOR_OBSERVATION_QUESTIONS.map((q, idx) => `
            <div class="obs-card-item ${obs[q.id] === true ? 'risk-active' : ''}" id="obsCard_${q.id}">
              <div class="obs-card-text">
                <span style="font-weight: 700; color: var(--navy-800); margin-right: 4px;">${idx + 1}.</span>
                ${q.text}
              </div>
              <div class="obs-toggle-group">
                <button type="button" class="obs-btn-switch ${obs[q.id] === false ? 'selected-clean' : ''}" data-obs-id="${q.id}" data-val="false">정상</button>
                <button type="button" class="obs-btn-switch ${obs[q.id] === true ? 'selected-risk' : ''}" data-obs-id="${q.id}" data-val="true">있음</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 섹션 1-1: 집주인·이웃 탐문 메모 -->
      <div class="pwa-card">
        <div class="card-header-bar">
          <span class="card-main-title">[섹션 1-1] 집주인·이웃 탐문 및 확인사항</span>
          <span class="badge-subtle">선택</span>
        </div>
        <div style="font-size: 11px; color: var(--navy-600); margin-bottom: 6px;">※ 집주인, 통장, 이웃 주민을 통해 외부에서 확인된 내용을 자유롭게 기재하세요.</div>
        <textarea class="obs-memo-textarea" id="obsNeighborMemo" placeholder="예: 집주인 면담 결과 최근 며칠간 외출 모습이 보이지 않았다고 함.">${obs.neighborNote || ''}</textarea>
      </div>

      <!-- 섹션 2: 현장 방문 및 대면 결과 판정 -->
      <div class="pwa-card">
        <div class="card-header-bar">
          <span class="card-main-title">[섹션 2] 현장 방문 및 대면 결과 판정</span>
          <span style="font-size: 11px; color: var(--navy-500); font-weight: 600;">진입 여부 판정 <span class="req">*</span></span>
        </div>

        <div class="visit-result-grid">
          <button type="button" class="visit-result-btn ${obs.visitResult === 'met' ? 'selected-met' : ''}" id="btnVisitMet" style="font-size: 15px; font-weight: 700; padding: 14px 0;">
            대면
          </button>
          <button type="button" class="visit-result-btn ${obs.visitResult === 'unmet' ? 'selected-unmet' : ''}" id="btnVisitUnmet" style="font-size: 15px; font-weight: 700; padding: 14px 0;">
            비대면
          </button>
        </div>

        <!-- 미대면 시 사유 입력 박스 -->
        <div class="unmet-reason-box" id="unmetReasonBox" style="${obs.visitResult === 'unmet' ? 'display: block;' : 'display: none;'}">
          <div style="font-size: 12px; font-weight: 700; color: #92400e; margin-bottom: 4px;">
            미대면(부재/거부) 사유 선택 및 상세 기재 <span class="req">*</span>
          </div>
          <div class="unmet-chip-grid">
            ${UNMET_PRESET_REASONS.map(r => `
              <div class="unmet-chip ${obs.unmetReason && obs.unmetReason.includes(r) ? 'selected' : ''}" data-reason="${r}">
                ${r}
              </div>
            `).join('')}
          </div>
          <input type="text" class="form-input" id="unmetReasonInput" style="margin-top: 6px; font-size: 12px;" placeholder="미대면 사유 직접 입력 또는 보충 설명 기재" value="${obs.unmetReason || ''}">

          <!-- 현장 방문 활동가 서명란 목록 (비대면 관찰기록 보고용) -->
          <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed #cbd5e1;">
            <div style="font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 8px;">
              현장 방문 살핌단 활동가 확인 서명 <span class="req">*</span>
            </div>
            ${b.inspectors.map((name, idx) => `
              <div class="sig-row-card" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div class="sig-row-info">
                  <span class="sig-role-label" style="font-size: 10.5px; font-weight: 700; color: #64748b; display: block;">참여자 ${idx + 1}</span>
                  <span class="sig-name-val" style="font-size: 13.5px; font-weight: 700; color: #0f172a;">성명: ${name || '미입력'}</span>
                </div>
                <div class="sig-box-preview unmet-insp-sig-box" data-insp-name="${name}" style="width: 130px; height: 52px; border: 1.5px dashed ${c.inspectorSignatures[name] ? '#059669' : '#cbd5e1'}; background: ${c.inspectorSignatures[name] ? '#ecfdf5' : '#f8fafc'}; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease;">
                  ${c.inspectorSignatures[name] ? `
                    <img src="${c.inspectorSignatures[name]}" class="sig-preview-img" style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="${name} 서명">
                  ` : `
                    <span class="sig-placeholder-text" style="font-size: 11.5px; color: #64748b; font-weight: 600;">[터치 서명]</span>
                  `}
                </div>
              </div>
            `).join('')}
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
              ※ 미대면 보고서 출력을 위해 참여 활동가 전원의 서명이 필요합니다.
            </div>
          </div>
        </div>
      </div>

      <!-- 하단 액션 버튼 -->
      <div class="btn-action-row" style="margin-bottom: 24px;">
        <button class="btn-secondary-action" id="btnBackToStep2">이전 단계</button>
        ${obs.visitResult === 'unmet' ? `
          <button class="btn-primary-action" id="btnSubmitUnmetOnly" style="background: #d97706; border-color: #b45309;">
            미대면 관찰기록 제출 및 종료
          </button>
        ` : `
          <button class="btn-primary-action" id="btnNextToStep4">
            상담 시작
          </button>
        `}
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const obs = this.mediator.state.observation;

    // 외부 6종 버튼 이벤트
    document.querySelectorAll('.obs-btn-switch[data-obs-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const obsId = btn.getAttribute('data-obs-id');
        const isRisk = btn.getAttribute('data-val') === 'true';
        obs[obsId] = isRisk;

        const card = document.getElementById(`obsCard_${obsId}`);
        if (card) {
          if (isRisk) card.classList.add('risk-active');
          else card.classList.remove('risk-active');

          card.querySelectorAll('.obs-btn-switch').forEach(b => {
            const bVal = b.getAttribute('data-val') === 'true';
            if (bVal === isRisk) {
              b.className = `obs-btn-switch ${isRisk ? 'selected-risk' : 'selected-clean'}`;
            } else {
              b.className = 'obs-btn-switch';
            }
          });
        }
      });
    });

    // 이웃 탐문 메모
    const memoEl = document.getElementById('obsNeighborMemo');
    if (memoEl) {
      memoEl.addEventListener('input', (e) => {
        obs.neighborNote = e.target.value;
      });
    }

    // 대면 / 미대면 선택 버튼
    const btnMet = document.getElementById('btnVisitMet');
    const btnUnmet = document.getElementById('btnVisitUnmet');
    const unmetBox = document.getElementById('unmetReasonBox');
    const metBox = document.getElementById('metNoticeBox');

    if (btnMet) {
      btnMet.addEventListener('click', () => {
        obs.visitResult = 'met';
        this.render();
      });
    }

    if (btnUnmet) {
      btnUnmet.addEventListener('click', () => {
        obs.visitResult = 'unmet';
        this.render();
      });
    }

    // 미대면 프리셋 칩 선택
    document.querySelectorAll('.unmet-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const reason = chip.getAttribute('data-reason');
        obs.unmetReason = reason;
        const input = document.getElementById('unmetReasonInput');
        if (input) input.value = reason;

        document.querySelectorAll('.unmet-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
      });
    });

    // 미대면 사유 직접 입력
    const unmetInput = document.getElementById('unmetReasonInput');
    if (unmetInput) {
      unmetInput.addEventListener('input', (e) => {
        obs.unmetReason = e.target.value;
      });
    }

    // 미대면 시: 참여 활동가 전자 서명 클릭 이벤트 바인딩
    const b = this.mediator.state.basicInfo;
    const c = this.mediator.state.consent;
    document.querySelectorAll('.unmet-insp-sig-box[data-insp-name]').forEach(box => {
      box.addEventListener('click', () => {
        const inspName = box.getAttribute('data-insp-name');
        signaturePad.open({
          title: '활동가 전자 서명 (현장 보고)',
          signerName: inspName,
          onSave: (dataUrl) => {
            if (!c.inspectorSignatures) c.inspectorSignatures = {};
            c.inspectorSignatures[inspName] = dataUrl;
            this.render();
            notifier.toast(`${inspName} 활동가 확인 서명이 저장되었습니다.`, 'success');
          }
        });
      });
    });

    // 이전 버튼
    const btnBack = document.getElementById('btnBackToStep2');
    if (btnBack) btnBack.addEventListener('click', () => this.mediator.switchTab(2));

    // 대면 시: Step 4 이동 버튼
    const btnNext = document.getElementById('btnNextToStep4');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        const val = ValidationService.validateStep3Observation(obs);
        if (!val.isValid) {
          notifier.alert({
            title: '현장 관찰 확인 필요',
            message: val.message,
            confirmText: '확인'
          });
          return;
        }

        if (obs.visitResult !== 'met') {
          notifier.alert({
            title: '방문 결과 확인 필요',
            message: '대면 진입을 위해 [대면 (실내 진입)]을 선택해 주십시오.',
            confirmText: '확인'
          });
          return;
        }

        this.mediator.renderStep(4);
        this.mediator.switchTab(4);
      });
    }

    // 미대면 시: 관찰기록지 단독 제출 버튼
    const btnSubmitUnmet = document.getElementById('btnSubmitUnmetOnly');
    if (btnSubmitUnmet) {
      btnSubmitUnmet.addEventListener('click', () => {
        const val = ValidationService.validateStep3Observation(obs);
        if (!val.isValid) {
          notifier.alert({
            title: '관찰기록지 확인 필요',
            message: val.message,
            confirmText: '확인'
          });
          return;
        }

        // 활동가 서명 누락 방지 검증
        const missingInsp = b.inspectors.filter(name => !c.inspectorSignatures || !c.inspectorSignatures[name]);
        if (missingInsp.length > 0) {
          notifier.alert({
            title: '활동가 확인 서명 필요',
            message: `공식 가정방문기록지 출력을 위해 참여 활동가 [${missingInsp.join(', ')}]의 확인 서명을 완료해 주십시오.`,
            confirmText: '확인'
          });
          return;
        }

        this.mediator.handleSubmitUnmet();
      });
    }
  }
}



