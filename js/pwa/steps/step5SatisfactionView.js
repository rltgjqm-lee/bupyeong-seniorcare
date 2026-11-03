/**
 * @file step5SatisfactionView.js
 * @description PWA 현장조사 Step 5: 부평형 통합돌봄 이용자 만족도 조사
 * - 단계적 잠금 및 아코디언 밸리데이션: 1단계(응답자·이용경로) 완료 후 2단계(5점척도) 해제, 3단계, 4단계 순차 개방
 * - 1~2점 체크 시 13번 의견란 자동 연동, 응답자 상세 관계 입력 지원
 */

import { notifier } from '../../utils/notifier.js';

export class Step5SatisfactionView {
  constructor(mediator) {
    this.mediator = mediator;
    this.accordionState = {
      catBody1: true,   // 1. 응답자 및 이용경로 (기본 펼침)
      catBody2: false,  // 2. 서비스 만족도 5점 척도 (기본 접힘/잠금)
      catBody3: false,  // 3. 도움 분야 및 개선 의견 (기본 접힘/잠금)
      catBody4: false   // 4. 조사자 사후 확인 (기본 접힘/잠금)
    };
  }

  get QUESTIONS_5P() {
    return [
      { key: 'accessibility', num: 2, label: '접근성', text: '신청·이용 절차가 이해하기 쉽고 편리하였습니까?' },
      { key: 'timeliness',    num: 3, label: '적시성', text: '필요한 서비스를 적절한 시기에 잘 연계받았습니까?' },
      { key: 'suitability',   num: 4, label: '적합성', text: '제공받은 서비스 내용에 만족하십니까?' },
      { key: 'effectiveness', num: 5, label: '효과성', text: '서비스가 실제 생활에 도움이 되었습니까?' },
      { key: 'quality',       num: 6, label: '서비스 품질', text: '서비스 제공자(제공기관)는 귀하의 상황을 이해하고 적절한 서비스를 제공하였습니까?' },
      { key: 'overall',       num: 7, label: '종합만족도', text: '전반적으로 의료·요양 통합돌봄 사업에 만족하십니까?' },
      { key: 'continuation',  num: 8, label: '지속 이용 의향', text: '앞으로도 서비스를 계속 이용하고 싶은 의향이 있습니까?' }
    ];
  }

  // 1단계 검증 (응답자 구분, 관계상세, 이용경로)
  validateStep1() {
    const s = this.mediator.state.satisfaction;
    if (!s.respondentType) {
      return { valid: false, message: '응답자 구분을 선택해 주십시오.' };
    }
    if (s.respondentType !== '본인' && (!s.respondentDetail || !s.respondentDetail.trim())) {
      return { valid: false, message: '응답자가 가족 또는 기타인 경우 대상자와의 관계를 입력해 주십시오.' };
    }
    if (!s.route) {
      return { valid: false, message: '1. 이용 경로를 선택해 주십시오.' };
    }
    return { valid: true };
  }

  // 2단계 검증 (2~8번 5점 척도 7문항 전체 선택 여부)
  validateStep2() {
    const s = this.mediator.state.satisfaction;
    for (const q of this.QUESTIONS_5P) {
      const val = s.scores?.[q.key];
      if (val === undefined || val === null) {
        return { valid: false, message: `${q.num}번 (${q.label}) 문항의 점수(1~5점)를 선택해 주십시오.`, qkey: q.key };
      }
    }
    return { valid: true };
  }

  // 3단계 검증 (9번 가장 도움이 된 분야)
  validateStep3() {
    const s = this.mediator.state.satisfaction;
    if (!s.bestField) {
      return { valid: false, message: '9. 가장 도움이 된 분야를 선택해 주십시오.' };
    }
    return { valid: true };
  }

