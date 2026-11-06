/**
 * @file step3WorkDutyView.js
 * @description 3단계 현장 공통 업무 뷰 (전 사업단 공통 법정 안부·안전 확인 표준) (ESM)
 */

import { maskName, maskAddress } from '../utils/mask.js';

export class Step3WorkDutyView {
  constructor(app) {
    this.app = app;
    this.currentContactState = null;
  }

  render(container) {
    if (!container) return;

    const session = this.app.session;
    const target = this.app.currentTarget || {};
    const buName = session.buName || '고독사 예방 안부살핌단';

    const displayName = maskName(target.name || '김만석');
    const displayAddr = maskAddress(target.address || target.baseAddress || '인천 서구 서곶로 284 302호');

    container.innerHTML = `
      <!-- 상단 대상자 어르신 요약 바 (독립 라운드 카드) -->
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-top: 4px; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 14px; font-weight: 700; color: #0f172a;">${displayName} 어르신 (${target.gender || '남'}, ${target.age || 78}세)</span>
          <span class="uid-badge">${target.caseUid || ''}</span>
        </div>
        <div style="margin-top: 4px; font-size: 12px; color: #64748b;">
          <span>${displayAddr}</span>
          <span style="margin: 0 4px; color: #cbd5e1;">|</span>
          <span style="font-weight: 600; color: #0f172a;">${buName}</span>
        </div>
      </div>

      <!-- 현장 공통 업무 헤더 바 (독립 라운드 카드) -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 13.5px; font-weight: 800; color: #0f172a;">현장 공통 업무 (안부·안전 확인)</span>
        <span class="badge badge-primary" style="font-size: 11px;">공통 필수</span>
      </div>

      <div id="dutyCommonFormArea">
        <!-- 1. 가택 안부 확인 접촉 상태 (라디오: 초기 미체크) -->
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: #ffffff; margin-bottom: 8px;">
          <div style="font-size: 13.5px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
            1. 가택 안부 확인 상태 <span style="color:#e11d48;">*</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
              <input type="radio" name="gdContact" value="대면 접촉" style="width: 20px; height: 20px; cursor: pointer;">
              <span>대면 접촉 (가택 내 직접 안부 확인 완료)</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
              <input type="radio" name="gdContact" value="비대면 접촉" style="width: 20px; height: 20px; cursor: pointer;">
              <span>비대면 접촉 (문밖 육성 대화 / 인터폰 / 전화 음성 확인)</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
              <input type="radio" name="gdContact" value="부재 / 인기척 없음" style="width: 20px; height: 20px; cursor: pointer;">
              <span>부재 / 인기척 없음 (통화 무응답 및 인기척 부재)</span>
            </label>
          </div>
        </div>

        <!-- 2, 3. 접촉 상태에 따른 동적 하단 확인 컨테이너 -->
        <div id="dutyCommonSubSection">
          ${this.renderCommonSubSection(this.currentContactState)}
        </div>
      </div>

      <!-- 하단 5:5 액션 버튼 -->
      <div class="btn-action-row" style="margin-top: 18px;">
        <button type="button" class="btn-secondary" id="btnBackToStep2">이전 (대상자)</button>
        <button type="button" class="btn-primary" id="btnNextToStep4">다음 (고유 활동보고)</button>
      </div>
    `;

    this.bindEvents(container);
  }

