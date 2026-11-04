/**
 * @file orgAdminApi.js
 * @description 참여기관 관리자 포털 전용 API 통신 서비스 모듈 (ESM & API 계층 분리 철칙 준수)
 */

import { ApiClient } from './apiClient.js';

export class OrgAdminApi {
  /**
   * 1. 기관 기초정보 조회
   * @param {string} orgUid (예: 'O-28-260-01')
   * @returns {Promise<any>}
   */
  static async getOrganization(orgUid = 'O-28-260-01') {
    return await ApiClient.get('/organizations', { orgUid });
  }

  /**
   * 1-1. 기관 기초정보 수정 저장
   * @param {Object} data 
   * @returns {Promise<any>}
   */
  static async updateOrganization(data) {
    return await ApiClient.put('/organizations', data);
  }

  /**
   * 2. 총괄 관리자 내 프로필 조회
   * @param {string} staffUid (예: 'A-28-260-01-01')
   * @returns {Promise<any>}
   */
  static async getMyProfile(staffUid = 'A-28-260-01-01') {
    return await ApiClient.get('/staff/profile', { staffUid });
  }

  /**
   * 2-1. 총괄 관리자 내 프로필 수정 저장
   * @param {Object} profileData 
   * @returns {Promise<any>}
   */
  static async updateMyProfile(profileData) {
    return await ApiClient.put('/staff/profile', profileData);
  }

  /**
   * 3. 부관리자(실무 담당자) 목록 조회
   * @param {string} orgUid (예: 'O-28-260-01')
   * @returns {Promise<any>}
   */
  static async getAdmins(orgUid = 'O-28-260-01') {
    return await ApiClient.get('/staff/admins', { orgUid });
  }

  /**
   * 3-1. 부관리자 등록 및 수정 저장
   * @param {Object} adminData 
   * @returns {Promise<any>}
   */
  static async saveAdmin(adminData) {
    return await ApiClient.post('/staff/admins', adminData);
  }

  /**
   * 3-2. 부관리자 삭제
   * @param {string} staffUid 
   * @returns {Promise<any>}
   */
  static async deleteAdmin(staffUid) {
    return await ApiClient.request(`/staff/admins?staffUid=${encodeURIComponent(staffUid)}`, { method: 'DELETE' });
  }

  /**
   * 4. 대상자 사례 목록 조회 (동적 마스킹 적용)
   * @param {Object} params 
   * @returns {Promise<any>}
   */
  static async getCases(params = {}) {
    return await ApiClient.get('/cases', params);
  }

  /**
   * 4-1. 대상자 종합 상세 이력 조회 (우울증 + 고독사 + 안부카드)
   * @param {string} caseUid 
   * @returns {Promise<any>}
   */
  static async getCaseDetail(caseUid) {
    return await ApiClient.get('/cases/detail', { caseUid });
  }

  /**
   * 5. 사업단별 실시간 현장 활동 내역 목록 조회
   * @param {string} buCode (예: 'ME', 'HE', 'CL', 'EM' 또는 'all')
   * @param {Object} filters
   * @returns {Promise<any>}
   */
  static async getBuActivities(buCode = 'all', filters = {}) {
    return await ApiClient.get(`/business-units/${encodeURIComponent(buCode)}/activities`, filters);
  }

  /**
   * 5-1. 사업단 현장 활동 관리자 확인 및 상태 수정 저장
   * @param {string} activityId 
   * @param {Object} updateData
   * @returns {Promise<any>}
   */
  static async updateActivityStatus(activityId, updateData) {
    return await ApiClient.put(`/activities/${encodeURIComponent(activityId)}`, updateData);
  }
}
