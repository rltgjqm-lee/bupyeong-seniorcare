/**
 * @file step4ReportConfirmView.js
 * @description 4단계 사업단별 고유 활동보고 뷰 (아코디언 접기/펼치기, D1 자동 저장, 다음 어르신 및 5단계 퇴근 동선) (ESM)
 */

import { ActivityService } from './activityService.js';
import { maskName, maskAddress } from '../utils/mask.js';
import { notifier } from '../utils/notifier.js';

export class Step4ReportConfirmView {
  constructor(app) {
    this.app = app;
  }

  render(container) {
    if (!container) return;

    const session = this.app.session;
    const target = this.app.currentTarget || {};
    const commonResult = this.app.currentDutyResult || {};
    const buCode = session.buCode || 'GD';
    const buName = session.buName || '고독사 예방 안부살핌단';

    const displayName = maskName(target.name || '김만석');
    const displayAddr = maskAddress(target.address || target.baseAddress || '인천 부평구 부평대로 168 302호');

    const isRiskContact = (commonResult.contactStatus || '').includes('부재');

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 3);
    const nextDateStr = nextDate.toISOString().slice(0, 10);

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

      <!-- 3단계 현장 공통 업무 결과 요약 (아코디언 토글 카드) -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; overflow: hidden;">
        <div id="btnToggleCommonSummary" style="padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none;">
          <span style="font-size: 12.5px; font-weight: 700; color: #0f172a;">
            ▾ 현장 공통 안부 요약: <span style="font-weight: 600; color: #475569;">${commonResult.contactStatus || '대면 접촉'} (${commonResult.healthStatus || commonResult.absenceCheck || '정상'})</span>
          </span>
          <span id="icoCommonToggle" style="font-size: 12px; color: #64748b;">▲</span>
        </div>
        <div id="bodyCommonSummary" style="padding: 0 14px 10px 14px; font-size: 12px; color: #475569; border-top: 1px solid #edf2f7; display: block;">
          <div style="margin-top: 6px;">• 접촉 상태: <strong>${commonResult.contactStatus || '대면 접촉'}</strong></div>
          ${commonResult.healthStatus ? `<div>• 기력 및 건강: <strong>${commonResult.healthStatus}</strong></div>` : ''}
          ${commonResult.envStatus ? `<div>• 실내 환경 청결: <strong>${commonResult.envStatus}</strong></div>` : ''}
          ${commonResult.voiceStatus ? `<div>• 음성 응답 상태: <strong>${commonResult.voiceStatus}</strong></div>` : ''}
          ${commonResult.absenceCheck ? `<div>• 부재 안전 확인: <strong>${commonResult.absenceCheck}</strong></div>` : ''}
        </div>
      </div>

      <!-- 4단계 활동보고 헤더 바 (독립 라운드 카드) -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 13.5px; font-weight: 800; color: #0f172a;">활동 체크</span>
        <span class="badge badge-primary" style="font-size: 11px;">사업단 특화</span>
      </div>

      <!-- 사업단별 상세 특화 서식 영역 (아코디언 지원) -->
      <div id="buSpecificFormArea">
        ${this.renderBuSpecificForm(buCode, commonResult.contactStatus || '대면 접촉')}
      </div>

      <!-- 종합 이상징후 판정 (독립 라운드 카드: 초기 미체크) -->
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: #ffffff; margin-bottom: 8px;">
        <div style="font-size: 13.5px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
          종합 이상징후 판정 <span style="color:#e11d48;">*</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
            <input type="radio" name="reportVerdict" value="정상 완료" style="width: 18px; height: 18px;">
            <span>정상 완료 (특이 위험 없음)</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
            <input type="radio" name="reportVerdict" value="주의 관찰 요망" style="width: 18px; height: 18px;">
            <span>주의 관찰 요망 (차기 방문 시 집중 확인)</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
            <input type="radio" name="reportVerdict" value="긴급 확인/개입 요청" style="width: 18px; height: 18px;">
            <span>긴급 확인 및 복지사 개입 요청 (위험 경보)</span>
          </label>
        </div>
      </div>

      <!-- 차기 방문 예정일 (독립 라운드 카드) -->
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: #ffffff; margin-bottom: 12px;">
        <label class="form-label" style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">
          차기 방문 예정일
        </label>
        <input type="date" id="inputNextDate" class="form-input" value="${nextDateStr}">
      </div>

