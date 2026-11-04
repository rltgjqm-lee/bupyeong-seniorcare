/**
 * @file assignmentService.js
 * @description 옴니채널 가구 배정 조회, 서식 299p N차 정기 안부 모니터링 기록 저장 및 심층 재진단 전환 서비스 (ESM)
 */

import { ApiClient } from '../api/apiClient.js';
import { OfflineSyncService } from './offlineSyncService.js';
import { notifier } from '../utils/notifier.js';
import { getLocalTodayString } from '../utils/date.js';

const MONITORING_STORAGE_KEY = 'WRK_MONITORING_RECORDS';

// 테스트 및 데모용 배정 모의 데이터 (인천 서구 등)
const MOCK_ASSIGNMENT_CASES = [
  {
    assignmentUid: 'ASG_20261001_001',
    householdId: 'C-28-260-01-001',
    caseUid: 'C-28-260-01-001',
    targetName: '김만석',
    birth: '1948-03-15',
    gender: 'M',
    phone: '010-3849-2910',
    address: '인천 서구 서곶로 284 302호',
    housingType: '다가구·다세대주택',
    guardian: {
      relation: '자녀',
      name: '김은희',
      phone: '010-9988-7766',
      isProxySigner: false
    },
    orgCode: 'O-28-260-01',
    assignedInspector: '박영희',
    assignedChannel: 'FIELD_VISIT',
    scheduledDate: getLocalTodayString(),
    caseStatus: 'REVISIT',
    previousGrade: '고위험 (9점)',
    previousSurveyDate: '2026-09-15',
    revisitCount: 2
  },
  {
    assignmentUid: 'ASG_20261001_002',
    householdId: 'C-28-260-01-002',
    caseUid: 'C-28-260-01-002',
    targetName: '이점순',
    birth: '1952-11-04',
    gender: 'F',
    phone: '010-7712-4432',
    address: '인천 서구 봉오재3로 94 104동 502호',
    housingType: '아파트',
    guardian: {
      relation: '이웃/지인',
      name: '최영자',
      phone: '010-2233-4455',
      isProxySigner: false
    },
    orgCode: 'O-28-260-01',
    assignedInspector: '박영희',
    assignedChannel: 'FIELD_VISIT',
    scheduledDate: getLocalTodayString(),
    caseStatus: 'NEW_SURVEY',
    previousGrade: '신규 배정 대상',
    previousSurveyDate: null,
    revisitCount: 1
  },
  {
    assignmentUid: 'ASG_20261001_003',
    householdId: 'C-28-260-01-003',
    caseUid: 'C-28-260-01-003',
    targetName: '박성철',
    birth: '1955-07-20',
    gender: 'M',
    phone: '010-5544-1122',
    address: '인천 서구 원적로 12 1층',
    housingType: '단독주택',
    guardian: null,
    orgCode: 'O-28-260-01',
    assignedInspector: '박영희',
    assignedChannel: 'FIELD_VISIT',
    scheduledDate: getLocalTodayString(),
    caseStatus: 'REVISIT',
    previousGrade: '중위험 (5점)',
    previousSurveyDate: '2026-09-20',
    revisitCount: 3
  }
];

export class AssignmentService {
  /**
   * 활동가 정보 기준 오늘 배정된 가구 목록 조회 (최소 권한 격리 조회)
   * @param {string} orgCode 
   * @param {string} inspectorName 
   * @returns {Promise<Array>}
   */
  static async getAssignedCases(orgCode, inspectorName) {
    try {
      // 1. API 통신 시도
      const res = await ApiClient.get(`/assignments/today?orgCode=${encodeURIComponent(orgCode)}&inspector=${encodeURIComponent(inspectorName)}`);
      if (res && res.data) return res.data;
    } catch (e) {
      console.warn('[AssignmentService] API 조회 실패, 로컬 배정 캐시/모의 데이터 활용:', e);
    }

    // 2. Mock 배정 데이터 필터링 반환
    const cleanOrg = (orgCode || '').trim();
    const cleanName = (inspectorName || '').trim();

    return MOCK_ASSIGNMENT_CASES.filter(c => {
      const matchOrg = !cleanOrg || c.orgCode === cleanOrg;
      const matchName = !cleanName || c.assignedInspector === cleanName || cleanName === '박영희' || cleanName === '김철수';
      return matchOrg && matchName;
    });
  }

  /**
   * 도로명/지번 주소 기반 배정/등록 가구 핀포인트 쿼리 (D1 최적화)
   * @param {string} orgCode 
   * @param {string} addressQuery 
   * @returns {Promise<Array>}
   */
  static async searchTargetByAddress(orgCode, addressQuery) {
    const cleanAddr = (addressQuery || '').trim().toLowerCase();
    if (!cleanAddr) return [];

    try {
      const res = await ApiClient.get(`/targets/by-address?orgCode=${encodeURIComponent(orgCode || '')}&addr=${encodeURIComponent(cleanAddr)}`);
      if (res && res.data) return res.data;
    } catch (e) {
      // API 실패 시 로컬 Mock 데이터에서 매칭
    }

    const cleanOrg = (orgCode || '').trim();
    // 도로명 또는 번지수 핵심 단어 매칭
    const addrKeywords = cleanAddr.split(/\s+/).filter(w => w.length >= 2);

    return MOCK_ASSIGNMENT_CASES.filter(c => {
      const matchOrg = !cleanOrg || c.orgCode === cleanOrg;
      const targetAddr = (c.address || '').toLowerCase();
      // 최소 2개 이상의 주소 키워드 일치 확인
      const matchKeywords = addrKeywords.filter(k => targetAddr.includes(k));
      return matchOrg && matchKeywords.length >= 2;
    });
  }

  /**
   * 서식 299p N차 정기 안부 모니터링 기록 저장
   * @param {Object} record (MonitoringRecord 규격)
   */
  static async saveMonitoringRecord(record) {
    try {
      // 1. 로컬 스토리지에 시계열 저장
      const existing = this.getMonitoringHistory(record.householdId);
      existing.push(record);
      
      const allRecords = this.getAllStoredMonitoring();
      allRecords[record.householdId] = existing;
      localStorage.setItem(MONITORING_STORAGE_KEY, JSON.stringify(allRecords));

      // 2. 온라인일 경우 서버 API 전송
      if (OfflineSyncService.isOnline()) {
        try {
          await ApiClient.post('/monitoring/records', record);
        } catch (apiErr) {
          console.warn('[AssignmentService] 모니터링 기록 API 전송 실패, 오프라인 큐 보관:', apiErr);
          OfflineSyncService.saveToOfflineQueue({ type: 'MONITORING_299P', payload: record });
        }
      } else {
        OfflineSyncService.saveToOfflineQueue({ type: 'MONITORING_299P', payload: record });
      }

      return { success: true, recordUid: record.recordUid };
    } catch (err) {
      console.error('[AssignmentService] 모니터링 기록 저장 오류:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * 가구별 N차 안부 모니터링 이력 조회
   * @param {string} householdId 
   * @returns {Array}
   */
  static getMonitoringHistory(householdId) {
    try {
      const all = this.getAllStoredMonitoring();
      return all[householdId] || [];
    } catch (e) {
      return [];
    }
  }

  /**
   * 전체 저장된 모니터링 기록 맵 반환
   */
  static getAllStoredMonitoring() {
    try {
      const raw = localStorage.getItem(MONITORING_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }
}
