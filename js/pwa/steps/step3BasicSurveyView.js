/**
 * @file step3BasicSurveyView.js
 * @description PWA 현장조사 Step 3: 공통 기초조사 및 대상자 업무 분기 (모니터링 vs 만족도)
 */

import { notifier } from '../../utils/notifier.js';

export class Step3BasicSurveyView {
  constructor(mediator) {
    this.mediator = mediator;
    this.showHousingModal = false;
  }

  render() {
    const container = document.getElementById('step3Container');
    if (!container) return;

    const t = this.mediator.state.targetProfile;

    // 기본값 초기화
    if (!t.householdType) t.householdType = '독거';
    if (!t.housingEnvironment) t.housingEnvironment = '청결';
    if (!t.housingEnvReason) t.housingEnvReason = '';

    const isNonSingle = t.householdType === '비독거';

    container.innerHTML = `
      <!-- 1. 가구 형태 (조건부 하위 분기) -->
      <div class="pwa-card">
        <div class="card-header-bar">
          <span class="card-main-title">가구 형태</span>
        </div>

        <div style="display: flex; gap: 8px; margin-bottom: 10px;">
          <button type="button" class="obs-btn-switch ${t.householdType === '독거' ? 'selected-clean' : ''}" id="btnHouseholdSingle" style="flex: 1; height: 40px; font-size: 13px;">
            독거 (1인 가구)
          </button>
          <button type="button" class="obs-btn-switch ${t.householdType === '비독거' ? 'selected-clean' : ''}" id="btnHouseholdNonSingle" style="flex: 1; height: 40px; font-size: 13px;">
            비독거 (동거 가구)
          </button>
        </div>

        <!-- 비독거 선택 시 활성화되는 하위 동거인 선택 -->
        <div id="subHouseholdBox" style="display: ${isNonSingle ? 'block' : 'none'}; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-top: 6px;">
          <label class="form-label" style="font-size: 12px; color: #475569; margin-bottom: 6px;">동거 가족 구성 선택</label>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 8px;">
            ${['부부', '노부모', '성인자녀', '조손', '기타'].map(sub => `
              <button type="button" class="btn-secondary-action btn-sub-household ${t.householdSub === sub ? 'active-sub' : ''}" data-sub="${sub}" style="min-height: 34px; font-size: 12px; padding: 4px; ${t.householdSub === sub ? 'background:#0f172a; color:#ffffff; font-weight:700;' : ''}">
                ${sub}
              </button>
            `).join('')}
          </div>
          <div id="subHouseholdOtherWrap" style="display: ${t.householdSub === '기타' ? 'block' : 'none'};">
            <input type="text" class="form-input" id="inputHouseholdOther" value="${t.householdOther}" placeholder="기타 동거 형태 직접 입력" style="font-size: 12px;">
          </div>
        </div>
      </div>

      <!-- 2. 사회보장 수급권 및 수혜자격 -->
      <div class="pwa-card">
        <div class="card-header-bar">
          <span class="card-main-title">사회보장 및 수혜자격</span>
        </div>

        <div class="form-group">
          <label class="form-label">사회보장 수급권 <span class="req">*</span></label>
          <select class="form-input" id="selectSocialSecurity" style="font-size: 13px;">
            <option value="" disabled ${!t.socialSecurity ? 'selected' : ''}>-- 사회보장 수급권을 선택하여 주십시오 --</option>
            <option value="국민기초생활보장제도" ${t.socialSecurity === '국민기초생활보장제도' ? 'selected' : ''}>국민기초생활보장제도 (생계·의료·주거급여)</option>
            <option value="차상위" ${t.socialSecurity === '차상위' ? 'selected' : ''}>차상위 계층</option>
            <option value="일반가구" ${t.socialSecurity === '일반가구' ? 'selected' : ''}>일반 가구</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">수혜자격 <span class="req">*</span></label>
          <select class="form-input" id="selectBenefitStatus" style="font-size: 13px;">
            <option value="" disabled ${!t.benefitStatus ? 'selected' : ''}>-- 수혜자격을 선택하여 주십시오 --</option>
            <option value="맞춤형급여" ${t.benefitStatus === '맞춤형급여' ? 'selected' : ''}>맞춤형급여 (생계, 의료, 주거)</option>
            <option value="차상위" ${t.benefitStatus === '차상위' ? 'selected' : ''}>차상위</option>
            <option value="장애인연금" ${t.benefitStatus === '장애인연금' ? 'selected' : ''}>장애인연금</option>
            <option value="기초연금" ${t.benefitStatus === '기초연금' ? 'selected' : ''}>기초연금</option>
            <option value="기타" ${t.benefitStatus === '기타' ? 'selected' : ''}>기타</option>
            <option value="없음" ${t.benefitStatus === '없음' ? 'selected' : ''}>해당 없음</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">대상자 특성 / 유형 <span class="req">*</span></label>
          <select class="form-input" id="selectTargetAttribute" style="font-size: 13px;">
            <option value="" disabled ${!t.targetAttribute ? 'selected' : ''}>-- 대상자 특성 / 유형을 선택하여 주십시오 --</option>
            <option value="장기요양재가급여" ${t.targetAttribute === '장기요양재가급여' ? 'selected' : ''}>장기요양재가급여</option>
            <option value="노인맞춤돌봄서비스" ${t.targetAttribute === '노인맞춤돌봄서비스' ? 'selected' : ''}>노인맞춤돌봄서비스</option>
            <option value="장애인활동보조 수급자" ${t.targetAttribute === '장애인활동보조 수급자' ? 'selected' : ''}>장애인활동보조 수급자</option>
            <option value="해당없음" ${t.targetAttribute === '해당없음' ? 'selected' : ''}>기타 (해당 없음)</option>
            <option value="기타" ${t.targetAttribute === '기타' ? 'selected' : ''}>기타</option>
          </select>
        </div>
      </div>

      <!-- 3. 대상자 업무 선택 (하단 이전 버튼 없이 깔끔하게 마감) -->
      <div class="pwa-card" style="margin-bottom: 30px; border: 1px solid #cbd5e1;">
        <div class="card-header-bar" style="margin-bottom: 10px;">
          <span class="card-main-title">대상자 업무입니다</span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <button type="button" class="btn-primary-action" id="btnGoMonitoring" style="height: 48px; font-size: 15px; font-weight: 700; background: #0f172a; color: #ffffff;">
            모니터링
          </button>
          <button type="button" class="btn-primary-action" id="btnGoSatisfaction" style="height: 48px; font-size: 15px; font-weight: 700; background: #1e293b; color: #ffffff;">
            만족도
          </button>
        </div>
      </div>

      <!-- 주거환경 체크 팝업 모달 (모니터링 클릭 시 확인) -->
      <div id="housingCheckModal" style="display: ${this.showHousingModal ? 'flex' : 'none'}; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 99999; background: rgba(15,23,42,0.65); align-items: center; justify-content: center;">
        <div style="width: 90%; max-width: 400px; background: #ffffff; border-radius: 12px; padding: 20px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);">
          <div style="font-weight: 700; font-size: 15px; color: #0f172a; margin-bottom: 6px;">
            주거환경 확인
          </div>
          <div style="font-size: 12.5px; color: #475569; margin-bottom: 14px;">
            모니터링 기록을 위해 하단의 주거환경을 체크하여 주십시오.
          </div>

          <div style="display: flex; gap: 6px; margin-bottom: 12px;">
            ${['청결', '보통', '불량'].map(env => `
              <button type="button" class="obs-btn-switch btn-modal-housing-env ${t.housingEnvironment === env ? 'selected-clean' : ''}" data-env="${env}" style="flex: 1; height: 36px; font-size: 13px;">
                ${env}
              </button>
            `).join('')}
          </div>

          <div id="modalHousingReasonWrap" style="display: ${t.housingEnvironment === '불량' ? 'block' : 'none'}; margin-bottom: 14px;">
            <input type="text" class="form-input" id="inputModalHousingReason" value="${t.housingEnvReason}" placeholder="불량 사유 기재 (곰팡이, 누수 등)" style="font-size: 12px;">
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px;">
            <button type="button" id="btnCancelHousingModal" style="min-width: 64px; height: 32px; padding: 0 12px; font-size: 12px; background: #ffffff; border: 1px solid #cbd5e1; color: #64748b; border-radius: 6px; cursor: pointer;">
              취소
            </button>
            <button type="button" id="btnConfirmHousingModal" style="min-width: 84px; height: 32px; padding: 0 14px; font-size: 12px; font-weight: 600; background: #334155; border: 1px solid #334155; color: #ffffff; border-radius: 6px; cursor: pointer;">
              확인 후 이동
            </button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const t = this.mediator.state.targetProfile;

    // 1) 가구 형태 토글
    const btnSingle = document.getElementById('btnHouseholdSingle');
    const btnNonSingle = document.getElementById('btnHouseholdNonSingle');
    const subBox = document.getElementById('subHouseholdBox');

    if (btnSingle && btnNonSingle && subBox) {
      btnSingle.addEventListener('click', () => {
        t.householdType = '독거';
        btnSingle.className = 'obs-btn-switch selected-clean';
        btnNonSingle.className = 'obs-btn-switch';
        subBox.style.display = 'none';
      });

      btnNonSingle.addEventListener('click', () => {
        t.householdType = '비독거';
        btnNonSingle.className = 'obs-btn-switch selected-clean';
        btnSingle.className = 'obs-btn-switch';
        subBox.style.display = 'block';
      });
    }

    // 2) 비독거 동거인 칩 선택
    const otherWrap = document.getElementById('subHouseholdOtherWrap');
    document.querySelectorAll('.btn-sub-household').forEach(btn => {
      btn.addEventListener('click', () => {
        const sub = btn.getAttribute('data-sub');
        t.householdSub = sub;
        document.querySelectorAll('.btn-sub-household').forEach(b => {
          b.style.background = '';
          b.style.color = '';
          b.style.fontWeight = '';
        });
        btn.style.background = '#0f172a';
        btn.style.color = '#ffffff';
        btn.style.fontWeight = '700';

        if (sub === '기타') {
          if (otherWrap) otherWrap.style.display = 'block';
        } else {
          if (otherWrap) otherWrap.style.display = 'none';
          t.householdOther = '';
        }
      });
    });

    const inputOther = document.getElementById('inputHouseholdOther');
    if (inputOther) {
      inputOther.addEventListener('input', (e) => { t.householdOther = e.target.value; });
    }

    // 3) 셀렉트 박스
    const selSocial = document.getElementById('selectSocialSecurity');
    if (selSocial) selSocial.addEventListener('change', (e) => { t.socialSecurity = e.target.value; });

    const selBenefit = document.getElementById('selectBenefitStatus');
    if (selBenefit) selBenefit.addEventListener('change', (e) => { t.benefitStatus = e.target.value; });

    const selAttr = document.getElementById('selectTargetAttribute');
    if (selAttr) selAttr.addEventListener('change', (e) => { t.targetAttribute = e.target.value; });

    // 기초조사 필수 입력 밸리데이션 대전제 검증
    const validateBasicSurvey = () => {
      if (t.householdType === '비독거') {
        if (!t.householdSub) {
          notifier.toast('동거 가족 구성을 선택하여 주십시오.', 'warning');
          return false;
        }
        if (t.householdSub === '기타' && (!t.householdOther || !t.householdOther.trim())) {
          notifier.toast('기타 동거 형태를 입력하여 주십시오.', 'warning');
          document.getElementById('inputHouseholdOther')?.focus();
          return false;
        }
      }

      if (!t.socialSecurity) {
        notifier.toast('사회보장 수급권을 선택하여 주십시오.', 'warning');
        document.getElementById('selectSocialSecurity')?.focus();
        return false;
      }

      if (!t.benefitStatus) {
        notifier.toast('수혜자격을 선택하여 주십시오.', 'warning');
        document.getElementById('selectBenefitStatus')?.focus();
        return false;
      }

      if (!t.targetAttribute) {
        notifier.toast('대상자 특성 / 유형을 선택하여 주십시오.', 'warning');
        document.getElementById('selectTargetAttribute')?.focus();
        return false;
      }

      return true;
    };

    // 4) [ 만족도 ] 버튼 클릭 시 ➔ 필수 밸리데이션 검증 후 이동
    const btnGoSat = document.getElementById('btnGoSatisfaction');
    if (btnGoSat) {
      btnGoSat.addEventListener('click', () => {
        if (!validateBasicSurvey()) return;
        this.mediator.startSatisfactionFlow();
      });
    }

    // 5) [ 모니터링 ] 버튼 클릭 시 ➔ 필수 밸리데이션 검증 후 주거환경 체크 팝업 모달 띄움
    const btnGoMon = document.getElementById('btnGoMonitoring');
    if (btnGoMon) {
      btnGoMon.addEventListener('click', () => {
        if (!validateBasicSurvey()) return;
        this.showHousingModal = true;
        this.render();
      });
    }

    // 6) 모달 내부 주거환경 선택 이벤트
    const modalWrap = document.getElementById('modalHousingReasonWrap');
    document.querySelectorAll('.btn-modal-housing-env').forEach(btn => {
      btn.addEventListener('click', () => {
        const env = btn.getAttribute('data-env');
        t.housingEnvironment = env;
        document.querySelectorAll('.btn-modal-housing-env').forEach(b => b.className = 'obs-btn-switch btn-modal-housing-env');
        btn.className = 'obs-btn-switch btn-modal-housing-env selected-clean';

        if (env === '불량') {
          if (modalWrap) modalWrap.style.display = 'block';
        } else {
          if (modalWrap) modalWrap.style.display = 'none';
          t.housingEnvReason = '';
        }
      });
    });

    const inputModalReason = document.getElementById('inputModalHousingReason');
    if (inputModalReason) {
      inputModalReason.addEventListener('input', (e) => { t.housingEnvReason = e.target.value; });
    }

    const btnCancelModal = document.getElementById('btnCancelHousingModal');
    if (btnCancelModal) {
      btnCancelModal.addEventListener('click', () => {
        this.showHousingModal = false;
        this.render();
      });
    }

    const btnConfirmModal = document.getElementById('btnConfirmHousingModal');
    if (btnConfirmModal) {
      btnConfirmModal.addEventListener('click', () => {
        if (t.housingEnvironment === '불량' && (!t.housingEnvReason || !t.housingEnvReason.trim())) {
          notifier.toast('주거환경 불량 사유를 입력하여 주십시오.', 'warning');
          document.getElementById('inputModalHousingReason')?.focus();
          return;
        }
        this.showHousingModal = false;
        this.mediator.startMonitoringFlow();
      });
    }
  }
}