      <!-- 4단계 하단 액션 버튼: 5:5 [이전] 및 [저장 후 다음 어르신] -->
      <div class="btn-action-row" style="margin-top: 14px;">
        <button type="button" class="btn-secondary" id="btnBackToStep3" style="height: 44px; font-size: 13.5px; font-weight: 700;">
          이전 (현장공통)
        </button>
        <button type="button" class="btn-primary" id="btnSaveAndNextTarget" style="height: 44px; font-size: 13.5px; font-weight: 800;">
          저장 후 다음 어르신
        </button>
      </div>

      <!-- 당일 활동 마감 및 퇴근 업무 이동 배너/버튼 -->
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
        <button type="button" class="btn-secondary" id="btnGoToStep5Checkout" style="width: 100%; height: 44px; font-size: 13.5px; font-weight: 800; background: #f8fafc; border-color: #cbd5e1; color: #0f172a;">
          현재 어르신 저장 후 오늘 활동 마감 및 퇴근 (5단계) →
        </button>
      </div>
    `;

    this.bindEvents(container, buCode);
  }

  // 사업단별 고유 특화 서식 렌더링
  renderBuSpecificForm(buCode, contactStatus = '대면 접촉') {
    const isAbsence = contactStatus.includes('부재');
    const isNonFace = contactStatus.includes('비대면');

    switch (buCode) {
      // 1. 고독사 예방 안부살핌단 (GD)
      case 'GD':
        return `
          <!-- 1. 어르신 정서 및 심리 상태 (아코디언) -->
          <div class="accordion-item" style="border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff; margin-bottom: 8px; overflow: hidden;">
            <div class="accordion-header" data-target="#bodyGdEmotion" style="padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none;">
              <span style="font-size: 13.5px; font-weight: 700; color: #0f172a;">1. 어르신 정서 및 심리 상태</span>
              <span id="lblGdEmotionSummary" style="font-size: 12px; color: #64748b;">안정적·편안함 ▾</span>
            </div>
            <div id="bodyGdEmotion" style="padding: 0 14px 12px 14px; border-top: 1px solid #f1f5f9; display: block;">
              <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="gdEmotion" value="안정적·편안함" checked style="width: 18px; height: 18px;">
                  <span>안정적 및 정서적 편안함</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="gdEmotion" value="외로움·우울감 호소" style="width: 18px; height: 18px;">
                  <span>외로움 및 고립감·우울 호소</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="gdEmotion" value="인지저하 의심" style="width: 18px; height: 18px;">
                  <span>기억력 감퇴 및 인지 저하 의심</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="gdEmotion" value="극심한 불안·피해망상" style="width: 18px; height: 18px;">
                  <span>극심한 불안 또는 피해망상 징후</span>
                </label>
              </div>
            </div>
          </div>

          <!-- 2. 현재 연계 복지 (아코디언) -->
          <div class="accordion-item" style="border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff; margin-bottom: 8px; overflow: hidden;">
            <div class="accordion-header" data-target="#bodyGdCurrentWelfare" style="padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none;">
              <span style="font-size: 13.5px; font-weight: 700; color: #0f172a;">2. 현재 연계 복지</span>
              <span id="lblGdCurrentWelfareSummary" style="font-size: 12px; color: #64748b;">1건 선택 ▾</span>
            </div>
            <div id="bodyGdCurrentWelfare" style="padding: 0 14px 12px 14px; border-top: 1px solid #f1f5f9; display: block;">
              <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="checkbox" name="gdCurrentWelfare" value="기초연금" checked style="width: 18px; height: 18px;">
                  <span>기초연금 / 생계급여 수급</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="checkbox" name="gdCurrentWelfare" value="노인맞춤돌봄" style="width: 18px; height: 18px;">
                  <span>노인맞춤돌봄서비스 (생활지원사 방문)</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="checkbox" name="gdCurrentWelfare" value="밑반찬지원" style="width: 18px; height: 18px;">
                  <span>식사/밑반찬 배달 지원</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="checkbox" name="gdCurrentWelfare" value="응급안전안심" style="width: 18px; height: 18px;">
                  <span>응급안전안심서비스 (댁내 ICT 장비)</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="checkbox" name="gdCurrentWelfare" value="연계복지없음" style="width: 18px; height: 18px;">
                  <span>연계 복지 없음 (복지 사각지대)</span>
                </label>
              </div>
            </div>
          </div>

