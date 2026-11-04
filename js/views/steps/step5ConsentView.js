/**
 * @file step5ConsentView.js
 * @description PWA 현장 조사 Step 5: 개인정보 동의서, 전자서명 패드 및 원클릭 점프 검토 뷰 (ESM)
 */

import { ScoringEngine } from '../../core/scoringEngine.js';
import { signaturePad } from '../../utils/signaturePad.js';
import { notifier } from '../../utils/notifier.js';
import { ValidationService } from '../../services/validationService.js';

export class Step5ConsentView {
  constructor(mediator) {
    this.mediator = mediator;
  }

  render() {
    const container = document.getElementById('step5Container');
    if (!container) return;

    const b = this.mediator.state.basicInfo;
    const p = this.mediator.state.targetProfile;
    const g = p.guardian || {};
    const isProxy = g.isProxySigner === true;
    const c = this.mediator.state.consent;
    const obs = this.mediator.state.observation;
    const scoreResult = ScoringEngine.calculate(this.mediator.state.answers, this.mediator.state.immediateNeeds);

    const dateParts = (b.inspectionDate || new Date().toISOString().slice(0, 10)).split('-');
    const formattedDate = `${dateParts[0]}년  ${dateParts[1]}월  ${dateParts[2]}일`;

    container.innerHTML = `
      <div class="pwa-card">
        <div class="card-header-bar">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="uid-badge" style="background:#0f172a; color:#fff;">서비스 대상자용</span>
            <span class="card-main-title">개인정보 수집·이용 및 제공 동의서</span>
          </div>
          <span class="uid-badge">관리번호: ${b.caseUid}</span>
        </div>

        <div style="font-size: 11.5px; color: #475569; line-height: 1.5; margin-bottom: 12px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 12px; border-radius: 4px;">
          개인정보 보호법 규정에 따라 처리하는 개인정보의 수집 및 이용, 제3자 제공 목적, 개인정보의 보유 및 이용기간을 안내 드리오니 자세히 읽은 후 동의하여 주시기 바랍니다.
        </div>

        <!-- 1. 개인정보 수집·이용 내역 -->
        <div class="consent-box">
          <div class="consent-title">■ 개인정보 수집·이용 내역</div>
          <table class="consent-table">
            <thead>
              <tr>
                <th style="width: 44%;">항목</th>
                <th style="width: 28%;">수집목적</th>
                <th style="width: 28%;">보유기간</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  • 대상자 정보(성명, 생년월일, 주소, 전화번호)<br>
                  • 서비스 제공에 필요한 정보(안부확인 사항)
                </td>
                <td style="text-align: center; font-weight: 600;">• 서비스 제공 등</td>
                <td style="text-align: center; font-weight: 600;">• 서비스 종결 후 5년</td>
              </tr>
            </tbody>
          </table>
          <div class="consent-notice-text">
            ※ 위의 개인정보 수집·이용에 대한 동의를 거부할 권리가 있습니다. 그러나 동의를 거부할 경우 원활한 서비스 제공 등에 일부 제한을 받을 수 있습니다.
          </div>
          <div class="consent-question-bar">
            <div class="consent-q-text">☞ 위와 같이 개인정보를 수집·이용하는데 동의하십니까?</div>
            <div class="consent-radio-wrap">
              <label class="consent-radio-label">
                <input type="radio" name="consentCollect" value="true" ${c.agreeCollect === true ? 'checked' : ''}> 동의함
              </label>
              <label class="consent-radio-label">
                <input type="radio" name="consentCollect" value="false" ${c.agreeCollect === false ? 'checked' : ''}> 동의하지 않음
              </label>
            </div>
          </div>
        </div>

        <!-- 2. 개인정보 제3자 제공 내역 -->
        <div class="consent-box">
          <div class="consent-title">■ 개인정보 제3자 제공 내역</div>
          <table class="consent-table">
            <thead>
              <tr>
                <th style="width: 44%;">제공하는 기관</th>
                <th style="width: 28%;">제공목적</th>
                <th style="width: 28%;">보유기간</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  • 정부부처 및 기초자치단체, 관련 공공기관, 서비스 제공기관 등
                </td>
                <td style="text-align: center; font-weight: 600;">
                  • 고독사 예방 사업 운영 및 연구등
                </td>
                <td style="text-align: center; font-weight: 600;">• 서비스 종결 후 5년</td>
              </tr>
            </tbody>
          </table>
          <div class="consent-notice-text">
            ※ 위의 개인정보를 읍면동 행정복지센터 등 제3자에게 제공하는데 동의를 거부할 권리가 있습니다. 그러나 동의를 거부할 경우 원활한 서비스 제공 등에 일부 제한을 받을 수 있습니다.
          </div>
          <div class="consent-question-bar">
            <div class="consent-q-text">☞ 위와 같이 개인정보를 제3자에게 제공하는데 동의하십니까?</div>
            <div class="consent-radio-wrap">
              <label class="consent-radio-label">
                <input type="radio" name="consentThirdParty" value="true" ${c.agreeThirdParty === true ? 'checked' : ''}> 동의함
              </label>
              <label class="consent-radio-label">
                <input type="radio" name="consentThirdParty" value="false" ${c.agreeThirdParty === false ? 'checked' : ''}> 동의하지 않음
              </label>
            </div>
          </div>
        </div>

        <!-- 서식 하단 일자 중앙 표기 -->
        <div class="consent-date-center">
          ${dateParts[0]} . ${dateParts[1]} . ${dateParts[2]} .
        </div>

        <!-- 대상자 본인 서명란 (대리인일 경우 대리인 표시) -->
        ${isProxy ? `
          <div class="sig-row-card" style="border-color: #f59e0b; background: #fffbeb;">
            <div class="sig-row-info">
              <span class="sig-role-label" style="color: #92400e;">보호자 (법정대리인) 대리 서명</span>
              <span class="sig-name-val">성명: ${g.name || '미입력'} (관계: ${g.relation || '대리인'})</span>
              <span style="font-size: 10px; color: #b45309; margin-top: 2px;">수혜자: ${p.name || '미입력'} 본인 서명 불가에 따른 대리 동의</span>
            </div>
            <div class="sig-box-preview" id="sigBoxTarget">
              ${c.targetSignature || c.proxySignature ? `
                <img src="${c.targetSignature || c.proxySignature}" class="sig-preview-img" alt="보호자 대리 서명">
              ` : `
                <span class="sig-placeholder-text">[서명인]</span>
              `}
            </div>
          </div>
        ` : `
          <div class="sig-row-card">
            <div class="sig-row-info">
              <span class="sig-role-label">서비스 대상자 (수혜자)</span>
              <span class="sig-name-val">성명: ${p.name || '미입력'}</span>
            </div>
            <div class="sig-box-preview" id="sigBoxTarget">
              ${c.targetSignature ? `
                <img src="${c.targetSignature}" class="sig-preview-img" alt="대상자 서명">
              ` : `
                <span class="sig-placeholder-text">[서명인]</span>
              `}
            </div>
          </div>
        `}

        <!-- 현장 방문 활동가 서명란 목록 -->
        <div style="margin-top: 10px;">
          <div style="font-size: 11.5px; font-weight: 700; color: #1e293b; margin-bottom: 6px;">현장 방문 살핌단 활동가 서명</div>
          ${b.inspectors.map((name, idx) => `
            <div class="sig-row-card" style="background: #f8fafc;">
              <div class="sig-row-info">
                <span class="sig-role-label">활동가 ${idx + 1}</span>
                <span class="sig-name-val">성명: ${name || '미입력'}</span>
              </div>
              <div class="sig-box-preview" data-insp-name="${name}">
                ${c.inspectorSignatures[name] ? `
                  <img src="${c.inspectorSignatures[name]}" class="sig-preview-img" alt="${name} 서명">
                ` : `
                  <span class="sig-placeholder-text">[터치 서명]</span>
                `}
              </div>
            </div>
          `).join('')}
        </div>

        <!-- 오프라인 통신 음영지역 안심 법적 고지 -->
        <div style="font-size: 11px; color: var(--navy-700); background: var(--navy-50); border: 1px solid var(--navy-200); padding: 9px 11px; border-radius: var(--radius-sm); margin-top: 10px; line-height: 1.45;">
          <strong>※ 현장 음영지역 안심 안내:</strong> 통신이 원활하지 않아도 본 동의서와 서명은 단말기 암호화 큐에 안전 보관되며, 인터넷 연결 즉시 서버로 자동 전송 후 로컬에서 안전하게 파기됩니다.
        </div>
      </div>

      <!-- 최종 검토 요약 & 원클릭 점프 수정 카드 -->
      <div class="review-summary-card">
        <div class="review-summary-head">
          <span>조사 데이터 최종 검토</span>
          <span style="font-size: 11px; font-weight: 500; color: var(--navy-200);">클릭 시 즉시 수정</span>
        </div>
        <div class="review-summary-body">
          <div class="review-item-row">
            <div class="review-item-info">
              <span class="review-item-title">1. 소속 기관 및 살핌단</span>
              <span>${b.orgName || '미지정'} / ${b.project || '미지정'} (활동가: ${b.inspectors.join(', ')})</span>
            </div>
            <button type="button" class="btn-edit-jump" data-jump-step="1">[1단계 수정]</button>
          </div>
          <div class="review-item-row">
            <div class="review-item-info">
              <span class="review-item-title">2. 안부 대상가구 및 보호자</span>
              <span>${p.name || '미입력'} (${p.gender || '미선택'}) | ${p.housingType || '미선택'} | ${g.hasGuardian ? `보호자: ${g.name}(${g.relation})` : '무연고'}</span>
            </div>
            <button type="button" class="btn-edit-jump" data-jump-step="2">[2단계 수정]</button>
          </div>
          <div class="review-item-row">
            <div class="review-item-info">
              <span class="review-item-title">3. 현장 관찰 지표</span>
              <span>방문결과: ${obs.visitResult === 'met' ? '대면 (실내진입)' : '미대면'}, 우편물: ${obs.mailAccumulated === true ? '위험' : (obs.mailAccumulated === false ? '정상' : '미확인')}</span>
            </div>
            <button type="button" class="btn-edit-jump" data-jump-step="3">[3단계 수정]</button>
          </div>
          <div class="review-item-row">
            <div class="review-item-info">
              <span class="review-item-title">4. 10대 문항 위험도 진단</span>
              <span>총점: <strong>${scoreResult.totalScore}점</strong> | ${scoreResult.grade.label}</span>
            </div>
            <button type="button" class="btn-edit-jump" data-jump-step="4">[4단계 수정]</button>
          </div>
        </div>
      </div>

      <div class="btn-action-row" style="margin-top: 14px; margin-bottom: 24px;">
        <button type="button" class="btn-secondary-action" id="btnBackToStep4">이전 단계 (10대 문항)</button>
        <button type="button" class="btn-primary-action" id="btnGoToStep6">
          다음 단계 (수혜자 관리카드) ▶
        </button>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const c = this.mediator.state.consent;
    const p = this.mediator.state.targetProfile;
    const g = p.guardian || {};
    const isProxy = g.isProxySigner === true;

    // 점프 수정 버튼 바인딩 (인라인 모달 수정)
    document.querySelectorAll('.btn-edit-jump[data-jump-step]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetStep = parseInt(btn.getAttribute('data-jump-step'), 10);
        this.openStepEditModal(targetStep);
      });
    });

    // 동의 라디오 바인딩
    document.querySelectorAll('input[name="consentCollect"]').forEach(r => {
      r.addEventListener('change', (e) => {
        c.agreeCollect = e.target.value === 'true';
      });
    });

    document.querySelectorAll('input[name="consentThirdParty"]').forEach(r => {
      r.addEventListener('change', (e) => {
        c.agreeThirdParty = e.target.value === 'true';
      });
    });

    // 서명 패드 모달 (대상자 또는 보호자 대리 서명)
    const targetSigBox = document.getElementById('sigBoxTarget');
    if (targetSigBox) {
      targetSigBox.addEventListener('click', () => {
        signaturePad.open({
          title: isProxy ? '보호자 (법정대리인) 전자 서명' : '대상자 전자 서명',
          signerName: isProxy ? `${g.name || '보호자'} (${g.relation || '대리인'})` : (p.name || '대상자'),
          onSave: (dataUrl) => {
            if (isProxy) {
              c.proxySignature = dataUrl;
              c.targetSignature = dataUrl;
            } else {
              c.targetSignature = dataUrl;
            }
            this.render();
            notifier.toast(isProxy ? '보호자 대리 전자 서명이 저장되었습니다.' : '대상자 전자 서명이 저장되었습니다.', 'success');
          }
        });
      });
    }

    // 활동가 서명 패드 모달
    document.querySelectorAll('.sig-box-preview[data-insp-name]').forEach(box => {
      box.addEventListener('click', () => {
        const inspName = box.getAttribute('data-insp-name');
        signaturePad.open({
          title: '활동가 전자 서명',
          signerName: inspName,
          onSave: (dataUrl) => {
            c.inspectorSignatures[inspName] = dataUrl;
            this.render();
            notifier.toast(`${inspName} 활동가 전자 서명이 저장되었습니다.`, 'success');
          }
        });
      });
    });

    // 이전 버튼
    const backBtn = document.getElementById('btnBackToStep4');
    if (backBtn) {
      backBtn.addEventListener('click', () => this.mediator.switchTab(4));
    }

    // 다음 단계 (6단계: 수혜자 관리카드) 버튼
    const nextBtn = document.getElementById('btnGoToStep6');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const consentVal = ValidationService.validateConsentAndSignatures(this.mediator.state.consent, this.mediator.state.basicInfo.inspectors, isProxy);
        if (!consentVal.isValid) {
          notifier.alert({
            title: '동의 및 전자서명 확인 필요',
            message: consentVal.message,
            confirmText: '확인'
          });
          return;
        }
        this.mediator.renderStep(6);
        this.mediator.switchTab(6);
      });
    }
  }

  // ========================================================
  // 인라인 수정 모달 (5단계 화면 이탈 방지)
  // ========================================================
  openStepEditModal(stepNum) {
    const existing = document.getElementById('stepEditModalContainer');
    if (existing) existing.remove();

    const b = this.mediator.state.basicInfo;
    const p = this.mediator.state.targetProfile;
    const g = p.guardian || {};
    const obs = this.mediator.state.observation;

    let modalTitle = '';
    let bodyHtml = '';

    if (stepNum === 1) {
      modalTitle = '1단계: 소속 기관 및 살핌단 정보 수정';
      bodyHtml = `
        <div class="form-group">
          <label class="form-label">참여기관명 <span class="req">*</span></label>
          <input type="text" class="form-input" id="editOrgName" value="${b.orgName}">
        </div>
        <div class="form-group">
          <label class="form-label">참여 사업단명 <span class="req">*</span></label>
          <input type="text" class="form-input" id="editProject" value="${b.project}">
        </div>
        <div class="form-group">
          <label class="form-label">참여 활동가 성명 (쉼표 구분) <span class="req">*</span></label>
          <input type="text" class="form-input" id="editInspectors" value="${b.inspectors.join(', ')}">
        </div>
        <div class="form-group">
          <label class="form-label">조사 일자</label>
          <input type="date" class="form-input" id="editInspectionDate" value="${b.inspectionDate}">
        </div>
      `;
    } else if (stepNum === 2) {
      modalTitle = '2단계: 안부 대상가구 정보 수정';
      const housingList = [
        '단독주택', '다가구·다세대주택', '아파트', '연립주택', '오피스텔',
        '고시원(텔)', '원룸', '쪽방', '여관·모텔', '직접기재'
      ];
      bodyHtml = `
        <div class="form-group">
          <label class="form-label">대상자 성명 <span class="req">*</span></label>
          <input type="text" class="form-input" id="editTargetName" value="${p.name}">
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div class="form-group">
            <label class="form-label">생년월일</label>
            <input type="date" class="form-input" id="editTargetBirth" value="${p.birth}">
          </div>
          <div class="form-group">
            <label class="form-label">성별</label>
            <select class="form-input" id="editTargetGender">
              <option value="남" ${p.gender === '남' ? 'selected' : ''}>남성</option>
              <option value="여" ${p.gender === '여' ? 'selected' : ''}>여성</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">연락처</label>
          <input type="text" class="form-input" id="editTargetPhone" value="${p.phone}">
        </div>
        <div class="form-group">
          <label class="form-label">거주지 주소</label>
          <input type="text" class="form-input" id="editTargetAddress" value="${p.address}">
        </div>
        <div class="form-group">
          <label class="form-label">거주지 유형 (10종)</label>
          <select class="form-input" id="editTargetHousing">
            ${housingList.map(h => `<option value="${h}" ${p.housingType === h ? 'selected' : ''}>${h}</option>`).join('')}
          </select>
        </div>
      `;
    } else if (stepNum === 3) {
      modalTitle = '3단계: 현장 6대 관찰 지표 수정';
      const obsItems = [
        { key: 'mailAccumulated', label: '1. 우편물·전단지 방치 (2주 이상 적재)' },
        { key: 'odorInsects', label: '2. 현관 주변 악취 및 해충 번식' },
        { key: 'trashBottles', label: '3. 집 주변 쓰레기 및 빈 병 적재' },
        { key: 'tvLightOn', label: '4. 낮에도 불 켜짐 / 밤에도 불 꺼짐 (인기척 없음)' },
        { key: 'isolatedLiving', label: '5. 극심한 두문불출 및 외출 모습 미확인' },
        { key: 'contactLost', label: '6. 최근 1주일 이상 연락두절 (전화 미수신)' }
      ];
      bodyHtml = `
        <div style="display:flex; flex-direction:column; gap:10px;">
          ${obsItems.map(item => `
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 10px;">
              <div style="font-size:11.5px; font-weight:600; color:#1e293b; margin-bottom:6px;">${item.label}</div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                <button type="button" class="btn-toggle modal-obs-btn ${obs[item.key] === false ? 'selected-clean' : ''}" data-key="${item.key}" data-val="false" style="padding:6px;">정상 (0점)</button>
                <button type="button" class="btn-toggle modal-obs-btn ${obs[item.key] === true ? 'selected-risk' : ''}" data-key="${item.key}" data-val="true" style="padding:6px;">있음 (1점)</button>
              </div>
            </div>
          `).join('')}
          <div class="form-group" style="margin-top:6px;">
            <label class="form-label">이웃·관리사무소 관찰 메모</label>
            <input type="text" class="form-input" id="editNeighborNote" value="${obs.neighborNote || ''}" placeholder="특이사항 메모">
          </div>
        </div>
      `;
    } else if (stepNum === 4) {
      modalTitle = '4단계: 10대 문항 위험도 진단 수정';
      bodyHtml = `
        <div style="font-size:12px; color:#475569; margin-bottom:12px; line-height:1.5;">
          10대 문항의 대화 코칭 및 원인(Why)을 정밀하게 수정하시려면 <strong>[4단계 전용 화면으로 이동]</strong>을 이용해 주십시오.
        </div>
        <button type="button" class="btn-primary-action" id="btnGoToStep4Full" style="width:100%; margin-bottom:10px;">
          4단계 (10대 문항 진단 화면)으로 이동 ➔
        </button>
      `;
    }

    const modalEl = document.createElement('div');
    modalEl.id = 'stepEditModalContainer';
    modalEl.className = 'step-edit-modal-backdrop';
    modalEl.innerHTML = `
      <div class="step-edit-modal-card">
        <div class="step-edit-modal-header">
          <h3 class="step-edit-modal-title">${modalTitle}</h3>
          <button type="button" class="step-edit-modal-close" id="btnCancelStepEdit">&times;</button>
        </div>
        <div class="step-edit-modal-body">
          ${bodyHtml}
        </div>
        <div class="step-edit-modal-footer">
          <button type="button" class="btn-secondary-action" id="btnCloseStepEdit">취소</button>
          <button type="button" class="btn-primary-action" id="btnSaveStepEdit">수정 완료</button>
        </div>
      </div>
    `;

    document.body.appendChild(modalEl);

    // 이벤트 바인딩
    const close = () => modalEl.remove();
    modalEl.querySelector('#btnCancelStepEdit').addEventListener('click', close);
    modalEl.querySelector('#btnCloseStepEdit').addEventListener('click', close);
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) close();
    });

    if (stepNum === 3) {
      modalEl.querySelectorAll('.modal-obs-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-key');
          const val = btn.getAttribute('data-val') === 'true';
          obs[key] = val;
          const parent = btn.parentElement;
          parent.querySelectorAll('.modal-obs-btn').forEach(b => {
            b.classList.remove('selected-clean', 'selected-risk');
          });
          if (val) btn.classList.add('selected-risk');
          else btn.classList.add('selected-clean');
        });
      });
    }

    const btnGoStep4 = modalEl.querySelector('#btnGoToStep4Full');
    if (btnGoStep4) {
      btnGoStep4.addEventListener('click', () => {
        close();
        this.mediator.renderStep(4);
        this.mediator.switchTab(4);
      });
    }

    modalEl.querySelector('#btnSaveStepEdit').addEventListener('click', () => {
      if (stepNum === 1) {
        b.orgName = modalEl.querySelector('#editOrgName').value.trim();
        b.project = modalEl.querySelector('#editProject').value.trim();
        const inspStr = modalEl.querySelector('#editInspectors').value;
        b.inspectors = inspStr.split(',').map(s => s.trim()).filter(Boolean);
        b.inspectionDate = modalEl.querySelector('#editInspectionDate').value;
        this.mediator.updateInspectionUids();
      } else if (stepNum === 2) {
        p.name = modalEl.querySelector('#editTargetName').value.trim();
        p.birth = modalEl.querySelector('#editTargetBirth').value;
        p.gender = modalEl.querySelector('#editTargetGender').value;
        p.phone = modalEl.querySelector('#editTargetPhone').value.trim();
        p.address = modalEl.querySelector('#editTargetAddress').value.trim();
        p.housingType = modalEl.querySelector('#editTargetHousing').value;
      } else if (stepNum === 3) {
        const noteEl = modalEl.querySelector('#editNeighborNote');
        if (noteEl) obs.neighborNote = noteEl.value.trim();
      }

      this.mediator.renderAllSteps();
      this.mediator.updateScore();
      this.render();
      close();
      notifier.toast(`${stepNum}단계 정보가 수정되었습니다.`, 'success');
    });
  }
}