  render(containerId = 'step4Container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const s = this.mediator.state.satisfaction;
    if (!s.complaintReasons) s.complaintReasons = {};
    if (!s.scores) {
      s.scores = {
        accessibility: null,
        timeliness: null,
        suitability: null,
        effectiveness: null,
        quality: null,
        overall: null,
        continuation: null
      };
    }

    const step1Valid = this.validateStep1().valid;
    const step2Valid = step1Valid && this.validateStep2().valid;
    const step3Valid = step2Valid && this.validateStep3().valid;

    const FIELDS = [
      '보건·의료 서비스', '건강관리예방', '일상생활(가사, 식사 등)', '주거 지원', '정서지원', '기타'
    ];

    const COMPLAINTS = [
      '없음', '신청절차', '안내 부족', '제공시간·횟수', '서비스 내용', '제공인력', '기타'
    ];

    container.innerHTML = `
      <!-- ========================================================
           대분류 1. 응답자 구분 및 서비스 이용 경로 (기본 펼침)
           ======================================================== -->
      <div class="pwa-card" id="cardCat1" style="margin-bottom: 12px; border: 1px solid #e2e8f0;">
        <div class="card-header-bar accordion-toggle-btn" data-target="catBody1" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none; padding: 6px 0;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="card-main-title" style="font-size: 14.5px; font-weight: 800; color: #0f172a;">1. 응답자 구분 및 서비스 이용 경로</span>
            <span id="badgeCat1" style="font-size: 11px; padding: 2px 7px; border-radius: 4px; font-weight: 700; ${step1Valid ? 'background:#f1f5f9; color:#0f172a;' : 'background:#f1f5f9; color:#64748b;'}">
              ${step1Valid ? '완료' : '필수 입력'}
            </span>
          </div>
          <span class="accordion-icon" id="icon_catBody1" style="font-size: 12px; font-weight: 600; color: #64748b;">
            ${this.accordionState.catBody1 ? '접기' : '펼치기'}
          </span>
        </div>

        <div class="card-body-wrap" id="catBody1" style="display: ${this.accordionState.catBody1 ? 'block' : 'none'}; margin-top: 10px;">
          <!-- 응답자 구분 (본인 / 가족 / 기타) -->
          <div class="form-group">
            <label class="form-label" style="font-size: 13px; font-weight: 700; color: #334155;">응답자 <span class="req" style="color: #ef4444;">*</span></label>
            <div style="display: flex; gap: 14px; margin-top: 6px;">
              ${['본인', '가족', '기타'].map(opt => `
                <label style="display: flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 600; cursor: pointer;">
                  <input type="radio" name="respRadio" value="${opt}" ${s.respondentType === opt ? 'checked' : ''}>
                  <span>${opt}</span>
                </label>
              `).join('')}
            </div>

            <!-- 가족 또는 기타 선택 시 세부 관계 입력창 -->
            <div id="respDetailWrap" style="margin-top: 8px; display: ${s.respondentType && s.respondentType !== '본인' ? 'block' : 'none'};">
              <input type="text" class="form-input" id="inputRespDetail" value="${s.respondentDetail || ''}" placeholder="대상자와의 관계를 입력하세요 (예: 자녀, 며느리, 이웃 등)" style="font-size: 13px; padding: 8px 10px; border: 1.5px solid #cbd5e1; border-radius: 6px; width: 100%;">
            </div>
          </div>

          <!-- 1번 문항: 이용 경로 -->
          <div class="form-group" style="margin-top: 14px;">
            <label class="form-label" style="font-size: 13px; font-weight: 700; color: #334155;">1. 이용 경로 <span class="req" style="color: #ef4444;">*</span></label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px;">
              ${['지인추천', '공무원 안내', '홍보물', '언론', '기타'].map(r => `
                <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; padding: 4px 0;">
                  <input type="radio" name="routeRadio" value="${r}" ${s.route === r ? 'checked' : ''}>
                  <span>${r}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <div style="margin-top: 16px; text-align: right;">
            <button type="button" class="btn-step-advance" id="btnAdvanceToCat2" style="background: #0f172a; color: #ffffff; padding: 9px 16px; font-size: 13px; font-weight: 700; border: none; border-radius: 6px; cursor: pointer;">
              다음: 2. 서비스 만족도 평가 (5점 척도) 진행
            </button>
          </div>
        </div>
      </div>

      <!-- ========================================================
           대분류 2. 서비스 만족도 평가 (5점 척도, 2~8번) (기본 접힘 & 1단계 미완료 시 완전 잠금)
           ======================================================== -->
      <div class="pwa-card accordion-card" id="cardCat2" style="margin-bottom: 12px; border: 1px solid #e2e8f0; opacity: ${step1Valid ? '1' : '0.45'}; transition: all 0.2s ease;">
        <div class="card-header-bar accordion-toggle-btn" data-target="catBody2" style="cursor: ${step1Valid ? 'pointer' : 'not-allowed'}; display: flex; justify-content: space-between; align-items: center; user-select: none; padding: 6px 0;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="card-main-title" style="font-size: 14.5px; font-weight: 800; color: #0f172a;">2. 서비스 만족도 평가 (5점 척도)</span>
            <span id="badgeCat2" style="font-size: 11px; padding: 2px 7px; border-radius: 4px; font-weight: 700; ${step2Valid ? 'background:#f1f5f9; color:#0f172a;' : 'background:#f1f5f9; color:#64748b;'}">
              ${step2Valid ? '완료' : (step1Valid ? '입력 대기' : '선행 단계 필요')}
            </span>
          </div>
          <span class="accordion-icon" id="icon_catBody2" style="font-size: 12px; font-weight: 600; color: #64748b;">
            ${this.accordionState.catBody2 ? '접기' : '펼치기'}
          </span>
        </div>

        <div class="card-body-wrap" id="catBody2" style="display: ${this.accordionState.catBody2 ? 'block' : 'none'}; margin-top: 10px; ${step1Valid ? '' : 'pointer-events: none;'}">
          <div style="font-size: 11.5px; color: #64748b; margin-bottom: 12px; background: #f1f5f9; padding: 6px 10px; border-radius: 6px; line-height: 1.45;">
            * 각 문항별로 1점(전혀 그렇지 않다) ~ 5점(매우 그렇다) 중 하나를 선택해 주세요.
          </div>

          ${this.QUESTIONS_5P.map(q => {
            const curVal = s.scores[q.key];
            const isLowScore = (curVal === 1 || curVal === 2);
            const reasonVal = s.complaintReasons?.[q.key] || '';
            return `
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px;" data-qkey="${q.key}">
                <div style="font-size: 13.5px; font-weight: 700; color: #0f172a; margin-bottom: 6px; line-height: 1.4;">
                  ${q.num}. (${q.label}) ${q.text}
                </div>

                <!-- 5점 척도 버튼 그룹 (단일 시스템 파란색 스타일) -->
                <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; margin-top: 8px;">
                  ${[1, 2, 3, 4, 5].map(pt => {
                    const labelMap = { 1: '전혀아님', 2: '그렇지않음', 3: '보통', 4: '그렇다', 5: '매우그렇다' };
                    const isChecked = (curVal === pt);

                    return `
                      <button type="button" class="btn-score-toggle" data-qkey="${q.key}" data-score="${pt}" ${step1Valid ? '' : 'disabled'} style="padding: 8px 2px; border-radius: 6px; font-size: 11px; text-align: center; border: 1.5px solid ${isChecked ? '#2563eb' : '#cbd5e1'}; background: ${isChecked ? '#2563eb' : '#ffffff'}; color: ${isChecked ? '#ffffff' : '#334155'}; font-weight: ${isChecked ? '700' : 'normal'}; cursor: ${step1Valid ? 'pointer' : 'not-allowed'}; transition: all 0.15s ease;">
                        <div style="font-size: 14px; font-weight: 700;">${pt}점</div>
                        <div style="font-size: 10px; margin-top: 2px;">${labelMap[pt]}</div>
                      </button>
                    `;
                  }).join('')}
                </div>

                <!-- 1~2점 체크 시 나타나는 동적 불만족 사유 입력칸 -->
                <div class="sub-complaint-box" id="subComplaintWrap_${q.key}" style="display: ${isLowScore ? 'block' : 'none'}; margin-top: 10px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px;">
                  <div style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px;">
                    [${q.num}번 ${q.label}] 불만족 세부 사유 (13번 의견란 자동 반영)
                  </div>
                  <input type="text" class="form-input sub-complaint-input" data-qkey="${q.key}" id="subComplaintInput_${q.key}" value="${reasonVal}" placeholder="${q.label} 관련 구체적인 불만족 사유를 적어주세요" style="width: 100%; font-size: 12.5px; padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 4px; background: #ffffff; color: #0f172a;">
                </div>
              </div>
            `;
          }).join('')}

          <div style="margin-top: 16px; text-align: right;">
            <button type="button" class="btn-step-advance" id="btnAdvanceToCat3" style="background: #0f172a; color: #ffffff; padding: 9px 16px; font-size: 13px; font-weight: 700; border: none; border-radius: 6px; cursor: pointer;">
              다음: 3. 도움 분야 및 개선 의견 진행
            </button>
          </div>
        </div>
      </div>

      <!-- ========================================================
           대분류 3. 도움 분야 및 개선 의견 (9~13번) (기본 접힘 & 2단계 미완료 시 완전 잠금)
           ======================================================== -->
      <div class="pwa-card accordion-card" id="cardCat3" style="margin-bottom: 12px; border: 1px solid #e2e8f0; opacity: ${step2Valid ? '1' : '0.45'}; transition: all 0.2s ease;">
        <div class="card-header-bar accordion-toggle-btn" data-target="catBody3" style="cursor: ${step2Valid ? 'pointer' : 'not-allowed'}; display: flex; justify-content: space-between; align-items: center; user-select: none; padding: 6px 0;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="card-main-title" style="font-size: 14.5px; font-weight: 800; color: #0f172a;">3. 가장 도움이 된 분야 및 개선 의견</span>
            <span id="badgeCat3" style="font-size: 11px; padding: 2px 7px; border-radius: 4px; font-weight: 700; ${step3Valid ? 'background:#f1f5f9; color:#0f172a;' : 'background:#f1f5f9; color:#64748b;'}">
              ${step3Valid ? '완료' : (step2Valid ? '입력 대기' : '선행 단계 필요')}
            </span>
          </div>
          <span class="accordion-icon" id="icon_catBody3" style="font-size: 12px; font-weight: 600; color: #64748b;">
            ${this.accordionState.catBody3 ? '접기' : '펼치기'}
          </span>
        </div>

        <div class="card-body-wrap" id="catBody3" style="display: ${this.accordionState.catBody3 ? 'block' : 'none'}; margin-top: 10px; ${step2Valid ? '' : 'pointer-events: none;'}">
          <!-- 9번 문항: 가장 도움이 된 분야 (1개 선택) -->
          <div class="form-group">
            <label class="form-label" style="font-size: 13px; font-weight: 700; color: #334155;">9. 가장 도움이 된 분야 (1개 선택) <span class="req" style="color: #ef4444;">*</span></label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px;">
              ${FIELDS.map(f => `
                <label style="display: flex; align-items: center; gap: 5px; font-size: 12.5px; cursor: ${step2Valid ? 'pointer' : 'not-allowed'}; padding: 4px 0;">
                  <input type="radio" name="bestFieldRadio" value="${f}" ${s.bestField === f ? 'checked' : ''} ${step2Valid ? '' : 'disabled'}>
                  <span>${f}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- 10번 문항: 추가로 필요한 서비스 (복수 선택) -->
          <div class="form-group" style="margin-top: 14px;">
            <label class="form-label" style="font-size: 13px; font-weight: 700; color: #334155;">10. 추가로 필요한 서비스 (복수 선택 가능)</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px;">
              ${FIELDS.map(f => {
                const isChecked = (s.neededServices || []).includes(f);
                return `
                  <label style="display: flex; align-items: center; gap: 5px; font-size: 12.5px; cursor: ${step2Valid ? 'pointer' : 'not-allowed'}; padding: 4px 0;">
                    <input type="checkbox" class="chk-needed" value="${f}" ${isChecked ? 'checked' : ''} ${step2Valid ? '' : 'disabled'}>
                    <span>${f}</span>
                  </label>
                `;
              }).join('')}
            </div>
          </div>

          <!-- 11번 문항: 불편 및 불만 사항 (복수 선택) -->
          <div class="form-group" style="margin-top: 14px;">
            <label class="form-label" style="font-size: 13px; font-weight: 700; color: #334155;">11. 불편 및 불만 사항 (복수 선택 가능)</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px;">
              ${COMPLAINTS.map(c => {
                const isChecked = (s.complaints || []).includes(c);
                return `
                  <label style="display: flex; align-items: center; gap: 5px; font-size: 12.5px; cursor: ${step2Valid ? 'pointer' : 'not-allowed'}; padding: 4px 0;">
                    <input type="checkbox" class="chk-complaint" value="${c}" ${isChecked ? 'checked' : ''} ${step2Valid ? '' : 'disabled'}>
                    <span>${c}</span>
                  </label>
                `;
              }).join('')}
            </div>
          </div>

          <!-- 12번 문항: 가장 만족한 점 -->
          <div class="form-group" style="margin-top: 16px;">
            <label class="form-label" for="inputBestPoint" style="font-size: 13px; font-weight: 700; color: #334155;">12. 가장 만족한 점</label>
            <textarea class="form-input" id="inputBestPoint" rows="2" placeholder="서비스를 이용하면서 가장 만족스러웠던 부분을 작성해 주세요." ${step2Valid ? '' : 'disabled'} style="width: 100%; font-size: 13px; padding: 8px 10px; border: 1.5px solid #cbd5e1; border-radius: 6px;">${s.bestPoint || ''}</textarea>
          </div>

          <!-- 13번 문항: 불만족 사유 및 건의사항 (2~8번 1·2점 자동 연동) -->
          <div class="form-group" style="margin-top: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <label class="form-label" for="inputImprovement" style="font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 0;">13. 불만족 사유 및 건의사항</label>
              <span style="font-size: 11px; font-weight: 600; color: #64748b;">(2~8번 1·2점 자동 연동 중)</span>
            </div>
            <textarea class="form-input" id="inputImprovement" rows="4" placeholder="1~2점 응답 사유 또는 부평구에 바라는 점을 작성해 주세요." ${step2Valid ? '' : 'disabled'} style="width: 100%; font-size: 13px; padding: 8px 10px; border: 1.5px solid #cbd5e1; border-radius: 6px;">${s.improvementPoint || ''}</textarea>
          </div>

          <div style="margin-top: 16px; text-align: right;">
            <button type="button" class="btn-step-advance" id="btnAdvanceToCat4" style="background: #0f172a; color: #ffffff; padding: 9px 16px; font-size: 13px; font-weight: 700; border: none; border-radius: 6px; cursor: pointer;">
              다음: 4. 조사자 사후 확인 진행
            </button>
          </div>
        </div>
      </div>

      <!-- ========================================================
           대분류 4. 조사자 사후 확인 [사후기입] (기본 접힘 & 3단계 미완료 시 완전 잠금)
           ======================================================== -->
      <div class="pwa-card accordion-card" id="cardCat4" style="margin-bottom: 12px; border: 1px solid #e2e8f0; opacity: ${step3Valid ? '1' : '0.45'}; transition: all 0.2s ease;">
        <div class="card-header-bar accordion-toggle-btn" data-target="catBody4" style="cursor: ${step3Valid ? 'pointer' : 'not-allowed'}; display: flex; justify-content: space-between; align-items: center; user-select: none; padding: 6px 0;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="card-main-title" style="font-size: 14.5px; font-weight: 800; color: #0f172a;">4. 조사자 사후 확인 [사후기입]</span>
            <span id="badgeCat4" style="font-size: 11px; padding: 2px 7px; border-radius: 4px; font-weight: 700; ${step3Valid ? 'background:#f1f5f9; color:#0f172a;' : 'background:#f1f5f9; color:#64748b;'}">
              ${step3Valid ? '입력 대기' : '선행 단계 필요'}
            </span>
          </div>
          <span class="accordion-icon" id="icon_catBody4" style="font-size: 12px; font-weight: 600; color: #64748b;">
            ${this.accordionState.catBody4 ? '접기' : '펼치기'}
          </span>
        </div>

        <div class="card-body-wrap" id="catBody4" style="display: ${this.accordionState.catBody4 ? 'block' : 'none'}; margin-top: 10px; ${step3Valid ? '' : 'pointer-events: none;'}">
          <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 8px;">
            <div class="form-group">
              <label class="form-label" style="font-size: 12.5px; font-weight: 700;">응답 신뢰도 <span class="req" style="color: #ef4444;">*</span></label>
              <select class="form-input" id="selReliability" ${step3Valid ? '' : 'disabled'} style="width: 100%; font-size: 13px; padding: 7px 8px; border: 1.5px solid #cbd5e1; border-radius: 6px;">
                <option value="">선택하세요</option>
                ${['높음', '보통', '낮음'].map(opt => `<option value="${opt}" ${s.reliability === opt ? 'selected' : ''}>${opt}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size: 12.5px; font-weight: 700;">의사소통 상태 <span class="req" style="color: #ef4444;">*</span></label>
              <select class="form-input" id="selCommunication" ${step3Valid ? '' : 'disabled'} style="width: 100%; font-size: 13px; padding: 7px 8px; border: 1.5px solid #cbd5e1; border-radius: 6px;">
                <option value="">선택하세요</option>
                ${['원활', '일부도움', '대리응답'].map(opt => `<option value="${opt}" ${s.communication === opt ? 'selected' : ''}>${opt}</option>`).join('')}
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1.5fr; gap: 8px; margin-top: 10px;">
            <div class="form-group">
              <label class="form-label" style="font-size: 12.5px; font-weight: 700;">향후 연계 여부 <span class="req" style="color: #ef4444;">*</span></label>
              <select class="form-input" id="selNextLink" ${step3Valid ? '' : 'disabled'} style="width: 100%; font-size: 13px; padding: 7px 8px; border: 1.5px solid #cbd5e1; border-radius: 6px;">
                <option value="">선택하세요</option>
                <option value="불필요" ${s.nextLink === '불필요' ? 'selected' : ''}>불필요</option>
                <option value="필요" ${s.nextLink === '필요' ? 'selected' : ''}>필요 (연계 의뢰)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="inputSpecialNote" style="font-size: 12.5px; font-weight: 700;">특이사항</label>
              <input type="text" class="form-input" id="inputSpecialNote" value="${s.specialNote || ''}" placeholder="조사 시 특이사항 간단히 기재" ${step3Valid ? '' : 'disabled'} style="width: 100%; font-size: 13px; padding: 7px 8px; border: 1.5px solid #cbd5e1; border-radius: 6px;">
            </div>
          </div>
        </div>
      </div>

      <div class="btn-action-row" style="margin-top: 16px; margin-bottom: 24px; display: flex; gap: 10px;">
        <button type="button" class="btn-secondary-action" id="btnBackToStep4" style="flex: 1; padding: 12px; font-size: 13.5px; font-weight: 700;">이전 (기초조사)</button>
        <button type="button" class="btn-primary-action" id="btnNextToStep6" style="flex: 1.5; padding: 12px; font-size: 14px; font-weight: 800; background: #0f172a; color: #fff; border: none; border-radius: 6px; cursor: pointer;">다음 (동의·서명)</button>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const s = this.mediator.state.satisfaction;

    // 0. 대분류별 접기/펴기 (Accordion Toggle) 이벤트 바인딩
    document.querySelectorAll('.accordion-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetId = btn.getAttribute('data-target');
        
        // 밸리데이션 검사 및 잠금 통제
        if (targetId === 'catBody2') {
          const v1 = this.validateStep1();
          if (!v1.valid) {
            notifier.alert({ title: '선행 단계 입력 필요', message: v1.message });
            this.openCategory('catBody1');
            return;
          }
        } else if (targetId === 'catBody3') {
          const v2 = this.validateStep2();
          if (!v2.valid) {
            notifier.alert({ title: '만족도 문항 선택 필요', message: v2.message });
            this.openCategory('catBody2');
            return;
          }
        } else if (targetId === 'catBody4') {
          const v3 = this.validateStep3();
          if (!v3.valid) {
            notifier.alert({ title: '도움 분야 선택 필요', message: v3.message });
            this.openCategory('catBody3');
            return;
          }
        }

        this.toggleCategory(targetId);
      });
    });

