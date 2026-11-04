/**
 * @file step2RevisitView.js
 * @description PWA 현장 조사 Step 2 n차 정기 안부살핌 뷰 (수혜자 관리카드 공식 5대 지표 100% 동일 규격 및 재관찰 전환) (ESM)
 */

import { AssignmentService } from '../../services/assignmentService.js';
import { maskName, maskPhone, maskAddress, maskUid, maskBirth } from '../../utils/mask.js';
import { notifier } from '../../utils/notifier.js?v=2.2.3';
import { signaturePad } from '../../utils/signaturePad.js';

export class Step2RevisitView {
  constructor(mediator) {
    this.mediator = mediator;
    this.selectedCase = null;
    this.isProfileExpanded = true;
    this.formData = this.getDefaultFormData();
  }

  getDefaultFormData() {
    return {
      method: 'visit', // 'visit' | 'call'
      healthCheck: null,
      healthNote: '',
      psychoCheck: null,
      psychoNote: '',
      livingCheck: null,
      livingNote: '',
      anomalyCheck: null,
      anomalyNote: '',
      etcCheck: null,
      etcNote: ''
    };
  }

  setCase(assignmentCase) {
    this.selectedCase = assignmentCase;
    this.formData = this.getDefaultFormData();
  }

  render(containerId = 'step2Container') {
    const container = document.getElementById(containerId);
    if (!container || !this.selectedCase) return;

    const c = this.selectedCase;
    const b = this.mediator.state.basicInfo;
    const g = c.guardian || {};
    const card = this.formData;
    if (!this.mediator.state.consent) this.mediator.state.consent = { inspectorSignatures: {} };
    if (!this.mediator.state.consent.inspectorSignatures) this.mediator.state.consent.inspectorSignatures = {};
    const cState = this.mediator.state.consent;

    const dateParts = (b.inspectionDate || new Date().toISOString().slice(0, 10)).split('-');
    const formattedDate = `${dateParts[1]}.${dateParts[2]}`;
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][new Date(b.inspectionDate || new Date()).getDay()];
    const dateLabel = `${formattedDate}(${dayOfWeek})`;

    const isExp = this.isProfileExpanded;
    const roundNumber = c.revisitCount || 2;

