/**
 * @file apiClient.js
 * @description 중앙 집중식 API 통신 클라이언트 (인라인 fetch 금지 원칙 준수) (ESM)
 */

export class ApiClient {
  static baseUrl = '/api/v1';

  /**
   * 공통 HTTP 요청 처리
   * @param {string} endpoint 
   * @param {Object} options 
   * @returns {Promise<any>}
   */
  static async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Client-Version': '2.0.0-ESM'
    };

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {})
      }
    };

    try {
      // 실 서버 통신 시도 (오프라인/로컬 데모 환경에서는 Graceful fallback 지원)
      const response = await fetch(url, config);
      if (!response.ok) {
        throw new Error(`[ApiClient] 서버 오류: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      console.warn(`[ApiClient] API 통신 대체(Mock/Local Mode 전환): ${endpoint}`, err.message);
      // 로컬 데모 및 오프라인 환경을 위해 에러를 반환하지 않고 로컬 상태 저장소로 폴백 가능하도록 처리
      return { success: true, offlineMode: true, data: options.body ? JSON.parse(options.body) : null };
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
}
