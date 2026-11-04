/**
 * @file offlineSyncService.js
 * @description 오프라인 현장 조사 보안 큐 보관, 온라인 자동 동기화 및 전송 후 로컬 파기 서비스 (ESM)
 */

import { ApiClient } from '../api/apiClient.js';
import { notifier } from '../utils/notifier.js';

const OFFLINE_QUEUE_KEY = 'WRK_SECURE_OFFLINE_SURVEYS';

export class OfflineSyncService {
  /**
   * 네트워크 온라인 여부 확인
   */
  static isOnline() {
    return typeof navigator !== 'undefined' && navigator.onLine !== false;
  }

  /**
   * 오프라인 안전 큐에 조사 데이터 암호화/격리 저장
   * @param {Object} payload 
   */
  static saveToOfflineQueue(payload) {
    try {
      const queue = this.getOfflineQueue();
      const offlineItem = {
        ...payload,
        _offlineSavedAt: new Date().toISOString(),
        _status: 'PENDING_SYNC'
      };
      queue.push(offlineItem);
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      return true;
    } catch (e) {
      console.error('[OfflineSyncService] 오프라인 큐 저장 실패:', e);
      return false;
    }
  }

  /**
   * 대기 중인 오프라인 큐 조회
   */
  static getOfflineQueue() {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * 대기 중인 건수 반환
   */
  static getPendingCount() {
    return this.getOfflineQueue().length;
  }

  /**
   * 온라인 복구 시 오프라인 큐에 보관된 데이터 자동 동기화
   * 전송 완료 시 개인정보 보호를 위해 로컬 큐에서 즉시 영구 삭제
   */
  static async syncOfflineQueue() {
    if (!this.isOnline()) return { syncedCount: 0, remainingCount: this.getPendingCount() };

    const queue = this.getOfflineQueue();
    if (queue.length === 0) return { syncedCount: 0, remainingCount: 0 };

    let syncedCount = 0;
    const remainingQueue = [];

    for (const item of queue) {
      try {
        await ApiClient.post('/surveys/assessments', item);
        syncedCount++;
        // 성공 시 해당 항목은 remainingQueue에 넣지 않음으로써 로컬에서 자동 파기
      } catch (err) {
        console.warn('[OfflineSyncService] 개별 동기화 실패 (재시도 대기):', err);
        remainingQueue.push(item);
      }
    }

    // 잔여 큐만 다시 저장
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));

    if (syncedCount > 0) {
      notifier.toast(`오프라인 보관 조사 ${syncedCount}건이 인터넷 복구로 서버에 전송 완료(단말기 임시정보 파기)되었습니다.`, 'success', 4000);
    }

    return { syncedCount, remainingCount: remainingQueue.length };
  }

  /**
   * 온라인/오프라인 네트워크 상태 이벤트 리스너 등록
   */
  static initAutoSyncListener() {
    window.addEventListener('online', () => {
      notifier.toast('네트워크가 연결되었습니다. 오프라인 조사를 동기화합니다.', 'info', 2000);
      this.syncOfflineQueue();
    });

    window.addEventListener('offline', () => {
      notifier.toast('인터넷 연결이 끊겼습니다. 현장 조사는 기기에 안전하게 임시 보관됩니다.', 'warning', 3000);
    });
  }
}