    container.innerHTML = `
      <div class="pwa-card">
        <div class="card-header-bar">
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="card-main-title" style="font-size:14.5px;">수혜자 관리카드</span>
            <span class="uid-badge" style="background:#e0f2fe; color:#0369a1; border-color:#bae6fd; font-weight:700;">${roundNumber}차</span>
          </div>
          <span class="uid-badge">관리번호: ${c.caseUid || c.householdId}</span>
        </div>

        <!-- 1. 대상자 및 보호자 기본 정보 (접이식 아코디언) -->
        <div style="border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: #ffffff; margin-bottom: 12px;">
          <div class="card-header-bar accordion-toggle-header" id="btnToggleProfileInRevisit" style="padding: 10px 12px; margin-bottom: 0; background: #f8fafc; border-bottom: ${isExp ? '1px solid #e2e8f0' : 'none'}; cursor: pointer;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 13px; font-weight: 700; color: #0f172a;">대상자 및 보호자 기본 정보</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 11px; color: #64748b;">${maskName(c.targetName)} (${c.gender === 'M' || c.gender === '남' ? '남성' : '여성'})</span>
              <span class="accordion-indicator" id="profileRevisitIndicator" style="font-size: 10.5px; padding: 2px 6px;">${isExp ? '[− 접기]' : '[+ 펼치기]'}</span>
            </div>
          </div>

          <div id="profileRevisitBody" style="display: ${isExp ? 'block' : 'none'}; padding: 10px 12px; font-size: 12px; color: #334155; line-height: 1.7; background: #ffffff;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 5px; margin-bottom: 5px;">
              <span>• <strong>성명 / 성별:</strong> ${maskName(c.targetName)} (${c.gender === 'M' || c.gender === '남' ? '남성' : '여성'})</span>
              <span>• <strong>생년월일:</strong> ${maskBirth(c.birth)}</span>
            </div>
            <div style="border-bottom: 1px dashed #e2e8f0; padding-bottom: 5px; margin-bottom: 5px;">
              • <strong>거주지 주소:</strong> ${maskAddress(c.address)}
            </div>
            <div style="border-bottom: 1px dashed #e2e8f0; padding-bottom: 5px; margin-bottom: 5px;">
              • <strong>이전 등급:</strong> <span style="color:#334155; font-weight:700;">${c.previousGrade || '기록 없음'}</span> (최근 조사: ${c.previousSurveyDate || '신규'})
            </div>
            <div>
              • <strong>보호자(비상연락):</strong> ${c.guardian ? `${maskName(g.name)} (${g.relation || '대리인'}, ${maskPhone(g.phone)})` : '무연고 (가족단절)'}
            </div>
          </div>
        </div>

        <!-- 현장 상태 급변 시 재관찰 전환 배너 -->
        <div class="pwa-card" style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; margin-bottom: 14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap: 10px;">
            <div>
              <strong style="color:#0f172a; font-size:12.5px;">현장 상태 급변 시 (재관찰)</strong>
              <div style="font-size:11px; color:#64748b; margin-top:2px;">건강 악화 등 발견 시 재관찰(Step 3)로 전환합니다.</div>
            </div>
            <button type="button" class="btn-secondary-action" id="btnSwitchToFullAssessment" style="background:#ffffff; border:1px solid #cbd5e1; color:#334155; padding:6px 12px; font-size:11.5px; font-weight:600; border-radius:4px; white-space:nowrap; cursor:pointer;">
              재관찰 전환
            </button>
          </div>
        </div>

        <!-- 2. 당일 안부확인 기록 섹션 헤더 -->
        <div class="card-header-bar" style="margin-bottom: 10px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">
          <span class="card-main-title">당일 안부확인 기록 (${dateLabel})</span>
          <span style="font-size: 11px; color: #64748b; font-weight: 600;">상태체크 및 세부내용</span>
        </div>

        <!-- 2-1. 안부확인 방식 선택 (방문 vs 통화 토글 버튼) -->
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between;">
          <div style="font-size: 12.5px; font-weight: 700; color: #0f172a;">
            확인 방식 선택
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn-toggle card-method-btn ${card.method === 'visit' ? 'selected-clean' : ''}" data-method="visit" style="padding: 7px 16px; font-size: 12px;">
              현장 방문
            </button>
            <button type="button" class="btn-toggle card-method-btn ${card.method === 'call' ? 'selected-clean' : ''}" data-method="call" style="padding: 7px 16px; font-size: 12px;">
              통화 (전화)
            </button>
          </div>
        </div>

        <!-- 3. 5대 지표 인터랙티브 상태체크 & 세부내용 카드 리스트 -->
        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;">
          
          <!-- 1) 건강상태 -->
          <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; background: #ffffff;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 13px; font-weight: 700; color: #0f172a;">1. 건강상태</span>
              <div class="obs-scale3-group">
                <button type="button" class="obs-btn-scale3 card-status-btn ${card.healthCheck === '양호' ? 'selected-good' : ''}" data-item="healthCheck" data-val="양호">양호</button>
                <button type="button" class="obs-btn-scale3 card-status-btn ${card.healthCheck === '보통' ? 'selected-warning' : ''}" data-item="healthCheck" data-val="보통">보통</button>
                <button type="button" class="obs-btn-scale3 card-status-btn ${card.healthCheck === '악화' ? 'selected-critical' : ''}" data-item="healthCheck" data-val="악화">악화</button>
              </div>
            </div>
            <div>
              <textarea class="card-note-textarea card-note-input" id="revisitHealthNote" data-note-key="healthNote" placeholder="예: 규칙적으로 식사 및 복약 유지 중 / 식사 결손 징후 등">${card.healthNote || ''}</textarea>
            </div>
          </div>

          <!-- 2) 심리상태 -->
          <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; background: #ffffff;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 13px; font-weight: 700; color: #0f172a;">2. 심리상태</span>
              <div class="obs-scale3-group">
                <button type="button" class="obs-btn-scale3 card-status-btn ${card.psychoCheck === '안정' ? 'selected-good' : ''}" data-item="psychoCheck" data-val="안정">안정</button>
                <button type="button" class="obs-btn-scale3 card-status-btn ${card.psychoCheck === '불안' ? 'selected-warning' : ''}" data-item="psychoCheck" data-val="불안">불안</button>
                <button type="button" class="obs-btn-scale3 card-status-btn ${card.psychoCheck === '우울' ? 'selected-critical' : ''}" data-item="psychoCheck" data-val="우울">우울</button>
              </div>
            </div>
            <div>
              <textarea class="card-note-textarea card-note-input" id="revisitPsychoNote" data-note-key="psychoNote" placeholder="예: 대화 원활하며 정서적으로 편안한 상태 / 우울감 호소 등">${card.psychoNote || ''}</textarea>
            </div>
          </div>

          <!-- 3) 주거환경 상태 -->
          <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; background: #ffffff;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 13px; font-weight: 700; color: #0f172a;">3. 주거환경 상태</span>
              <div class="obs-scale3-group">
                <button type="button" class="obs-btn-scale3 card-status-btn ${card.livingCheck === '청결' ? 'selected-good' : ''}" data-item="livingCheck" data-val="청결">청결</button>
                <button type="button" class="obs-btn-scale3 card-status-btn ${card.livingCheck === '정돈필요' ? 'selected-warning' : ''}" data-item="livingCheck" data-val="정돈필요">정돈필요</button>
                <button type="button" class="obs-btn-scale3 card-status-btn ${card.livingCheck === '심각' ? 'selected-critical' : ''}" data-item="livingCheck" data-val="심각">심각</button>
              </div>
            </div>
            <div>
              <textarea class="card-note-textarea card-note-input" id="revisitLivingNote" data-note-key="livingNote" placeholder="예: 실내외 청결 상태 양호하게 정돈됨 / 쓰레기 적치 등">${card.livingNote || ''}</textarea>
            </div>
          </div>

          <!-- 4) 이상징후여부 -->
          <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; background: #ffffff;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 13px; font-weight: 700; color: #0f172a;">4. 이상징후여부</span>
              <div class="obs-scale3-group">
                <button type="button" class="obs-btn-scale3 card-status-btn ${card.anomalyCheck === '없음' ? 'selected-good' : ''}" data-item="anomalyCheck" data-val="없음">없음</button>
                <button type="button" class="obs-btn-scale3 card-status-btn ${card.anomalyCheck === '고립조짐' ? 'selected-warning' : ''}" data-item="anomalyCheck" data-val="고립조짐">고립조짐</button>
                <button type="button" class="obs-btn-scale3 card-status-btn ${card.anomalyCheck === '응급징후' ? 'selected-critical' : ''}" data-item="anomalyCheck" data-val="응급징후">응급징후</button>
              </div>
            </div>
            <div>
              <textarea class="card-note-textarea card-note-input" id="revisitAnomalyNote" data-note-key="anomalyNote" placeholder="예: 특이 이상징후 없이 일상생활 유지 중 / 연락두절 감지 등">${card.anomalyNote || ''}</textarea>
            </div>
          </div>

          <!-- 5) 기타사항 -->
          <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; background: #ffffff;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 13px; font-weight: 700; color: #0f172a;">5. 기타사항</span>
              <div class="obs-scale3-group">
                <button type="button" class="obs-btn-scale3 card-status-btn ${card.etcCheck === '있음' ? 'selected-warning' : ''}" data-item="etcCheck" data-val="있음">있음</button>
                <button type="button" class="obs-btn-scale3 card-status-btn ${card.etcCheck === '없음' ? 'selected-good' : ''}" data-item="etcCheck" data-val="없음">없음</button>
              </div>
            </div>
            <div>
              <textarea class="card-note-textarea card-note-input" id="revisitEtcNote" data-note-key="etcNote" placeholder="예: 긴급 생계 지원 또는 식사 배달 연계 필요">${card.etcNote || ''}</textarea>
            </div>
          </div>

        </div>

        <!-- 참여자 확인.서명란 -->
        <div style="margin-top: 14px; padding: 12px 14px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px;">
          <div style="margin-bottom: 8px;">
            <span style="font-size: 13px; font-weight: 700; color: #1e293b;">
              참여자 확인.서명 <span class="req" style="color: #ef4444;">*</span>
            </span>
          </div>
          ${(b.inspectors && b.inspectors.length > 0 ? b.inspectors : ['활동가']).map((name, idx) => `
            <div class="sig-row-card" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div class="sig-row-info">
                <span class="sig-role-label" style="font-size: 10.5px; font-weight: 700; color: #64748b; display: block;">참여자 ${idx + 1}</span>
                <span class="sig-name-val" style="font-size: 13.5px; font-weight: 700; color: #0f172a;">성명: ${name || '미입력'}</span>
              </div>
              <div class="sig-box-preview revisit-insp-sig-box" data-insp-name="${name}" style="width: 130px; height: 52px; border: 1.5px dashed ${cState.inspectorSignatures?.[name] ? '#059669' : '#cbd5e1'}; background: ${cState.inspectorSignatures?.[name] ? '#ecfdf5' : '#f8fafc'}; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease;">
                ${cState.inspectorSignatures?.[name] ? `
                  <img src="${cState.inspectorSignatures[name]}" class="sig-preview-img" style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="${name} 서명">
                ` : `
                  <span class="sig-placeholder-text" style="font-size: 11.5px; color: #64748b; font-weight: 600;">[터치 서명]</span>
                `}
              </div>
            </div>
          `).join('')}
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
            ※ ${card.method === 'visit' ? '현장 방문' : '통화(전화)'} 안부확인 완료 보고를 위해 활동가 확인 서명이 필요합니다.
          </div>
        </div>

        <!-- 완료 및 저장 버튼 (우측 정렬) -->
        <div style="display:flex; justify-content:flex-end; margin-top:16px; margin-bottom:12px;">
          <button type="button" class="btn-primary-action" id="btnSaveRevisit" style="padding:10px 22px; font-size:14px; font-weight:700;">
            완료 및 저장
          </button>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const card = this.formData;

    // 0. 인적사항 아코디언 토글
    const btnToggle = document.getElementById('btnToggleProfileInRevisit');
    const profileBody = document.getElementById('profileRevisitBody');
    const profileInd = document.getElementById('profileRevisitIndicator');

    if (btnToggle && profileBody && profileInd) {
      btnToggle.addEventListener('click', () => {
        this.isProfileExpanded = !this.isProfileExpanded;
        profileBody.style.display = this.isProfileExpanded ? 'block' : 'none';
        profileInd.textContent = this.isProfileExpanded ? '[− 접기]' : '[+ 펼치기]';
        btnToggle.style.borderBottom = this.isProfileExpanded ? '1px solid #e2e8f0' : 'none';
      });
    }

    // 1. 방식 선택 (방문 vs 통화)
    document.querySelectorAll('.card-method-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const method = btn.getAttribute('data-method');
        card.method = method;
        document.querySelectorAll('.card-method-btn').forEach(b => b.classList.remove('selected-clean'));
        btn.classList.add('selected-clean');
      });
    });

    // 2. 5대 지표 상태 버튼 클릭
    document.querySelectorAll('.card-status-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.getAttribute('data-item');
        const val = btn.getAttribute('data-val');
        card[item] = val;

        const parent = btn.closest('.obs-scale3-group');
        if (parent) {
          parent.querySelectorAll('.card-status-btn').forEach(b => {
            b.classList.remove('selected-good', 'selected-warning', 'selected-critical');
          });
        }

        if (val === '양호' || val === '안정' || val === '청결' || (item === 'anomalyCheck' && val === '없음') || (item === 'etcCheck' && val === '없음')) {
          btn.classList.add('selected-good');
        } else if (val === '보통' || val === '불안' || val === '정돈필요' || val === '고립조짐' || (item === 'etcCheck' && val === '있음')) {
          btn.classList.add('selected-warning');
        } else {
          btn.classList.add('selected-critical');
        }
      });
    });

    // 3. 5대 지표 세부내용 텍스트 입력
    document.querySelectorAll('.card-note-input').forEach(textarea => {
      textarea.addEventListener('input', (e) => {
        const key = textarea.getAttribute('data-note-key');
        if (key) {
          card[key] = e.target.value;
        }
      });
    });

    // 4. 재관찰 전환 버튼
    const btnSwitch = document.getElementById('btnSwitchToFullAssessment');
    if (btnSwitch) {
      btnSwitch.addEventListener('click', () => {
        notifier.confirm({
          title: '재관찰 전환',
          message: `${this.selectedCase.targetName} 대상자의 현장 상태 변화로 인해\n재관찰(관찰기록지 작성)로 전환하시겠습니까?\n기존 대상자 인적사항과 보호자 정보는 자동으로 유지됩니다.`,
          confirmText: '재관찰 전환',
          cancelText: '취소',
          onConfirm: () => {
            this.switchToFullAssessment();
          }
        });
      });
    }

    // 5. 취소 / 목록 복귀
    const btnCancel = document.getElementById('btnCancelRevisit');
    if (btnCancel) {
      btnCancel.addEventListener('click', () => {
        this.mediator.switchTab(1);
      });
    }

    // 5-1. 참여 활동가 전자 서명 클릭 이벤트 바인딩
    document.querySelectorAll('.revisit-insp-sig-box[data-insp-name]').forEach(box => {
      box.addEventListener('click', () => {
        const inspName = box.getAttribute('data-insp-name');
        signaturePad.open({
          title: '활동가 전자 서명 (안부확인 보고)',
          signerName: inspName,
          onSave: (dataUrl) => {
            if (!this.mediator.state.consent) this.mediator.state.consent = {};
            if (!this.mediator.state.consent.inspectorSignatures) this.mediator.state.consent.inspectorSignatures = {};
            this.mediator.state.consent.inspectorSignatures[inspName] = dataUrl;
            this.render();
            notifier.toast(`${inspName} 활동가 확인 서명이 저장되었습니다.`, 'success');
          }
        });
      });
    });

    // 6. 안부확인 완료 및 저장
    const btnSave = document.getElementById('btnSaveRevisit');
    if (btnSave) {
      btnSave.addEventListener('click', async () => {
        await this.handleSaveRevisit();
      });
    }
  }

  /**
   * 재관찰 모드로 전환 (Step 2 인적사항 자동 인계 ➔ Step 3 현장 관찰)
   */
  switchToFullAssessment() {
    const c = this.selectedCase;
    const s = this.mediator.state;

    // 대상자 프로필 인계
    s.targetProfile.name = c.targetName;
    s.targetProfile.birth = c.birth;
    s.targetProfile.gender = c.gender === 'M' || c.gender === '남' ? '남' : '여';
    s.targetProfile.phone = c.phone;
    s.targetProfile.address = c.address;
    s.targetProfile.baseAddress = c.address;
    s.targetProfile.detailAddress = '';
    s.targetProfile.housingType = c.housingType || '';

    // 보호자 인계
    if (c.guardian) {
      s.targetProfile.guardian.hasGuardian = true;
      s.targetProfile.guardian.relation = c.guardian.relation;
      s.targetProfile.guardian.name = c.guardian.name;
      s.targetProfile.guardian.phone = c.guardian.phone;
      s.targetProfile.guardian.isProxySigner = c.guardian.isProxySigner || false;
    } else {
      s.targetProfile.guardian.hasGuardian = false;
    }

    s.basicInfo.householdId = c.householdId;
    s.basicInfo.caseUid = c.caseUid;
    s.basicInfo.isReAssessment = true;

    this.mediator.flowMode = 'ASSESSMENT';
    this.mediator.renderAllSteps();
    this.mediator.switchTab(3);

    notifier.toast('재관찰 모드로 전환되었습니다. 현장 관찰기록을 진행하세요.', 'info', 3000);
  }

  async handleSaveRevisit() {
    const c = this.selectedCase;
    const card = this.formData;
    const b = this.mediator.state.basicInfo;

    // 대전제(Guard Condition): 5대 지표 상태 선택 체크
    if (!card.healthCheck) {
      notifier.alert({ title: '항목 확인 필요', message: '1. 건강상태 항목을 선택해 주십시오.', confirmText: '확인' });
      return;
    }
    if (!card.psychoCheck) {
      notifier.alert({ title: '항목 확인 필요', message: '2. 심리상태 항목을 선택해 주십시오.', confirmText: '확인' });
      return;
    }
    if (!card.livingCheck) {
      notifier.alert({ title: '항목 확인 필요', message: '3. 주거환경 상태 항목을 선택해 주십시오.', confirmText: '확인' });
      return;
    }
    if (!card.anomalyCheck) {
      notifier.alert({ title: '항목 확인 필요', message: '4. 이상징후여부 항목을 선택해 주십시오.', confirmText: '확인' });
      return;
    }
    if (!card.etcCheck) {
      notifier.alert({ title: '항목 확인 필요', message: '5. 기타사항 항목을 선택해 주십시오.', confirmText: '확인' });
      return;
    }

    // 대전제(Guard Condition): 참여 활동가 전자 서명 누락 검증
    const cConsent = this.mediator.state.consent || {};
    const sigMap = cConsent.inspectorSignatures || {};
    const missingInsp = (b.inspectors || []).filter(name => !sigMap[name]);
    if (missingInsp.length > 0) {
      notifier.alert({
        title: '활동가 확인 서명 필요',
        message: `공식 수혜자 관리카드 출력을 위해 참여 활동가 [${missingInsp.join(', ')}]의 확인 서명을 완료해 주십시오.`,
        confirmText: '확인'
      });
      return;
    }

    const roundNumber = c.revisitCount || 2;
    const record = {
      recordUid: `MONIT_${Date.now()}`,
      householdId: c.householdId,
      caseUid: c.caseUid,
      round: roundNumber,
      inspectionDate: b.inspectionDate,
      method: card.method,
      inspectorNames: b.inspectors,
      beneficiaryCard: { ...card },
      signatures: { ...sigMap },
      createdAt: new Date().toISOString()
    };

    const res = await AssignmentService.saveMonitoringRecord(record);
    if (res.success) {
      notifier.alert({
        title: '안부확인 기록 저장 완료',
        message: `${c.targetName} 대상자의 ${roundNumber}차 안부확인 기록이 수혜자 관리카드에 안전하게 저장되었습니다.`,
        details: [
          { label: '대상자 성명', value: c.targetName },
          { label: '확인 회차', value: `${roundNumber}차 안부살핌` },
          { label: '확인 방식', value: card.method === 'visit' ? '현장 방문' : '통화 (전화)' },
          { label: '건강상태', value: `${card.healthCheck} ${card.healthNote ? `(${card.healthNote})` : ''}` },
          { label: '심리상태', value: `${card.psychoCheck} ${card.psychoNote ? `(${card.psychoNote})` : ''}` },
          { label: '주거환경', value: `${card.livingCheck} ${card.livingNote ? `(${card.livingNote})` : ''}` },
          { label: '이상징후', value: `${card.anomalyCheck} ${card.anomalyNote ? `(${card.anomalyNote})` : ''}` },
          { label: '담당 활동가', value: b.inspectors.join(', ') }
        ],
        confirmText: '서식 다운로드 이동',
        onConfirm: () => {
          this.mediator.state.isRevisit = true;
          this.mediator.state.revisitRound = roundNumber;
          this.mediator.state.targetProfile = {
            name: c.targetName,
            birth: c.birth,
            gender: c.gender === 'M' || c.gender === '남' ? '남' : '여',
            phone: c.phone,
            address: c.address,
            baseAddress: c.address,
            detailAddress: '',
            housingType: c.housingType || '',
            guardian: c.guardian ? { ...c.guardian } : { hasGuardian: false }
          };
          this.mediator.state.beneficiaryCard = { ...card };
          this.mediator.state.consent = {
            ...this.mediator.state.consent,
            inspectorSignatures: { ...sigMap }
          };
          this.mediator.renderStep(7);
          this.mediator.switchTab(7);
        }
      });
    } else {
      notifier.toast('저장 중 오류가 발생했습니다.', 'error');
    }
  }
}
