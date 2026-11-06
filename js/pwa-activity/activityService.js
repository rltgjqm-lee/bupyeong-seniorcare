/**
 * @file activityService.js
 * @description 현장 참여자 PWA 전용 D1 API 클라이언트 서비스 레이어 (ESM)
 * UI 컴포넌트 내 인라인 fetch 호출을 전면 배제하고 일원화된 통신 및 에러 처리를 담당합니다.
 */

const BASE_URL = window.location.origin;

export class ActivityService {
  /**
   * 활성 사업단 목록 조회 (D1 business_units 연동)
   * @param {string} orgUid 기관 UID (예: 'O-28-237-01')
   */
  static async getBusinessUnits(orgUid = 'O-28-237-01') {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/business-units?org_uid=${encodeURIComponent(orgUid)}`);
      if (!res.ok) throw new Error(`사업단 목록 조회 실패 (HTTP ${res.status})`);
      const data = await res.json();
      const list = data.success ? (data.data || data.businessUnits || []) : [];
      return list.map(b => ({
        bu_code: b.bu_code,
        name: b.bu_name || b.name,
        category: b.bu_category || b.category
      }));
    } catch (err) {
      console.warn('[ActivityService] getBusinessUnits 오류 (로컬 기본값 반환):', err.message);
      return [
        { bu_code: 'ME', name: '영양도시락/밑반찬 배달 사업단' },
        { bu_code: 'HE', name: '건강음료/유제품 배달 안부확인' },
        { bu_code: 'CL', name: '주거환경개선/안전점검 사업단' },
        { bu_code: 'EM', name: '정서돌봄/말벗 상담 사업단' }
      ];
    }
  }

  /**
   * 소속 참여자 목록 조회 (D1 participants 연동)
   * @param {string} orgUid 기관 UID
   * @param {string} buCode 사업단 코드
   */
  static async getParticipants(orgUid = 'O-28-237-01', buCode = '') {
    try {
      let url = `${BASE_URL}/api/v1/participants?org_uid=${encodeURIComponent(orgUid)}`;
      if (buCode) url += `&bu_code=${encodeURIComponent(buCode)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`참여자 목록 조회 실패 (HTTP ${res.status})`);
      const data = await res.json();
      return data.success ? data.participants : [];
    } catch (err) {
      console.warn('[ActivityService] getParticipants 오류:', err.message);
      return [];
    }
  }

  /**
   * 당일 업무 시작 (출근 및 시작 GPS 캡처 ➔ D1 participant_attendance)
   * @param {Object} payload { orgUid, participantUid, buCode, dutyDate, startTime, startGpsLat, startGpsLng, startGpsAccuracy }
   */
  static async checkIn(payload) {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/attendance/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`업무 시작 등록 실패 (HTTP ${res.status})`);
      return await res.json();
    } catch (err) {
      console.error('[ActivityService] checkIn 실패:', err);
      throw err;
    }
  }

  /**
   * 당일 활동 마감 및 퇴근 (귀가 ➔ D1 participant_attendance 총 3시간 인정)
   * @param {Object} payload { orgUid, participantUid, dutyDate, endTime, endGpsLat, endGpsLng }
   */
  static async checkOut(payload) {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/attendance/check-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`업무 종료 등록 실패 (HTTP ${res.status})`);
      return await res.json();
    } catch (err) {
      console.error('[ActivityService] checkOut 실패:', err);
      throw err;
    }
  }

  /**
   * 대상자 검색 (지자체 페이퍼 관리번호 5자리 또는 Case UID)
   * @param {string} query 검색어 (예: K1001, C-28-237-01-K1001)
   */
  static async searchBeneficiary(query) {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/cases/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.cases && data.cases.length > 0) {
          return data.cases[0];
        }
      }
    } catch (err) {
      console.warn('[ActivityService] searchBeneficiary 서버 통신 에러 (로컬 매핑 모드로 유지):', err.message);
    }
    return null;
  }

  /**
   * 당일 배정 일정 목록 조회 (D1 bu_activities 기반)
   * @param {string} buCode 사업단 코드
   * @param {string} date 일자 (YYYY-MM-DD)
   */
  static async getSchedules(buCode, date) {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/business-units/${encodeURIComponent(buCode)}/activities?date=${encodeURIComponent(date)}`);
      if (!res.ok) throw new Error(`일정 목록 조회 실패 (HTTP ${res.status})`);
      const data = await res.json();
      return data.activities || [];
    } catch (err) {
      console.warn('[ActivityService] getSchedules 오류:', err.message);
      return [];
    }
  }

  /**
   * 현장 활동 보고 결과 등록 (D1 bu_activities 영구 적재)
   * @param {string} buCode 사업단 코드
   * @param {Object} activityData 활동 데이터
   */
  static async saveActivityReport(buCode, activityData) {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/business-units/${encodeURIComponent(buCode)}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(activityData)
      });
      if (!res.ok) throw new Error(`활동 보고 저장 실패 (HTTP ${res.status})`);
      return await res.json();
    } catch (err) {
      console.error('[ActivityService] saveActivityReport 실패:', err);
      throw err;
    }
  }
}