          <!-- 3. 복지연계 필요 및 요청 (아코디언) -->
          <div class="accordion-item" style="border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff; margin-bottom: 8px; overflow: hidden;">
            <div class="accordion-header" data-target="#bodyGdRequestWelfare" style="padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none;">
              <span style="font-size: 13.5px; font-weight: 700; color: #0f172a;">3. 복지연계 필요 및 요청</span>
              <span id="lblGdRequestWelfareSummary" style="font-size: 12px; color: #64748b;">특이요청없음 ▾</span>
            </div>
            <div id="bodyGdRequestWelfare" style="padding: 0 14px 12px 14px; border-top: 1px solid #f1f5f9; display: block;">
              <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="checkbox" name="gdRequestWelfare" value="식사지원요청" style="width: 18px; height: 18px;">
                  <span>식사/밑반찬 지원 연계 요청</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="checkbox" name="gdRequestWelfare" value="병원동행요청" style="width: 18px; height: 18px;">
                  <span>병원 동행 및 정기 복약 지원 요청</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="checkbox" name="gdRequestWelfare" value="주거환경요청" style="width: 18px; height: 18px;">
                  <span>가택 소독 및 주거환경 정비 요청</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="checkbox" name="gdRequestWelfare" value="긴급생계요청" style="width: 18px; height: 18px;">
                  <span>긴급 생계 및 긴급 돌봄 연계 요청</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="checkbox" name="gdRequestWelfare" value="치매안심센터요청" style="width: 18px; height: 18px;">
                  <span>치매안심센터 / 정신건강 상담 연계 요청</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="checkbox" name="gdRequestWelfare" value="특이요청없음" checked style="width: 18px; height: 18px;">
                  <span>특이 요청 없음 (현재 상태 유지)</span>
                </label>
              </div>
            </div>
          </div>

          <!-- 4. 기타 -->
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: #ffffff; margin-bottom: 8px;">
            <div style="font-size: 13.5px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
              4. 기타 (현장 메모 및 추가 관찰 사항)
            </div>
            <textarea id="txtGdEtc" class="form-input" rows="2" placeholder="어르신 주요 발언, 이웃/보호자 전언, 기타 특이사항을 입력하세요." style="height: auto; padding: 8px; font-size: 13px; line-height: 1.5;"></textarea>
          </div>
        `;

      // 2. 영양도시락/밑반찬 배달단 (ME)
      case 'ME':
        return `
          <!-- 1. 금번 배달 물품 (식단 구분) -->
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: #ffffff; margin-bottom: 8px;">
            <div style="font-size: 13.5px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
              1. 금번 배달 물품 (식단 구분) <span style="color:#e11d48;">*</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                <input type="radio" name="meDeliveryItem" value="주간 밑반찬 (국1+찬3종)" style="width: 18px; height: 18px;">
                <span>주간 밑반찬 (국1 + 찬3종)</span>
              </label>
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                <input type="radio" name="meDeliveryItem" value="일반 도시락 (밥+국+찬)" style="width: 18px; height: 18px;">
                <span>일반 영양 도시락 (밥+국+찬)</span>
              </label>
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                <input type="radio" name="meDeliveryItem" value="당뇨·저염 맞춤식" style="width: 18px; height: 18px;">
                <span>당뇨·저염 맞춤 건강식</span>
              </label>
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                <input type="radio" name="meDeliveryItem" value="영양죽 / 유동식" style="width: 18px; height: 18px;">
                <span>영양죽 / 유동식 (연하 곤란식)</span>
              </label>
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                <input type="radio" name="meDeliveryItem" value="특식 / 후원물품" style="width: 18px; height: 18px;">
                <span>명절 특식 / 계절 후원 물품</span>
              </label>
            </div>
          </div>

