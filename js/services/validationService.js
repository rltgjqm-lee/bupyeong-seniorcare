/**
 * @file validationService.js
 * @description 부평구 통합돌봄 PWA 현장조사 폼 정밀 유효성 검증 서비스 (Validation Guard) (ESM)
 * - 총람 v06 제1철칙: 대전제(Guard Condition) 검증 의무화
 */

import { getLocalTodayString } from '../utils/date.js';

export class ValidationService {
  /**
   * 참여자 명부 유효성 검증
   * @param {Array<string>} inspectors 
   */
  static validateInspectors(inspectors = []) {
    const validList = inspectors.map(n => (n || '').trim()).filter(Boolean);
    if (validList.length === 0) {
      return {
        isValid: false,
        message: '참여자 성명을 최소 1명 이상 입력해 주십시오.'
      };
    }

    for (let i = 0; i < validList.length; i++) {
      if (validList[i].length < 2) {
        return {
          isValid: false,
          message: `참여자 ${i + 1}의 성명을 올바르게(2글자 이상) 입력해 주십시오.`
        };
      }
    }

    if (validList.length > 4) {
      return {
        isValid: false,
        message: '참여자는 최대 4명까지만 등록 가능합니다.'
      };
    }

    return {
      isValid: true,
      inspectors: validList
    };
  }

  /**
   * Step 1 기본정보 및 참여자 유효성 검증
   * @param {Object} basicInfo 
   */
  static validateBasicInfo(basicInfo) {
    if (!basicInfo.orgName || !basicInfo.orgName.trim()) {
      return { isValid: false, message: '수행기관명을 입력하거나 선택해 주십시오.' };
    }
    if (!basicInfo.project || !basicInfo.project.trim()) {
      return { isValid: false, message: '참여 사업단명을 입력해 주십시오.' };
    }
    if (!basicInfo.inspectionDate) {
      return { isValid: false, message: '활동 일자를 올바르게 지정해 주십시오.' };
    }

    const todayStr = getLocalTodayString();
    if (basicInfo.inspectionDate > todayStr) {
      return {
        isValid: false,
        message: '활동 일자는 오늘 또는 과거 날짜만 지정할 수 있습니다. 미래 날짜는 등록할 수 없습니다.'
      };
    }

    const inspVal = this.validateInspectors(basicInfo.inspectors);
    if (!inspVal.isValid) {
      return inspVal;
    }

    return { isValid: true, inspectors: inspVal.inspectors };
  }

  /**
   * Step 2 대상자 확인 유효성 검증
   * @param {Object} targetProfile 
   */
  static validateTargetProfile(targetProfile) {
    if (!targetProfile.caseUid || !targetProfile.caseUid.trim()) {
      return { isValid: false, message: '대상자 관리번호(UID)를 확인해 주십시오.' };
    }
    if (!targetProfile.dong || !targetProfile.dong.trim()) {
      return { isValid: false, message: '주소 검색을 통해 관할 행정동을 확인해 주십시오.' };
    }
    if (!targetProfile.baseAddress || !targetProfile.baseAddress.trim()) {
      return { isValid: false, message: '도로명 주소를 검색하여 입력해 주십시오.' };
    }
    if (!targetProfile.gender) {
      return { isValid: false, message: '대상자 성별을 선택해 주십시오.' };
    }
    return { isValid: true };
  }
}
