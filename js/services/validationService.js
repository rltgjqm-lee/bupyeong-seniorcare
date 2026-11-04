/**
 * @file validationService.js
 * @description PWA 현장 조사 및 기본정보 입력 폼 유효성 검증 서비스 (ESM)
 */

import { getLocalTodayString } from '../utils/date.js';

export class ValidationService {
  /**
   * 참여 활동가 명단 유효성 검증
   * @param {Array<string>} inspectors
   */
  static validateInspectors(inspectors = []) {
    const validList = inspectors.map(n => (n || '').trim()).filter(Boolean);
    if (validList.length === 0) {
      return {
        isValid: false,
        message: '활동가 성명을 최소 1명 이상 입력해 주십시오.'
      };
    }
    if (validList.length > 4) {
      return {
        isValid: false,
        message: '활동가는 최대 4명까지만 등록 가능합니다.'
      };
    }
    return {
      isValid: true,
      inspectors: validList
    };
  }

  /**
   * Step 1 기본정보 유효성 검증
   * @param {Object} basicInfo
   */
  static validateBasicInfo(basicInfo) {
    if (!basicInfo.orgName || !basicInfo.orgName.trim()) {
      return { isValid: false, message: '소속 참여기관명을 입력하거나 선택해 주십시오.' };
    }
    if (!basicInfo.project || !basicInfo.project.trim()) {
      return { isValid: false, message: '참여 사업단명을 입력해 주십시오.' };
    }
    if (!basicInfo.inspectionDate) {
      return { isValid: false, message: '조사 일자를 올바르게 지정해 주십시오.' };
    }

    const inspVal = this.validateInspectors(basicInfo.inspectors);
    if (!inspVal.isValid) {
      return inspVal;
    }

    return { isValid: true, inspectors: inspVal.inspectors };
  }

  /**
   * Step 2 대상자 인적사항 유효성 검증
   * @param {Object} profile
   */
  static validateTargetProfile(profile) {
    if (!profile.name || !profile.name.trim()) {
      return { isValid: false, message: '대상자 성명을 입력해 주십시오.' };
    }
    if (!profile.birth || !profile.birth.trim()) {
      return { isValid: false, message: '생년월일을 입력해 주십시오.' };
    }
    if (!profile.gender) {
      return { isValid: false, message: '성별을 선택해 주십시오.' };
    }
    if (!profile.phone || !profile.phone.trim()) {
      return { isValid: false, message: '연락처(전화번호)를 입력해 주십시오.' };
    }
    if (!profile.address || !profile.address.trim()) {
      return { isValid: false, message: '거주지 주소를 입력해 주십시오.' };
    }
    if (!profile.housingType || !profile.housingType.trim()) {
      return { isValid: false, message: '거주지 유형을 10종 항목 중 하나 선택해 주십시오.' };
    }
    if (profile.housingType === '직접기재' && (!profile.housingCustom || !profile.housingCustom.trim())) {
      return { isValid: false, message: '거주지 직접기재 내용을 입력해 주십시오.' };
    }

    // 보호자 및 비상연락망 검증 (서식 299p)
    if (profile.guardian) {
      if (profile.guardian.hasGuardian === null || profile.guardian.hasGuardian === undefined) {
        return { isValid: false, message: '보호자 및 비상연락망 유무([있음] 또는 [없음])를 선택해 주십시오.' };
      }
      if (profile.guardian.hasGuardian === true) {
        if (!profile.guardian.name || !profile.guardian.name.trim()) {
          return { isValid: false, message: '보호자 성명을 입력해 주십시오.' };
        }
        if (!profile.guardian.phone || !profile.guardian.phone.trim()) {
          return { isValid: false, message: '보호자 연락처(전화번호)를 입력해 주십시오.' };
        }
        if (!profile.guardian.relation || !profile.guardian.relation.trim()) {
          return { isValid: false, message: '보호자와 대상자의 관계를 선택해 주십시오.' };
        }
      }
    }

    return { isValid: true };
  }

  /**
   * Step 3 현장 관찰 지표 (외부 6종 + 대면 여부 판정) 유효성 검증
   * @param {Object} observation
   */
  static validateStep3Observation(observation = {}) {
    const outdoorKeys = ['mailAccumulated', 'odorInsects', 'trashBottles', 'tvLightOn', 'isolatedLiving', 'contactLost'];

    const missingOutdoor = outdoorKeys.filter(k => observation[k] === null || observation[k] === undefined);
    if (missingOutdoor.length > 0) {
      return {
        isValid: false,
        unansweredCount: missingOutdoor.length,
        message: `집 밖 외부 관찰 지표 중 미확인 항목이 ${missingOutdoor.length}건 있습니다.\n외부 6개 지표를 모두 확인해 주십시오.`
      };
    }

    if (!observation.visitResult) {
      return {
        isValid: false,
        message: '현장 방문 결과([대면 (실내 진입)] 또는 [미대면 (부재/거부)])를 선택해 주십시오.'
      };
    }

    if (observation.visitResult === 'unmet' && (!observation.unmetReason || !observation.unmetReason.trim())) {
      return {
        isValid: false,
        message: '미대면(부재/거부) 사유를 선택하거나 직접 입력해 주십시오.'
      };
    }

    return { isValid: true };
  }

