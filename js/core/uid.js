/**
 * @file uid.js
 * @description 부평구 통합돌봄 전사 8대 계층 UID 생성, 검증, 파싱 엔진 (ESM)
 * 
 * 부평구 8대 UID 체계 규격:
 * 1. 시군구 (M): M-{시도2자리}{시군구3자리} (예: M-28-237 - 인천광역시 부평구)
 * 2. 수행기관 (O): O-{M-UID}-{일련번호2자리} (예: O-28-237-01 - 부평구 통합돌봄센터)
 * 3. 관리자/담당자 (A): A-{O-UID}-{일련번호2자리} (예: A-28-237-01-01)
 * 4. 사업단 (B): B-{O-UID}-{도메인2자리} (예: B-28-237-01-MA - 마음안심사업단)
 * 5. 참여자 (U): U-{B-UID}-{일련번호3자리} (예: U-28-237-01-MA-001 - 살핌 참여자)
 * 6. 수혜대상자 (C): C-{O-UID}-{5자리 코드} (예: 지자체 배정 00001~, K1001~ / 현장 발굴 N1001~N9999)
 * 7. 조사서식 (S): S-{C-UID}-{조사일자} (예: S-28-237-01-00001-20261031)
 * 8. 관리카드 (CRD): CRD-{C-UID}-{차수2자리} (예: CRD-C-28-237-01-K1001-01)
 */

export const BUPYEONG_DEFAULT_ORG_UID = 'O-28-237-01';
export const BUPYEONG_MUNICIPALITY_UID = 'M-28-237';

export class UidEngine {
  /**
   * 기관 코드 유효성 검증
   */
  static isValidOrgUid(orgUid) {
    if (!orgUid) return false;
    return /^O-\d{2}-\d{3}-\d{2}$/.test(orgUid);
  }

  /**
   * 담당자 UID 생성: A-{O-UID}-{일련2자리}
   */
  static generateStaffUid(orgUid = BUPYEONG_DEFAULT_ORG_UID, seqNumber = 1) {
    const seqPadded = String(seqNumber).padStart(2, '0');
    return `A-${orgUid.slice(2)}-${seqPadded}`;
  }

  /**
   * 사업단 UID 생성: B-{O-UID}-{도메인2자리}
   */
  static generateBuUid(orgUid = BUPYEONG_DEFAULT_ORG_UID, buCode = 'MA') {
    const cleanBu = buCode.trim().toUpperCase();
    return `B-${orgUid.slice(2)}-${cleanBu}`;
  }

  /**
   * 현장 참여자 UID 생성: U-{B-UID}-{일련3자리}
   */
  static generateParticipantUid(orgUid = BUPYEONG_DEFAULT_ORG_UID, buCode = 'MA', seqNumber = 1) {
    const cleanBu = (buCode || 'MA').trim().toUpperCase();
    const seqPadded = String(seqNumber).padStart(3, '0');
    return `U-${orgUid.slice(2)}-${cleanBu}-${seqPadded}`;
  }

  /**
   * 정규 배정 대상자 관리번호 생성: C-{O-UID}-{일련5자리} (예: C-28-237-01-00001, C-28-237-01-K1001)
   */
  /**
   * 지자체 사전 배정 대상자 관리번호 생성 (K1001 ~ K9999)
   */
  static generateCaseUid(orgUid = BUPYEONG_DEFAULT_ORG_UID, seqNumber = 1001) {
    const cleanSeq = typeof seqNumber === 'string' && seqNumber.startsWith('K')
      ? seqNumber
      : `K${String(seqNumber).padStart(4, '0')}`;
    return `C-${orgUid.slice(2)}-${cleanSeq}`;
  }

  /**
   * 현장 직접 발굴용 대상자 관리번호 생성: C-{O-UID}-N{4자리난수} (총 5자리, 예: C-28-237-01-N7107)
   */
  static generateFieldCaseUid(orgUid = BUPYEONG_DEFAULT_ORG_UID) {
    const randNum = Math.floor(1000 + Math.random() * 9000);
    return `C-${orgUid.slice(2)}-N${randNum}`;
  }

  /**
   * 만족도 조사서식 UID 생성: S-{C-UID}-{조사일자8자리}
   */
  static generateSatisfactionSurveyUid(caseUid, dateStr) {
    const cleanDate = (dateStr || '').replace(/\D/g, '') || new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `S-${caseUid.slice(2)}-${cleanDate}`;
  }

  /**
   * 정규 선별조사(S-GDS, 고독사위험도) 서식 UID 생성 (S-계층): S-{C-UID(접두사제외)}-{BU코드}-R{차수}
   * @param {string} caseUid (예: C-28-237-01-K1001)
   * @param {string} buCode ('GD', 'WR', 'ME', 'HE', 'CL', 'EM')
   * @param {number} round (1, 2, 3...)
   * @returns {string} 예: S-28-237-01-K1001-GD-R1
   */
  static generateSurveyUid(caseUid, buCode = 'GD', round = 1) {
    if (!caseUid || !caseUid.startsWith('C-')) {
      return `S-28-237-01-00001-${buCode}-R${round}`;
    }
    const cleanBu = (buCode || 'GD').trim().toUpperCase();
    return `S-${caseUid.slice(2)}-${cleanBu}-R${round}`;
  }

  /**
   * 상담 관리카드 서식 UID 생성 (CD-계층): {C-UID}-CD-R{차수}
   * @param {string} caseUid (예: C-28-237-01-K1001)
   * @param {number} round (1, 2, 3...)
   * @returns {string} 예: C-28-237-01-K1001-CD-R1
   */
  static generateCounselCardUid(caseUid, round = 1) {
    if (!caseUid || !caseUid.startsWith('C-')) {
      return `C-28-237-01-00001-CD-R${round}`;
    }
    return `${caseUid}-CD-R${round}`;
  }

  /**
   * 활동관리카드/모니터링 차수 UID 생성: CRD-{C-UID}-{차수2자리}
   */
  static generateCardUid(caseUid, round = 1) {
    const roundPadded = String(round).padStart(2, '0');
    return `CRD-${caseUid}-${roundPadded}`;
  }
  /**
   * 연계 서비스/공문 식별자 생성: LNK-{시도2}-{시군구3}-{기관2}-{가구코드5}-{연계순번2}
   * @param {string} caseUid (예: C-28-237-01-N1001, C-28-237-01-00001)
   * @param {number} linkSeq (1, 2, 3...)
   * @returns {string} 예: LNK-28-237-01-N1001-01
   */
  static generateLinkUid(caseUid, linkSeq = 1) {
    if (!caseUid || !caseUid.startsWith('C-')) {
      throw new Error(`[UidEngine] 유효하지 않은 케이스 UID입니다: ${caseUid}`);
    }
    const seqPadded = String(linkSeq).padStart(2, '0');
    return `LNK-${caseUid.slice(2)}-${seqPadded}`;
  }
}
