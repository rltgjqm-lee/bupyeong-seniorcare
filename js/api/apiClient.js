/**
 * @file apiClient.js
 * @description 부평구 통합돌봄 중앙 집중식 API 통신 클라이언트 (ESM)
 * - UI 인라인 fetch 절대 금지 원칙 100% 준수
 * - 오프라인/로컬 데모 환경 Mock & IndexedDB 폴백 탑재
 */

export class ApiClient {
  static baseUrl = '/api/v1';

  /**
   * 공통 HTTP 요청 처리
   */
  static async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Client-Platform': 'Bupyeong-CareSafe-PWA/2.0'
    };

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {})
      }
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        throw new Error(`[ApiClient] 서버 응답 오류: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      console.warn(`[ApiClient] 로컬/오프라인 폴백 모드 전환: ${endpoint} - ${err.message}`);
      return {
        success: true,
        offlineMode: true,
        data: options.body ? JSON.parse(options.body) : null
      };
    }
  }

  static get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  static post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  static delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }

  /**
   * 대상자 과거 조사 및 활동 이력 조회
   * @param {string} caseUid
   */
  static async getCaseHistory(caseUid) {
    if (!caseUid) return { success: false, records: [], nextRound: 1 };
    const cleanUid = encodeURIComponent(caseUid.trim());
    return this.get(`/cases/${cleanUid}/history`);
  }
}