  // 접촉 상태(대면/비대면/부재)에 따른 공통 확인 단락 렌더링
  renderCommonSubSection(contactState) {
    if (!contactState) {
      return `
        <div style="border: 1px dashed #cbd5e1; border-radius: 8px; padding: 20px 14px; background: #f8fafc; text-align: center; color: #64748b; font-size: 12.5px; font-weight: 600; margin-bottom: 8px;">
          위 1번 항목의 <strong>가택 안부 확인 상태</strong>를 먼저 선택해 주세요.
        </div>
      `;
    }

    if (contactState === '대면 접촉') {
      return `
        <!-- 2. 대면 관찰: 기력 및 건강 상태 -->
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: #ffffff; margin-bottom: 8px;">
          <div style="font-size: 13.5px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
            2. 기력 및 건강 상태 <span style="color:#e11d48;">*</span>
          </div>
          <div style="display: flex; gap: 14px; flex-wrap: wrap;">
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
              <input type="radio" name="commonHealth" value="양호" style="width: 18px; height: 18px;">
              <span>양호 (거동 원활)</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
              <input type="radio" name="commonHealth" value="거동불편" style="width: 18px; height: 18px;">
              <span>거동 불편 / 통증 호소</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
              <input type="radio" name="commonHealth" value="심한쇠약" style="width: 18px; height: 18px;">
              <span>심한 쇠약 / 위급 징후</span>
            </label>
          </div>
        </div>

        <!-- 3. 가택 실내 환경 및 청결 상태 -->
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: #ffffff; margin-bottom: 8px;">
          <div style="font-size: 13.5px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
            3. 가택 실내 환경 및 청결 상태 <span style="color:#e11d48;">*</span>
          </div>
          <div style="display: flex; gap: 14px; flex-wrap: wrap;">
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
              <input type="radio" name="commonEnv" value="청결" style="width: 18px; height: 18px;">
              <span>청결 및 안전</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
              <input type="radio" name="commonEnv" value="위생불량" style="width: 18px; height: 18px;">
              <span>위생 / 정리 다소 불량</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
              <input type="radio" name="commonEnv" value="심한악취" style="width: 18px; height: 18px;">
              <span>심한 악취 / 방치 우려</span>
            </label>
          </div>
        </div>
      `;
    } else if (contactState === '비대면 접촉') {
      return `
        <!-- 2. 비대면 확인: 어르신 음성 응답 상태 -->
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: #ffffff; margin-bottom: 8px;">
          <div style="font-size: 13.5px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
            2. 어르신 음성 응답 상태 <span style="color:#e11d48;">*</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
              <input type="radio" name="commonVoice" value="명료하게 응답" style="width: 18px; height: 18px;">
              <span>명료하게 응답 (안부 확인 완료)</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
              <input type="radio" name="commonVoice" value="기력 없는 목소리" style="width: 18px; height: 18px;">
              <span>기력 없는 목소리 (지속 관찰 필요)</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
              <input type="radio" name="commonVoice" value="대화 지속 곤란" style="width: 18px; height: 18px;">
              <span>대화 지속 곤란 / 이상 반응 감지</span>
            </label>
          </div>
        </div>

        <!-- 3. 비대면 접촉 수단 -->
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: #ffffff; margin-bottom: 8px;">
          <div style="font-size: 13.5px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
            3. 비대면 접촉 수단 <span style="color:#e11d48;">*</span>
          </div>
          <div style="display: flex; gap: 14px; flex-wrap: wrap;">
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
              <input type="radio" name="commonChannel" value="문밖 육성 대화" style="width: 18px; height: 18px;">
              <span>문밖 육성 대화</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
              <input type="radio" name="commonChannel" value="인터폰" style="width: 18px; height: 18px;">
              <span>인터폰</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
              <input type="radio" name="commonChannel" value="유선전화 통화" style="width: 18px; height: 18px;">
              <span>유선·휴대전화 통화</span>
            </label>
          </div>
        </div>
      `;
    } else {
      // 부재 / 인기척 없음 (대면 관찰 항목 전면 배제!)
      return `
        <!-- 2. 부재 현장 안전 확인: 우편물 및 인기척 상태 -->
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: #ffffff; margin-bottom: 8px;">
          <div style="font-size: 13.5px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
            2. 우편물 및 인기척 상태 (부재 안전 확인) <span style="color:#e11d48;">*</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
              <input type="radio" name="commonAbsence" value="우편물 정상 (단순 외출 추정)" style="width: 18px; height: 18px;">
              <span>우편물 정상 (문앞 깨끗함, 단순 외출 추정)</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
              <input type="radio" name="commonAbsence" value="우편물/전단지 2일 이상 누적" style="width: 18px; height: 18px;">
              <span>우편물/전단지 2일 이상 누적 (주의 관찰 요망)</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
              <input type="radio" name="commonAbsence" value="우편물 장기 방치 및 계량기 미회전" style="width: 18px; height: 18px;">
              <span>우편물 장기 방치 및 계량기 미회전 (위험 징후 보고 대상)</span>
            </label>
          </div>
        </div>

        <!-- 3. 현장 추가 확인 및 탐문 내역 -->
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: #ffffff; margin-bottom: 8px;">
          <div style="font-size: 13.5px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
            3. 현장 추가 확인 및 탐문 내역 <span style="color:#e11d48;">*</span>
          </div>
          <div style="display: flex; gap: 14px; flex-wrap: wrap;">
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
              <input type="radio" name="commonNeighbor" value="전화통화 시도 무응답" style="width: 18px; height: 18px;">
              <span>전화통화 무응답</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
              <input type="radio" name="commonNeighbor" value="이웃/관리실 최근 목격 확인" style="width: 18px; height: 18px;">
              <span>이웃/관리실 최근 목격</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
              <input type="radio" name="commonNeighbor" value="이웃도 며칠간 못봄" style="width: 18px; height: 18px;">
              <span>이웃도 며칠간 미목격</span>
            </label>
          </div>
        </div>
      `;
    }
  }

