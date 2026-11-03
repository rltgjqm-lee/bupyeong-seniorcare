/**
 * @file step1BasicView.js
 * @description PWA 현장조사 Step 1: 소속 기관 및 살핌 참여자 2인 조 편성 (순수 참여자 정보)
 * - 게이트키퍼 디자인 및 Validation Guard 거버넌스 100% 준수
 */

import { notifier } from '../../utils/notifier.js';
import { getLocalTodayString } from '../../utils/date.js';
import { ValidationService } from '../../services/validationService.js';

export class Step1BasicView {
  constructor(mediator) {
    this.mediator = mediator;
  }

  render() {
    const container = document.getElementById('step1Container');
    if (!container) return;

    const b = this.mediator.state.basicInfo;

    container.innerHTML = `
      <div class="pwa-card">
        <div class="card-header-bar">
          <span class="card-main-title">소속 참여기관 및 사업단</span>
          <span class="uid-badge" id="dispOrgCode">${b.orgCode}</span>
        </div>

        <div class="form-group">
          <label class="form-label" for="inputOrgName">수행기관명 <span class="req">*</span></label>
          <input type="text" class="form-input" id="inputOrgName" value="${b.orgName}" placeholder="예: 인천광역시 부평구 통합돌봄센터" autocomplete="off">
        </div>

        <div class="form-group">
          <label class="form-label" for="inputProject">사업단명 <span class="req">*</span></label>
          <input type="text" class="form-input" id="inputProject" value="${b.project}" placeholder="예: 부평형 노인일자리 안심살핌사업단">
        </div>
      </div>

      <div class="pwa-card">
        <div class="card-header-bar">
          <span class="card-main-title">현장 살핌 참여자 (2인 1조)</span>
          <button type="button" class="btn-del-inspector" id="btnAddInspector" style="font-size: 11px; padding: 2px 8px; cursor: pointer;">+ 참여자 추가</button>
        </div>

        <div id="inspectorListContainer">
          ${b.inspectors.map((name, idx) => `
            <div class="inspector-row" style="display: flex; gap: 8px; margin-bottom: 8px;">
              <input type="text" class="form-input inspector-input" id="inspector_${idx}" data-idx="${idx}" value="${name}" placeholder="참여자 ${idx + 1} 성명">
              ${b.inspectors.length > 1 ? `<button type="button" class="btn-del-inspector" data-del-idx="${idx}">-</button>` : ''}
            </div>
          `).join('')}
        </div>
        <div style="font-size: 12px; color: #64748b; margin-top: 6px;">
          * 한 번 저장해 두시면 다음 번 앱 실행 시에도 참여자 정보가 자동으로 유지됩니다.
        </div>
      </div>

      <div class="pwa-card">
        <div class="card-header-bar">
          <span class="card-main-title">활동 일자 및 임시 서식번호</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div class="form-group">
            <label class="form-label" for="inputInspectionDate">활동 일자 <span class="req">*</span></label>
            <input type="date" class="form-input" id="inputInspectionDate" value="${b.inspectionDate}" max="${getLocalTodayString()}">
          </div>
          <div class="form-group">
            <label class="form-label" for="inputInspectionNumber">서식 관리번호</label>
            <input type="text" class="form-input" id="inputInspectionNumber" value="${b.maskedSurveyUid}" readonly style="font-family: monospace; font-weight: 700; background-color: #f1f5f9;">
          </div>
        </div>
      </div>

      <div class="btn-action-row" style="margin-bottom: 24px;">
        <button type="button" class="btn-secondary-action" id="btnSaveBasicOnly">참여자 정보 저장</button>
        <button type="button" class="btn-primary-action" id="btnNextToStep2">다음 (대상자 확인) ➔</button>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const b = this.mediator.state.basicInfo;
    const inputOrg = document.getElementById('inputOrgName');
    const inputProj = document.getElementById('inputProject');
    const inputDate = document.getElementById('inputInspectionDate');
    const btnAddInspector = document.getElementById('btnAddInspector');
    const inspectorContainer = document.getElementById('inspectorListContainer');
    const btnSave = document.getElementById('btnSaveBasicOnly');
    const btnNext = document.getElementById('btnNextToStep2');

    if (inputOrg) {
      inputOrg.addEventListener('input', (e) => {
        b.orgName = e.target.value.trim();
      });
    }

    if (inputProj) {
      inputProj.addEventListener('input', (e) => {
        b.project = e.target.value.trim();
      });
    }

    if (inputDate) {
      inputDate.addEventListener('change', (e) => {
        b.inspectionDate = e.target.value;
        this.mediator.updateSurveyUid();
        const numInput = document.getElementById('inputInspectionNumber');
        if (numInput) numInput.value = b.maskedSurveyUid;
      });
    }

    if (btnAddInspector) {
      btnAddInspector.addEventListener('click', () => {
        if (b.inspectors.length >= 4) {
          notifier.toast('참여자는 최대 4명까지 등록 가능합니다.', 'warning');
          return;
        }
        b.inspectors.push('');
        this.render();
      });
    }

    if (inspectorContainer) {
      inspectorContainer.addEventListener('input', (e) => {
        if (e.target.classList.contains('inspector-input')) {
          const idx = parseInt(e.target.dataset.idx, 10);
          b.inspectors[idx] = e.target.value.trim();
        }
      });

      inspectorContainer.addEventListener('click', (e) => {
        const delBtn = e.target.closest('[data-del-idx]');
        if (delBtn) {
          const idx = parseInt(delBtn.dataset.delIdx, 10);
          b.inspectors.splice(idx, 1);
          this.render();
        }
      });
    }

    // 기본정보 단독 저장 (Validation Guard 엄수)
    if (btnSave) {
      btnSave.addEventListener('click', () => {
        const val = ValidationService.validateBasicInfo(b);
        if (!val.isValid) {
          notifier.toast(val.message, 'warning', 3500);
          return;
        }
        b.inspectors = val.inspectors;
        this.mediator.saveLastBasicInfo();
        notifier.toast('참여자 및 소속 정보가 안전하게 저장되었습니다.', 'success');
      });
    }

    // 다음 단계 (Step 2) 진입 가드 (Validation Guard 엄수)
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        const val = ValidationService.validateBasicInfo(b);
        if (!val.isValid) {
          notifier.toast(val.message, 'warning', 3500);
          return;
        }
        b.inspectors = val.inspectors;
        this.mediator.saveLastBasicInfo();
        this.mediator.switchTab(2);
      });
    }
  }
}
