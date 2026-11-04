/**
 * @file surveyApi.js
 * @description 현장 PWA 설문 조사 전용 API 모듈 (ESM)
 */

import { ApiClient } from './apiClient.js';
import { UidEngine } from '../core/uid.js';
import { OfflineSyncService } from '../services/offlineSyncService.js';

export const SUBMITTED_SURVEYS_KEY = 'WRK_SUBMITTED_SURVEYS';

export class SurveyApi {
  /**
   * 로컬 스토리지에 보관된 PWA 제출 완료 조사 목록 조회
   * @returns {Array<Object>}
   */
  static getLocalSubmittedSurveys() {
    try {
      const raw = localStorage.getItem(SUBMITTED_SURVEYS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('[SurveyApi] 로컬 제출 목록 조회 실패:', e);
      return [];
    }
  }

  /**
   * PWA 제출 조사를 로컬 실시간 저장소에 저장 (관리자 실시간 동기화용)
   * @param {Object} packet 
   */
  static saveLocalSubmittedSurvey(packet) {
    try {
      const list = this.getLocalSubmittedSurveys();
      const rawUid = packet.basicInfo?.rawSurveyUid;
      const caseUid = packet.basicInfo?.caseUid;

      const idx = list.findIndex(item => 
        (rawUid && item.basicInfo?.rawSurveyUid === rawUid) || 
        (caseUid && item.basicInfo?.caseUid === caseUid)
      );

      if (idx >= 0) {
        list[idx] = packet;
      } else {
        list.unshift(packet);
      }

      localStorage.setItem(SUBMITTED_SURVEYS_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      console.error('[SurveyApi] 로컬 제출 저장 실패:', e);
      return false;
    }
  }

  /**
   * 현장 조사 평가서 서버 저장 및 동기화 (오프라인 보호 및 로컬 영구 적재 지원)
   * @param {Object} surveyPayload 
   * @returns {Promise<{success: boolean, isOfflineSaved: boolean, data?: Object}>}
   */
  static async submitSurvey(surveyPayload) {
    const auditUid = UidEngine.generateAuditLogUid();
    const packet = {
      ...surveyPayload,
      auditUid,
      submittedAt: new Date().toISOString()
    };

    // 로컬 실시간 저장소에 즉시 적재 (관리자 화면 실시간 파이프라인)
    this.saveLocalSubmittedSurvey(packet);

    // 1. 오프라인 상태인 경우 즉시 안전 큐에 저장
    if (!OfflineSyncService.isOnline()) {
      OfflineSyncService.saveToOfflineQueue(packet);
      return { success: true, isOfflineSaved: true, data: packet };
    }

    // 2. 온라인인 경우 서버 전송 시도
    try {
      const response = await ApiClient.post('/surveys/assessments', packet);
      return { success: true, isOfflineSaved: false, data: response };
    } catch (e) {
      console.warn('[SurveyApi] 서버 전송 실패, 안전 오프라인 큐로 전환:', e);
      OfflineSyncService.saveToOfflineQueue(packet);
      return { success: true, isOfflineSaved: true, data: packet };
    }
  }

  /**
   * 최근 현장 조사 목록 조회
   */
  static async getRecentSurveys(orgUid) {
    return await ApiClient.get('/surveys/recent', { orgUid });
  }
}