  /**
   * Step 4 실내 환경 관찰 지표 유효성 검증 (선택 지표 - 비차단)
   * @param {Object} observation
   */
  static validateIndoorObservation(observation = {}) {
    return { isValid: true };
  }

  /**
   * 종합 관찰 지표 유효성 검증 (하위 호환)
   * @param {Object} observation
   */
  static validateObservation(observation = {}) {
    const s3Val = this.validateStep3Observation(observation);
    if (!s3Val.isValid) return s3Val;

    if (observation.visitResult === 'met') {
      return this.validateIndoorObservation(observation);
    }
    return { isValid: true };
  }

  /**
   * Step 4 10대 문항 응답 완성도 검증
   * @param {Object} answers - { 1: { isAnswered, isRisk, ... }, ... }
   * @param {number} totalQuestions - 기본 10문항
   */
  static validateSurveyProgress(answers = {}, totalQuestions = 10) {
    const unanswered = [];

    for (let i = 1; i <= totalQuestions; i++) {
      const ans = answers[i];
      if (!ans || !ans.isAnswered) {
        unanswered.push(i);
      }
    }

    if (unanswered.length > 0) {
      return {
        isComplete: false,
        unansweredSteps: unanswered,
        message: `아직 판정되지 않은 문항이 있습니다. (${unanswered.join(', ')}번 문항 확인 필요)`
      };
    }

    return {
      isComplete: true,
      unansweredSteps: []
    };
  }

  /**
   * Step 5 개인정보 동의 및 전자서명 검증
   * @param {Object} consent - { agreeCollect, agreeThirdParty, targetSignature, proxySignature, inspectorSignatures }
   * @param {Array<string>} inspectors
   * @param {boolean} isProxySigner - 보호자 대리서명 여부
   */
  static validateConsentAndSignatures(consent, inspectors = [], isProxySigner = false) {
    if (!consent.agreeCollect) {
      return { isValid: false, message: '개인정보 수집·이용 동의가 필요합니다.' };
    }
    if (!consent.agreeThirdParty) {
      return { isValid: false, message: '개인정보 제3자 제공 동의가 필요합니다.' };
    }
    
    if (isProxySigner) {
      if (!consent.targetSignature && !consent.proxySignature) {
        return { isValid: false, message: '보호자(법정대리인) 전자서명을 완료해 주십시오.' };
      }
    } else {
      if (!consent.targetSignature) {
        return { isValid: false, message: '안부확인 대상자(수혜자) 전자서명을 완료해 주십시오.' };
      }
    }

    const missingInsp = inspectors.filter(name => !consent.inspectorSignatures[name]);
    if (missingInsp.length > 0) {
      return { isValid: false, message: `활동가 서명이 누락되었습니다: [${missingInsp.join(', ')}]` };
    }

    return { isValid: true };
  }

  /**
   * Step 6 수혜자 관리카드 필수 항목 검증
   * @param {Object} card - { method, healthCheck, psychoCheck, livingCheck, anomalyCheck, etcCheck, ... }
   */
  static validateStep6BeneficiaryCard(card) {
    if (!card) {
      return { isValid: false, message: '수혜자 관리카드를 작성해 주십시오.' };
    }

    if (!card.method) {
      return { isValid: false, message: '확인 방식([현장 방문] 또는 [통화(전화)])을 선택해 주십시오.' };
    }

    if (!card.healthCheck) {
      return { isValid: false, message: '1. 건강상태([양호] / [보통] / [악화])를 선택해 주십시오.' };
    }

    if (!card.psychoCheck) {
      return { isValid: false, message: '2. 심리상태([안정] / [불안] / [우울])를 선택해 주십시오.' };
    }

    if (!card.livingCheck) {
      return { isValid: false, message: '3. 주거환경 상태([청결] / [정돈필요] / [심각])를 선택해 주십시오.' };
    }

    if (!card.anomalyCheck) {
      return { isValid: false, message: '4. 이상징후여부([없음] / [고립조짐] / [응급징후])를 선택해 주십시오.' };
    }

    if (!card.etcCheck) {
      return { isValid: false, message: '5. 기타사항([있음] / [없음])을 선택해 주십시오.' };
    }

    return { isValid: true };
  }
}