    // 1단계 -> 2단계 전진 버튼
    document.getElementById('btnAdvanceToCat2')?.addEventListener('click', () => {
      const v1 = this.validateStep1();
      if (!v1.valid) {
        notifier.alert({ title: '입력 확인', message: v1.message });
        return;
      }
      this.closeCategory('catBody1');
      this.openCategory('catBody2');
      this.updateCardStatuses();
      document.getElementById('cardCat2')?.scrollIntoView({ behavior: 'smooth' });
    });

    // 2단계 -> 3단계 전진 버튼
    document.getElementById('btnAdvanceToCat3')?.addEventListener('click', () => {
      const v2 = this.validateStep2();
      if (!v2.valid) {
        notifier.alert({ title: '입력 확인', message: v2.message });
        return;
      }
      this.closeCategory('catBody2');
      this.openCategory('catBody3');
      this.updateCardStatuses();
      document.getElementById('cardCat3')?.scrollIntoView({ behavior: 'smooth' });
    });

    // 3단계 -> 4단계 전진 버튼
    document.getElementById('btnAdvanceToCat4')?.addEventListener('click', () => {
      const v3 = this.validateStep3();
      if (!v3.valid) {
        notifier.alert({ title: '입력 확인', message: v3.message });
        return;
      }
      this.closeCategory('catBody3');
      this.openCategory('catBody4');
      this.updateCardStatuses();
      document.getElementById('cardCat4')?.scrollIntoView({ behavior: 'smooth' });
    });