  bindEvents(container) {
    const btnBack = container.querySelector('#btnBackToStep2');
    const btnNext = container.querySelector('#btnNextToStep4');

    // 접촉 상태 변경에 따른 하단 동적 스위칭
    const contactRadios = container.querySelectorAll('input[name="gdContact"]');
    contactRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.currentContactState = e.target.value;
        const subContainer = container.querySelector('#dutyCommonSubSection');
        if (subContainer) {
          subContainer.innerHTML = this.renderCommonSubSection(e.target.value);
        }
      });
    });

    btnBack?.addEventListener('click', () => {
      this.app.goToStep(2);
    });

    btnNext?.addEventListener('click', () => {
      // 🛡️ 대전제 1: 1번 안부 확인 상태 필수 검증
      const contactRadio = container.querySelector('input[name="gdContact"]:checked');
      if (!contactRadio) {
        alert('1. 가택 안부 확인 상태를 선택해 주세요.');
        return;
      }

      const contactVal = contactRadio.value;
      const commonResult = {
        contactStatus: contactVal,
        healthStatus: null,
        envStatus: null,
        voiceStatus: null,
        channel: null,
        absenceCheck: null,
        neighbor: null
      };

      if (contactVal === '대면 접촉') {
        // 🛡️ 대전제 2-A: 기력 및 건강 상태 검증
        const healthRadio = container.querySelector('input[name="commonHealth"]:checked');
        if (!healthRadio) {
          alert('2. 기력 및 건강 상태를 선택해 주세요.');
          return;
        }
        // 🛡️ 대전제 3-A: 실내 환경 및 청결 상태 검증
        const envRadio = container.querySelector('input[name="commonEnv"]:checked');
        if (!envRadio) {
          alert('3. 가택 실내 환경 및 청결 상태를 선택해 주세요.');
          return;
        }
        commonResult.healthStatus = healthRadio.value;
        commonResult.envStatus = envRadio.value;
      } else if (contactVal === '비대면 접촉') {
        // 🛡️ 대전제 2-B: 어르신 음성 응답 상태 검증
        const voiceRadio = container.querySelector('input[name="commonVoice"]:checked');
        if (!voiceRadio) {
          alert('2. 어르신 음성 응답 상태를 선택해 주세요.');
          return;
        }
        // 🛡️ 대전제 3-B: 비대면 접촉 수단 검증
        const channelRadio = container.querySelector('input[name="commonChannel"]:checked');
        if (!channelRadio) {
          alert('3. 비대면 접촉 수단을 선택해 주세요.');
          return;
        }
        commonResult.voiceStatus = voiceRadio.value;
        commonResult.channel = channelRadio.value;
      } else {
        // 🛡️ 대전제 2-C: 우편물 및 인기척 상태 검증
        const absenceRadio = container.querySelector('input[name="commonAbsence"]:checked');
        if (!absenceRadio) {
          alert('2. 우편물 및 인기척 상태를 선택해 주세요.');
          return;
        }
        // 🛡️ 대전제 3-C: 현장 추가 확인 및 탐문 내역 검증
        const neighborRadio = container.querySelector('input[name="commonNeighbor"]:checked');
        if (!neighborRadio) {
          alert('3. 현장 추가 확인 및 탐문 내역을 선택해 주세요.');
          return;
        }
        commonResult.absenceCheck = absenceRadio.value;
        commonResult.neighbor = neighborRadio.value;
      }

      this.app.currentDutyResult = { ...commonResult };
      this.app.goToStep(4);
    });
  }
}