          <!-- 2. 도시락/반찬 전달 및 수령 방식 -->
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: #ffffff; margin-bottom: 8px;">
            <div style="font-size: 13.5px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
              2. 도시락/반찬 전달 및 수령 방식 <span style="color:#e11d48;">*</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${isAbsence ? `
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="meReceiveMethod" value="문앞 보관함/문고리 투입" style="width: 18px; height: 18px;">
                  <span>문앞 보관함/문고리 투입 (부재 안전 확인)</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="meReceiveMethod" value="배달 불가 (부재로 회수)" style="width: 18px; height: 18px;">
                  <span>배달 불가 (부재로 도시락 회수/복귀)</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="meReceiveMethod" value="대리 수령 (이웃/경비실)" style="width: 18px; height: 18px;">
                  <span>대리 수령 (이웃 또는 경비실 위탁)</span>
                </label>
              ` : isNonFace ? `
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="meReceiveMethod" value="문앞 보관함/문고리 투입 (비대면)" style="width: 18px; height: 18px;">
                  <span>문앞 보관함/문고리 투입 (문밖 육성/인터폰 확인 완료)</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="meReceiveMethod" value="대리 수령 (이웃/경비실)" style="width: 18px; height: 18px;">
                  <span>대리 수령 (이웃 또는 경비실 위탁)</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="meReceiveMethod" value="본인 직접 대면 수령" style="width: 18px; height: 18px;">
                  <span>어르신 직접 수령 (문 개방 수령 완료)</span>
                </label>
              ` : `
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="meReceiveMethod" value="본인 직접 대면 수령" style="width: 18px; height: 18px;">
                  <span>어르신 본인 직접 대면 수령 (가택 내 전달)</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="meReceiveMethod" value="문앞 보관함 투입" style="width: 18px; height: 18px;">
                  <span>문앞 보관함/문고리 투입 (사전 외출 협의)</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="meReceiveMethod" value="대리 수령 (이웃/경비실)" style="width: 18px; height: 18px;">
                  <span>대리 수령 (이웃 또는 경비실 위탁)</span>
                </label>
              `}
            </div>
          </div>

          <!-- 3. 직전 반찬 섭취 및 잔반 상태 -->
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: ${isAbsence ? '#f8fafc' : '#ffffff'}; margin-bottom: 8px;">
            <div style="font-size: 13.5px; font-weight: 700; color: ${isAbsence ? '#64748b' : '#0f172a'}; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
              <span>3. 직전 반찬 섭취 및 잔반 상태 ${isAbsence ? '' : '<span style="color:#e11d48;">*</span>'}</span>
              ${isAbsence ? '<span class="badge" style="background:#e2e8f0; color:#475569; font-size:11px;">부재로 확인 불가</span>' : isNonFace ? '<span class="badge" style="background:#e0f2fe; color:#0369a1; font-size:11px;">비대면 접촉</span>' : ''}
            </div>
            ${isAbsence ? `
              <div style="font-size: 12.5px; color: #64748b; font-weight: 600; padding: 6px 0;">
                🔒 어르신 부재로 인해 실내 잔반 상태 확인이 불가능합니다. (자동 처리)
              </div>
              <input type="hidden" name="meIntake" value="확인 불가 (부재)">
            ` : isNonFace ? `
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="meIntake" value="확인 불가 (비대면 접촉)" style="width: 18px; height: 18px;">
                  <span>확인 불가 (비대면으로 실내 미확인)</span>
                </label>
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="meIntake" value="전량 섭취 (구두 확인)" style="width: 18px; height: 18px;">
                  <span>전량 섭취 (문밖/인터폰 구두 확인)</span>
                </label>
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="meIntake" value="절반 섭취 (구두 확인)" style="width: 18px; height: 18px;">
                  <span>절반 섭취 (구두 확인)</span>
                </label>
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="meIntake" value="거의 안드심 (구두 확인)" style="width: 18px; height: 18px;">
                  <span>거의 안드심 (구두 확인 - 결식 우려 ⚠️)</span>
                </label>
              </div>
            ` : `
              <div style="display: flex; gap: 14px; flex-wrap: wrap;">
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="meIntake" value="전량 섭취" style="width: 18px; height: 18px;">
                  <span>전량 섭취 (식욕 양호)</span>
                </label>
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="meIntake" value="절반 섭취" style="width: 18px; height: 18px;">
                  <span>절반 섭취 (소식 상태)</span>
                </label>
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="meIntake" value="거의 안드심" style="width: 18px; height: 18px;">
                  <span>거의 안드심 (결식 우려 ⚠️)</span>
                </label>
              </div>
            `}
          </div>

