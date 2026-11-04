/**
 * @file step1BasicView.js
 * @description PWA 현장 조사 Step 1: 기본 정보 및 활동가 조 편성 화면 (ESM)
 */

import { REGISTERED_ORGS, saveBasicInfo } from '../../services/participantService.js';
import { ValidationService } from '../../services/validationService.js';
import { AssignmentService } from '../../services/assignmentService.js';
import { notifier } from '../../utils/notifier.js';
import { getLocalTodayString } from '../../utils/date.js';

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
          <span class="card-main-title">소속 참여기관 및 사업단 확인</span>
          <span class="uid-badge" id="dispOrgCode">${b.orgCode}</span>
        </div>

        <div class="form-group">
          <label class="form-label">기관명 <span class="req">*</span></label>
          <input type="text" class="form-input" id="inputOrgName" value="${b.orgName}" placeholder="예: 인천 부평구 또는 가좌 입력" autocomplete="off">
          <div class="autocomplete-layer" id="orgAutoList"></div>
        </div>

        <div class="form-group">
          <label class="form-label">사업단명 <span class="req">*</span></label>
          <input type="text" class="form-input" id="inputProject" value="${b.project}" placeholder="예: 고독사예방게이트키퍼">
        </div>
      </div>

      <div class="pwa-card">
        <div class="card-header-bar">
          <span class="card-main-title">현장 참여 활동가</span>
          <button class="btn-del-inspector" id="btnAddInspector" style="font-size: 11px; padding: 2px 8px;">+ 추가</button>
        </div>

        <div id="inspectorListContainer">
          ${b.inspectors.map((name, idx) => `
            <div class="inspector-row">
              <input type="text" class="form-input inspector-input" data-idx="${idx}" value="${name}" placeholder="활동가 ${idx + 1} 성명">
              ${b.inspectors.length > 1 ? `<button class="btn-del-inspector" data-del-idx="${idx}">-</button>` : ''}
            </div>
          `).join('')}
        </div>
      </div>

      <div class="pwa-card">
        <div class="card-header-bar">
          <span class="card-main-title">조사 일자 및 관리번호</span>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div class="form-group">
            <label class="form-label">조사 일자 <span class="req">*</span></label>
            <input type="date" class="form-input" id="inputInspectionDate" value="${b.inspectionDate}" max="${getLocalTodayString()}">
          </div>
          <div class="form-group">
            <label class="form-label">조사 관리번호</label>
            <input type="text" class="form-input" id="inputInspectionNumber" value="${b.maskedSurveyUid}" readonly style="font-family: monospace; font-weight: 700;">
          </div>
        </div>
      </div>

      <div class="btn-action-row" style="margin-bottom: 24px;">
        <button class="btn-secondary-action" id="btnSaveBasicOnly">기본정보 저장</button>
        <button class="btn-primary-action" id="btnNextToStep2">다음 (대상자 확인)</button>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const b = this.mediator.state.basicInfo;
    const inputOrg = document.getElementById('inputOrgName');
    const autoList = document.getElementById('orgAutoList');
    const dispCode = document.getElementById('dispOrgCode');
    const inputProj = document.getElementById('inputProject');
    const inputDate = document.getElementById('inputInspectionDate');
    const inputNumber = document.getElementById('inputInspectionNumber');

    if (inputProj) {
      inputProj.addEventListener('input', (e) => {
        b.project = e.target.value;
      });
    }

    if (inputDate) {
      inputDate.addEventListener('change', (e) => {
        const selectedDate = e.target.value;
        const todayStr = getLocalTodayString();
        if (selectedDate && selectedDate > todayStr) {
          notifier.toast('조사 일자는 미래 날짜를 지정할 수 없습니다. 오늘 날짜로 자동 조정됩니다.', 'warning');
          e.target.value = todayStr;
          b.inspectionDate = todayStr;
        } else {
          b.inspectionDate = selectedDate;
        }
        this.mediator.updateInspectionUids();
        if (inputNumber) inputNumber.value = b.maskedSurveyUid;
      });
    }

    // 기관 자동완성
    if (inputOrg && autoList) {
      inputOrg.addEventListener('input', (e) => {
        const q = e.target.value.trim().toLowerCase();
        if (!q) {
          autoList.style.display = 'none';
          return;
        }
        const matches = REGISTERED_ORGS.filter(o => 
          o.orgName.toLowerCase().includes(q) || o.region.toLowerCase().includes(q) || o.orgCode.toLowerCase().includes(q)
        );

        if (matches.length === 0) {
          autoList.innerHTML = `<div style="padding:10px; font-size:11.5px; color:#94a3b8; text-align:center;">일치하는 등록 기관이 없습니다.</div>`;
        } else {
          autoList.innerHTML = matches.map(o => `
            <div class="auto-item" data-code="${o.orgCode}" data-name="${o.orgName}" data-proj="${o.project}">
              <div>
                <span class="uid-badge" style="background:#e2e8f0; font-size:9.5px; margin-right:4px;">${o.region}</span>
                <strong style="font-size:12.5px;">${o.orgName}</strong>
              </div>
              <span style="font-size:10.5px; color:#64748b; font-family:monospace;">${o.orgCode}</span>
            </div>
          `).join('');
        }
        autoList.style.display = 'block';
      });

      autoList.addEventListener('click', (e) => {
        const item = e.target.closest('.auto-item');
        if (!item) return;
        const code = item.getAttribute('data-code');
        const name = item.getAttribute('data-name');
        const proj = item.getAttribute('data-proj');

        inputOrg.value = name;
        if (dispCode) dispCode.innerText = code;
        if (inputProj) inputProj.value = proj;

        b.orgCode = code;
        b.orgName = name;
        b.project = proj;

        this.mediator.updateInspectionUids();
        if (inputNumber) inputNumber.value = b.maskedSurveyUid;
        
        autoList.style.display = 'none';
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('.form-group')) {
          autoList.style.display = 'none';
        }
      });
    }

    // 활동가 추가/삭제
    const btnAdd = document.getElementById('btnAddInspector');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        if (b.inspectors.length >= 4) {
          notifier.toast('활동가는 최대 4명까지 등록 가능합니다.', 'warning');
          return;
        }
        b.inspectors.push('');
        this.render();
      });
    }

    const inspContainer = document.getElementById('inspectorListContainer');
    if (inspContainer) {
      inspContainer.querySelectorAll('.inspector-input').forEach(input => {
        input.addEventListener('input', () => {
          const idx = parseInt(input.getAttribute('data-idx'), 10);
          b.inspectors[idx] = input.value;
        });
      });

      inspContainer.querySelectorAll('button[data-del-idx]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-del-idx'), 10);
          b.inspectors.splice(idx, 1);
          this.render();
        });
      });
    }

    // 기본정보 단독 저장
    const btnSave = document.getElementById('btnSaveBasicOnly');
    if (btnSave) {
      btnSave.addEventListener('click', () => {
        const validation = ValidationService.validateBasicInfo(b);
        if (!validation.isValid) {
          notifier.alert({
            title: '입력 정보 확인',
            message: validation.message,
            confirmText: '확인'
          });
          return;
        }
        b.inspectors = validation.inspectors;
        saveBasicInfo(b);

        this.mediator.renderAllSteps();

        notifier.alert({
          title: '활동가 정보 저장 완료',
          message: '참여 활동가 명단이 안전하게 저장되었습니다.\n변경된 조 인원은 [관찰기록] 및 [전자 서명란]에 실시간 동기화됩니다.',
          details: [
            { label: '소속 참여기관', value: b.orgName },
            { label: '참여 사업단', value: b.project },
            { label: `참여 활동가 (${validation.inspectors.length}명)`, value: validation.inspectors.join(', ') },
            { label: '조사 일자', value: b.inspectionDate },
            { label: '조사 관리번호', value: b.maskedSurveyUid }
          ],
          confirmText: '확인'
        });
      });
    }

    // 다음 단계 (Step 2)
    const btnNext = document.getElementById('btnNextToStep2');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        const validation = ValidationService.validateBasicInfo(b);
        if (!validation.isValid) {
          notifier.alert({
            title: '기본 정보 확인 필요',
            message: validation.message,
            confirmText: '확인'
          });
          return;
        }
        b.inspectors = validation.inspectors;
        saveBasicInfo(b);

        this.mediator.renderAllSteps();
        this.mediator.switchTab(2);
      });
    }
  }
}