    // 1. 응답자 라디오 & 관계 상세 입력 필드 토글
    document.querySelectorAll('input[name="respRadio"]').forEach(r => {
      r.addEventListener('change', (e) => {
        if (e.target.checked) {
          s.respondentType = e.target.value;
          const wrap = document.getElementById('respDetailWrap');
          if (wrap) {
            wrap.style.display = (e.target.value !== '본인') ? 'block' : 'none';
          }
          this.updateCardStatuses();
        }
      });
    });

    const inputRespDetail = document.getElementById('inputRespDetail');
    if (inputRespDetail) {
      inputRespDetail.addEventListener('input', (e) => {
        s.respondentDetail = e.target.value.trim();
        this.updateCardStatuses();
      });
    }

    // 경로 라디오
    document.querySelectorAll('input[name="routeRadio"]').forEach(r => {
      r.addEventListener('change', (e) => {
        if (e.target.checked) {
          s.route = e.target.value;
          this.updateCardStatuses();
        }
      });
    });

    // 2. 5점 척도 버튼 클릭 및 1~2점 동적 불만족 연동
    document.querySelectorAll('.btn-score-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetBtn = e.currentTarget;
        const qkey = targetBtn.dataset.qkey;
        const score = parseInt(targetBtn.dataset.score, 10);
        s.scores[qkey] = score;

        // 동일 문항 버튼 스타일 갱신 (단일 파란색 스타일)
        document.querySelectorAll(`.btn-score-toggle[data-qkey="${qkey}"]`).forEach(b => {
          const pt = parseInt(b.dataset.score, 10);
          const isSel = (pt === score);
          b.style.borderColor = isSel ? '#2563eb' : '#cbd5e1';
          b.style.background = isSel ? '#2563eb' : '#ffffff';
          b.style.color = isSel ? '#ffffff' : '#334155';
          b.style.fontWeight = isSel ? '700' : 'normal';
        });

        // 1~2점 체크 시 해당 문항 하단 불만족 사유 입력칸 노출/숨김
        const subWrap = document.getElementById(`subComplaintWrap_${qkey}`);
        if (subWrap) {
          subWrap.style.display = (score === 1 || score === 2) ? 'block' : 'none';
        }

        // 13번 불만족 사유 및 건의사항 자동 동기화
        this.syncToImprovementText();
        this.updateCardStatuses();
      });
    });

    // 개별 문항 불만족 사유 입력 시 13번 실시간 동기화
    document.querySelectorAll('.sub-complaint-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const qkey = e.target.getAttribute('data-qkey');
        if (!s.complaintReasons) s.complaintReasons = {};
        s.complaintReasons[qkey] = e.target.value;
        this.syncToImprovementText();
      });
    });

    // 도움분야 라디오
    document.querySelectorAll('input[name="bestFieldRadio"]').forEach(r => {
      r.addEventListener('change', (e) => {
        if (e.target.checked) {
          s.bestField = e.target.value;
          this.updateCardStatuses();
        }
      });
    });

    // 추가 필요 서비스 체크박스
    document.querySelectorAll('.chk-needed').forEach(chk => {
      chk.addEventListener('change', () => {
        const checked = Array.from(document.querySelectorAll('.chk-needed:checked')).map(c => c.value);
        s.neededServices = checked;
      });
    });

    // 11번 불만사항 체크박스 ('없음' 선택 시 배타적 처리)
    document.querySelectorAll('.chk-complaint').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === '없음' && e.target.checked) {
          document.querySelectorAll('.chk-complaint').forEach(c => {
            if (c.value !== '없음') c.checked = false;
          });
        } else if (val !== '없음' && e.target.checked) {
          const noneChk = document.querySelector('.chk-complaint[value="없음"]');
          if (noneChk) noneChk.checked = false;
        }
        const checked = Array.from(document.querySelectorAll('.chk-complaint:checked')).map(c => c.value);
        s.complaints = checked;
      });
    });

    const inputBest = document.getElementById('inputBestPoint');
    if (inputBest) inputBest.addEventListener('input', (e) => { s.bestPoint = e.target.value.trim(); });

    const inputImprove = document.getElementById('inputImprovement');
    if (inputImprove) {
      inputImprove.addEventListener('input', (e) => {
        s.improvementPoint = e.target.value;
      });
    }

    const selRel = document.getElementById('selReliability');
    if (selRel) selRel.addEventListener('change', (e) => { s.reliability = e.target.value; });

    const selComm = document.getElementById('selCommunication');
    if (selComm) selComm.addEventListener('change', (e) => { s.communication = e.target.value; });

    const selNext = document.getElementById('selNextLink');
    if (selNext) selNext.addEventListener('change', (e) => { s.nextLink = e.target.value; });

    const inputSpec = document.getElementById('inputSpecialNote');
    if (inputSpec) inputSpec.addEventListener('input', (e) => { s.specialNote = e.target.value.trim(); });

    // 이전/다음
    const btnBack = document.getElementById('btnBackToStep4');
    const btnNext = document.getElementById('btnNextToStep6');

    if (btnBack) btnBack.addEventListener('click', () => this.mediator.switchTab(3));
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        const v1 = this.validateStep1();
        if (!v1.valid) {
          notifier.alert({ title: '1단계 미완료', message: v1.message });
          this.openCategory('catBody1');
          return;
        }
        const v2 = this.validateStep2();
        if (!v2.valid) {
          notifier.alert({ title: '2단계 만족도 미완료', message: v2.message });
          this.openCategory('catBody2');
          return;
        }
        const v3 = this.validateStep3();
        if (!v3.valid) {
          notifier.alert({ title: '3단계 도움분야 미완료', message: v3.message });
          this.openCategory('catBody3');
          return;
        }
        this.mediator.switchTab(6);
      });
    }
  }

  openCategory(id) {
    const el = document.getElementById(id);
    const icon = document.getElementById(`icon_${id}`);
    if (el) el.style.display = 'block';
    if (icon) icon.textContent = '접기';
    this.accordionState[id] = true;
  }

  closeCategory(id) {
    const el = document.getElementById(id);
    const icon = document.getElementById(`icon_${id}`);
    if (el) el.style.display = 'none';
    if (icon) icon.textContent = '펼치기';
    this.accordionState[id] = false;
  }

  toggleCategory(id) {
    if (this.accordionState[id]) {
      this.closeCategory(id);
    } else {
      this.openCategory(id);
    }
  }

  updateCardStatuses() {
    const step1Valid = this.validateStep1().valid;
    const step2Valid = step1Valid && this.validateStep2().valid;
    const step3Valid = step2Valid && this.validateStep3().valid;

    // Card 1
    const badge1 = document.getElementById('badgeCat1');
    if (badge1) {
      badge1.textContent = step1Valid ? '완료' : '필수 입력';
      badge1.style.color = step1Valid ? '#0f172a' : '#64748b';
    }

    // Card 2
    const card2 = document.getElementById('cardCat2');
    const badge2 = document.getElementById('badgeCat2');
    const body2 = document.getElementById('catBody2');
    const header2 = card2?.querySelector('.accordion-toggle-btn');
    if (card2) {
      card2.style.opacity = step1Valid ? '1' : '0.45';
    }
    if (header2) {
      header2.style.cursor = step1Valid ? 'pointer' : 'not-allowed';
    }
    if (body2) {
      body2.style.pointerEvents = step1Valid ? 'auto' : 'none';
      body2.querySelectorAll('.btn-score-toggle').forEach(b => {
        b.disabled = !step1Valid;
        b.style.cursor = step1Valid ? 'pointer' : 'not-allowed';
      });
    }
    if (badge2) {
      badge2.textContent = step2Valid ? '완료' : (step1Valid ? '입력 대기' : '선행 단계 필요');
      badge2.style.color = step2Valid ? '#0f172a' : '#64748b';
    }

    // Card 3
    const card3 = document.getElementById('cardCat3');
    const badge3 = document.getElementById('badgeCat3');
    const body3 = document.getElementById('catBody3');
    const header3 = card3?.querySelector('.accordion-toggle-btn');
    if (card3) {
      card3.style.opacity = step2Valid ? '1' : '0.45';
    }
    if (header3) {
      header3.style.cursor = step2Valid ? 'pointer' : 'not-allowed';
    }
    if (body3) {
      body3.style.pointerEvents = step2Valid ? 'auto' : 'none';
      body3.querySelectorAll('input[type="radio"], input[type="checkbox"], textarea, button').forEach(el => {
        el.disabled = !step2Valid;
      });
    }
    if (badge3) {
      badge3.textContent = step3Valid ? '완료' : (step2Valid ? '입력 대기' : '선행 단계 필요');
      badge3.style.color = step3Valid ? '#0f172a' : '#64748b';
    }

    // Card 4
    const card4 = document.getElementById('cardCat4');
    const badge4 = document.getElementById('badgeCat4');
    const body4 = document.getElementById('catBody4');
    const header4 = card4?.querySelector('.accordion-toggle-btn');
    if (card4) {
      card4.style.opacity = step3Valid ? '1' : '0.45';
    }
    if (header4) {
      header4.style.cursor = step3Valid ? 'pointer' : 'not-allowed';
    }
    if (body4) {
      body4.style.pointerEvents = step3Valid ? 'auto' : 'none';
      body4.querySelectorAll('select, input').forEach(el => {
        el.disabled = !step3Valid;
      });
    }
    if (badge4) {
      badge4.textContent = step3Valid ? '입력 대기' : '선행 단계 필요';
      badge4.style.color = '#64748b';
    }
  }

  /**
   * 2~8번 문항 중 1점 또는 2점으로 평가된 문항과 세부 사유를 13번 의견란에 실시간 반영
   */
  syncToImprovementText() {
    const s = this.mediator.state.satisfaction;
    const lowScoreLines = [];
    this.QUESTIONS_5P.forEach(q => {
      const score = s.scores[q.key];
      if (score === 1 || score === 2) {
        const scoreLabel = score === 1 ? '1점(전혀아님)' : '2점(그렇지않음)';
        const reason = s.complaintReasons?.[q.key]?.trim();
        lowScoreLines.push(`• [${q.num}번 ${q.label} ${scoreLabel}]${reason ? `: ${reason}` : ': (사유 미기재)'}`);
      }
    });

    const inputImprove = document.getElementById('inputImprovement');
    if (!inputImprove) return;

    if (lowScoreLines.length > 0) {
      const autoSection = `[대영역 Ⅲ 불만족 체크 항목]\n${lowScoreLines.join('\n')}\n\n[기타 건의사항]\n`;
      const existingManual = s.improvementPoint && !s.improvementPoint.includes('[대영역 Ⅲ 불만족 체크 항목]')
        ? s.improvementPoint
        : (s.manualNote || '');
      
      inputImprove.value = `${autoSection}${existingManual}`.trim();
      s.improvementPoint = inputImprove.value;
    }
  }
}