          <!-- 4. 식이 건강 및 저작/소화 상태 -->
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: ${isAbsence ? '#f8fafc' : '#ffffff'}; margin-bottom: 8px;">
            <div style="font-size: 13.5px; font-weight: 700; color: ${isAbsence ? '#64748b' : '#0f172a'}; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
              <span>4. 식이 건강 및 저작/소화 상태 ${isAbsence ? '' : '<span style="color:#e11d48;">*</span>'}</span>
              ${isAbsence ? '<span class="badge" style="background:#e2e8f0; color:#475569; font-size:11px;">부재로 확인 불가</span>' : isNonFace ? '<span class="badge" style="background:#e0f2fe; color:#0369a1; font-size:11px;">비대면 접촉</span>' : ''}
            </div>
            ${isAbsence ? `
              <div style="font-size: 12.5px; color: #64748b; font-weight: 600; padding: 6px 0;">
                🔒 어르신 부재로 인해 건강 및 식이 상태 확인이 불가능합니다. (자동 처리)
              </div>
              <input type="hidden" name="meDietHealth" value="확인 불가 (부재)">
            ` : isNonFace ? `
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="meDietHealth" value="확인 불가 (비대면 접촉)" style="width: 18px; height: 18px;">
                  <span>확인 불가 (비대면 접촉)</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="meDietHealth" value="정상 섭취 (구두 응답)" style="width: 18px; height: 18px;">
                  <span>정상 섭취 (구두로 소화 양호 응답)</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="meDietHealth" value="치아불편·저작곤란 (구두 응답)" style="width: 18px; height: 18px;">
                  <span>치아 통증 / 저작 곤란 호소 (부드러운 반찬 요망)</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="meDietHealth" value="소화불량·속쓰림 (구두 응답)" style="width: 18px; height: 18px;">
                  <span>소화 불량 및 속쓰림 호소</span>
                </label>
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="meDietHealth" value="정상 섭취" style="width: 18px; height: 18px;">
                  <span>정상 섭취 (치아 및 소화 양호)</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="meDietHealth" value="치아불편·저작곤란" style="width: 18px; height: 18px;">
                  <span>치아 통증 / 저작 곤란 (부드러운 반찬 요망)</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="meDietHealth" value="소화불량·속쓰림" style="width: 18px; height: 18px;">
                  <span>소화 불량 및 속쓰림 호소</span>
                </label>
              </div>
            `}
          </div>

          <!-- 5. 보관 용기 회수 상태 -->
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: #ffffff; margin-bottom: 8px;">
            <div style="font-size: 13.5px; font-weight: 700; color: #0f172a; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
              <span>5. 보관 용기 회수 상태 <span style="color:#e11d48;">*</span></span>
              ${isAbsence ? '<span class="badge" style="background:#e2e8f0; color:#475569; font-size:11px;">문앞 확인</span>' : isNonFace ? '<span class="badge" style="background:#e0f2fe; color:#0369a1; font-size:11px;">문앞 확인</span>' : ''}
            </div>
            <div style="display: flex; gap: 14px; flex-wrap: wrap;">
              ${(isAbsence || isNonFace) ? `
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="meContainer" value="문앞 배출 정상 회수" style="width: 18px; height: 18px;">
                  <span>문앞 배출 정상 회수</span>
                </label>
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="meContainer" value="문앞 미배출 (차기회수)" style="width: 18px; height: 18px;">
                  <span>문앞 미배출 (차기 회수)</span>
                </label>
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="meContainer" value="${isAbsence ? '확인 불가 (부재)' : '비대면 확인 불가'}" style="width: 18px; height: 18px;">
                  <span>${isAbsence ? '확인 불가 (부재)' : '비대면 확인 불가'}</span>
                </label>
              ` : `
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="meContainer" value="세척 정상 회수" style="width: 18px; height: 18px;">
                  <span>세척 후 정상 회수</span>
                </label>
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="meContainer" value="미세척 회수" style="width: 18px; height: 18px;">
                  <span>미세척 회수</span>
                </label>
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                  <input type="radio" name="meContainer" value="미회수/차기회수" style="width: 18px; height: 18px;">
                  <span>미회수 (차기 방문 시 회수)</span>
                </label>
              `}
            </div>
          </div>

          <!-- 6. 기타 (식사 요청 및 현장 메모) -->
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: #ffffff; margin-bottom: 8px;">
            <div style="font-size: 13.5px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
              6. 기타 (식사 관련 요청 및 현장 메모)
            </div>
            <textarea id="txtMeEtc" class="form-input" rows="2" placeholder="선호/기피 반찬, 국물류 요청 등 식사 관련 특이사항을 입력하세요." style="height: auto; padding: 8px; font-size: 13px; line-height: 1.5;"></textarea>
          </div>
        `;

      // 3. 건강음료 배달단 (HE)
      case 'HE':
        return `
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: #ffffff; margin-bottom: 8px;">
            <div style="font-size: 13.5px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
              1. 음료 전달 방식
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                <input type="radio" name="heDeliveryMode" value="직접 대면 전달" checked style="width: 18px; height: 18px;">
                <span>직접 대면 전달 (안부 확인 완료)</span>
              </label>
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                <input type="radio" name="heDeliveryMode" value="문앞 주머니 투입" style="width: 18px; height: 18px;">
                <span>문앞 전용 음료 주머니 투입</span>
              </label>
            </div>
          </div>

          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: #ffffff; margin-bottom: 8px;">
            <div style="font-size: 13.5px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
              2. 문앞 미수거 누적 병수 (핵심 안전 지표)
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                <input type="radio" name="heBottles" value="0병 (정상 음용)" checked style="width: 18px; height: 18px;">
                <span>0병 (전일 음료 정상 음용 - 안전)</span>
              </label>
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                <input type="radio" name="heBottles" value="2병 이상 누적 (위험)" style="width: 18px; height: 18px;">
                <span>2병 이상 누적 미수거 (위험 경보 - 관리자 즉시 보고)</span>
              </label>
            </div>
          </div>
        `;

      // 4. 주거환경개선단 (CL)
      case 'CL':
        return `
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: #ffffff; margin-bottom: 8px;">
            <div style="font-size: 13.5px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
              1. 실시한 환경 정비/소독 작업
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                <input type="checkbox" name="clTasks" value="실내소독방역" checked style="width: 18px; height: 18px;">
                <span>실내 소독 및 친환경 방역 작업</span>
              </label>
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                <input type="checkbox" name="clTasks" value="생활폐기물수거" style="width: 18px; height: 18px;">
                <span>대형/생활폐기물 수거 및 분리배출</span>
              </label>
            </div>
          </div>
        `;

      // 5. 정서돌봄/말벗 상담단 (EM)
      case 'EM':
      default:
        return `
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: #ffffff; margin-bottom: 8px;">
            <div style="font-size: 13.5px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
              1. 주요 상담 대화 주제
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                <input type="radio" name="emTopic" value="일상 대화 및 최근 안부" checked style="width: 18px; height: 18px;">
                <span>일상 대화 및 최근 안부</span>
              </label>
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a;">
                <input type="radio" name="emTopic" value="건강 염려 및 병원 진료" style="width: 18px; height: 18px;">
                <span>건강 염려 및 병원 진료 상담</span>
              </label>
            </div>
          </div>
        `;
    }
  }

  bindEvents(container, buCode) {
    const session = this.app.session;
    const target = this.app.currentTarget || {};
    const commonResult = this.app.currentDutyResult || {};

    // 1) 3단계 공통 안부 요약 바 아코디언 토글
    const btnCommonToggle = container.querySelector('#btnToggleCommonSummary');
    const bodyCommon = container.querySelector('#bodyCommonSummary');
    const icoCommon = container.querySelector('#icoCommonToggle');
    btnCommonToggle?.addEventListener('click', () => {
      const isVisible = bodyCommon.style.display !== 'none';
      bodyCommon.style.display = isVisible ? 'none' : 'block';
      if (icoCommon) icoCommon.innerText = isVisible ? '▼' : '▲';
    });

    // 2) 아코디언 토글 헤더 바인딩
    container.querySelectorAll('.accordion-header').forEach(header => {
      header.addEventListener('click', () => {
        const targetId = header.dataset.target;
        const bodyEl = container.querySelector(targetId);
        if (bodyEl) {
          const isVisible = bodyEl.style.display !== 'none';
          bodyEl.style.display = isVisible ? 'none' : 'block';
        }
      });
    });

    // 3) 이전 (현장공통) 버튼 ➔ 3단계로 이동
    container.querySelector('#btnBackToStep3')?.addEventListener('click', () => {
      this.app.goToStep(3);
    });

    // 3-1) 차기 방문 예정일 현장 변경 시 확인 알람 인터셉트
    const inputNextDate = container.querySelector('#inputNextDate');
    if (inputNextDate) {
      let originalDate = inputNextDate.value;
      inputNextDate.addEventListener('change', (e) => {
        const newDate = e.target.value;
        if (newDate && newDate !== originalDate) {
          notifier.confirm({
            title: '방문 일정 추가 확인',
            message: `참여기관에 등록된 정기 일정이 있습니다.\n[${newDate}] 일자로 방문 일정을 추가하시겠습니까?`,
            confirmText: '일정 추가',
            cancelText: '취소',
            onConfirm: () => {
              originalDate = newDate;
              notifier.toast(`방문 일정이 [${newDate}]로 설정되었습니다.`, 'info', 2000);
            },
            onCancel: () => {
              inputNextDate.value = originalDate;
            }
          });
        }
      });
    }

    // 4) [저장 후 다음 어르신] 버튼 ➔ 현재 어르신 저장 후 2단계로 이동
    const btnSaveAndNext = container.querySelector('#btnSaveAndNextTarget');
    btnSaveAndNext?.addEventListener('click', async () => {
      btnSaveAndNext.disabled = true;
      btnSaveAndNext.innerText = '저장 중...';

      try {
        const payload = await this.collectAndSavePayload(container, buCode);
        notifier.toast('참여자의 활동 보고가 저장되었습니다. 다음 대상자방문 혹은 마감으로 이동합니다.', 'success', 2500);
        this.app.currentTarget = null;
        this.app.currentDutyResult = null;
        this.app.goToStep(2);
      } catch (err) {
        notifier.toast(err.message, 'warning', 3000);
        btnSaveAndNext.disabled = false;
        btnSaveAndNext.innerText = '저장 후 다음 어르신';
      }
    });

    // 5) [현재 어르신 저장 후 오늘 활동 마감 및 퇴근 (5단계)] 버튼 ➔ 자동 저장 후 5단계로 이동
    const btnGoToStep5 = container.querySelector('#btnGoToStep5Checkout');
    btnGoToStep5?.addEventListener('click', async () => {
      // 작성 중인 어르신이 있는 경우 자동 저장 후 5단계 이동
      if (this.app.currentTarget) {
        btnGoToStep5.disabled = true;
        btnGoToStep5.innerText = '현재 어르신 저장 및 5단계 이동 중...';

        try {
          const payload = await this.collectAndSavePayload(container, buCode);
          notifier.toast(`[${maskName(payload.targetName)}] 어르신 활동 보고 저장 완료! 마감·퇴근 화면으로 이동합니다.`, 'success', 2500);
          this.app.currentTarget = null;
          this.app.currentDutyResult = null;
        } catch (err) {
          notifier.toast(err.message, 'warning', 3000);
          btnGoToStep5.disabled = false;
          btnGoToStep5.innerText = '오늘 활동 마감 및 퇴근 업무 처리 (5단계) →';
          return;
        }
      }

      this.app.goToStep(5);
    });
  }

  /**
   * 4단계 폼 데이터 수집 및 D1 저장 공통 로직
   */
  async collectAndSavePayload(container, buCode) {
    const session = this.app.session;
    const target = this.app.currentTarget || {};
    const commonResult = this.app.currentDutyResult || {};

    // 🛡️ 대전제 1: 종합 이상징후 판정 필수 검증
    const verdictRadio = container.querySelector('input[name="reportVerdict"]:checked');
    if (!verdictRadio) {
      throw new Error('종합 이상징후 판정(정상 완료 / 주의 관찰 / 긴급 요청)을 선택해 주세요.');
    }
    const verdictVal = verdictRadio.value;
    const isUrgent = verdictVal.includes('긴급') || verdictVal.includes('주의');
    const nextDate = container.querySelector('#inputNextDate')?.value || '';

    // 사업단별 고유 데이터 수집 및 🛡️ 필수 대전제 검증
    const buSpecificData = {};
    if (buCode === 'GD') {
      const emotionRadio = container.querySelector('input[name="gdEmotion"]:checked');
      if (!emotionRadio) throw new Error('심리·정서 상태를 선택해 주세요.');
      buSpecificData.emotion = emotionRadio.value;
      buSpecificData.currentWelfare = Array.from(container.querySelectorAll('input[name="gdCurrentWelfare"]:checked')).map(el => el.value);
      buSpecificData.requestWelfare = Array.from(container.querySelectorAll('input[name="gdRequestWelfare"]:checked')).map(el => el.value);
      buSpecificData.etc = container.querySelector('#txtGdEtc')?.value?.trim() || '';
    } else if (buCode === 'ME') {
      const itemRadio = container.querySelector('input[name="meDeliveryItem"]:checked');
      if (!itemRadio) throw new Error('1. 금번 배달 물품 (식단 구분)을 선택해 주세요.');
      const receiveRadio = container.querySelector('input[name="meReceiveMethod"]:checked');
      if (!receiveRadio) throw new Error('2. 전달 및 수령 방식을 선택해 주세요.');

      // 3·4·5번 항목: 부재 시 hidden input, 대면/비대면 시 radio checked 수집
      const intakeEl = container.querySelector('input[name="meIntake"]:checked') || container.querySelector('input[type="hidden"][name="meIntake"]');
      if (!intakeEl) throw new Error('3. 직전 반찬 섭취 및 잔반 상태를 선택해 주세요.');

      const dietEl = container.querySelector('input[name="meDietHealth"]:checked') || container.querySelector('input[type="hidden"][name="meDietHealth"]');
      if (!dietEl) throw new Error('4. 식이 건강 및 저작/소화 상태를 선택해 주세요.');

      const containerEl = container.querySelector('input[name="meContainer"]:checked') || container.querySelector('input[type="hidden"][name="meContainer"]');
      if (!containerEl) throw new Error('5. 보관 용기 회수 상태를 선택해 주세요.');

      buSpecificData.deliveryItem = itemRadio.value;
      buSpecificData.receiveMethod = receiveRadio.value;
      buSpecificData.intake = intakeEl.value;
      buSpecificData.dietHealth = dietEl.value;
      buSpecificData.container = containerEl.value;
      buSpecificData.etc = container.querySelector('#txtMeEtc')?.value?.trim() || '';
    } else if (buCode === 'HE') {
      const modeRadio = container.querySelector('input[name="heDeliveryMode"]:checked');
      if (!modeRadio) throw new Error('전달 방식을 선택해 주세요.');
      const bottleRadio = container.querySelector('input[name="heBottles"]:checked');
      if (!bottleRadio) throw new Error('미음용 잔여 수량을 선택해 주세요.');
      buSpecificData.deliveryMode = modeRadio.value;
      buSpecificData.bottles = bottleRadio.value;
    } else if (buCode === 'CL') {
      buSpecificData.tasks = Array.from(container.querySelectorAll('input[name="clTasks"]:checked')).map(el => el.value);
    } else {
      const topicRadio = container.querySelector('input[name="emTopic"]:checked');
      if (!topicRadio) throw new Error('주요 대화 주제를 선택해 주세요.');
      buSpecificData.topic = topicRadio.value;
    }

    const notes = buSpecificData.etc || '';

    const payload = {
      buCode,
      targetUid: target.caseUid || 'C-28-237-01-K1001',
      targetName: target.name || '어르신',
      targetAge: target.age || 75,
      targetGender: target.gender || '남',
      date: session.dutyDate,
      time: '10:00 ~ 10:30',
      workerNames: session.participants || ['김철수', '이영희'],
      activityType: `${session.buName || '사업단'} 현장 활동`,
      status: (commonResult.contactStatus || '').includes('부재') ? '상담불가' : '완료',
      content: `[판정: ${verdictVal}]${buSpecificData.deliveryItem ? ` [물품: ${buSpecificData.deliveryItem}]` : ''} 안부: ${commonResult.contactStatus || '대면'} | ${notes}`,
      specialNotes: notes,
      contactStatus: commonResult.contactStatus || '대면 접촉',
      healthStatus: commonResult.healthStatus || null,
      envStatus: commonResult.envStatus || null,
      absenceCheck: commonResult.absenceCheck || null,
      isUrgent: isUrgent ? 1 : 0,
      nextScheduleDate: nextDate,
      dutyDetails: {
        commonResult,
        verdict: verdictVal,
        specific: buSpecificData
      }
    };

    await ActivityService.saveActivityReport(buCode, payload);

    // 당일 완료 목록에 추가 (A4 활동일지 완벽 바인딩)
    this.app.todayReports.push({
      targetUid: payload.targetUid,
      targetName: payload.targetName,
      contactStatus: payload.contactStatus,
      verdict: verdictVal,
      isUrgent: isUrgent,
      specialNotes: payload.specialNotes,
      dutyDetails: payload.dutyDetails
    });

    return payload;
  }
}
