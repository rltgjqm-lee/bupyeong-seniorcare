/**
 * @file participantService.js
 * @description 참여기관 소속 참여자(활동가 2인 1조) 등록, 수정, 로컬 복원 및 검증 서비스 (ESM)
 */

import { getLocalTodayString } from '../utils/date.js';
import { UidEngine } from '../core/uid.js';

const WRK_BASIC_INFO_KEY = 'wrk_last_basic_info';
const WRK_PARTICIPANT_CACHE_KEY = 'wrk_participants_cache';

// 등록된 공공/민간 참여기관 마스터 목록 (인천 서구 및 전국 거점)
export const REGISTERED_ORGS = [
  { orgCode: 'O-28-260-01', orgName: '인천 서구 통합돌봄센터', project: '고독사예방게이트키퍼', region: '인천 서구' },
  { orgCode: 'O-28-260-02', orgName: '인천 서구 시니어클럽', project: '통합돌봄 안부확인단', region: '인천 서구' },
  { orgCode: 'O-28-260-03', orgName: '가좌 복지관 돌봄센터', project: '고립은둔가구 발굴단', region: '인천 서구' },
  { orgCode: 'O-11-680-01', orgName: '강남구 노인인력개발센터', project: '1인가구 안심살핌단', region: '서울 강남구' },
  { orgCode: 'O-30-230-01', orgName: '대전 대덕구 시니어클럽', project: '고독사 예방 안부살핌단', region: '대전 대덕구' }
];

/**
 * 참여자 성명 목록으로부터 표준 참여자 UID 프로필 생성 (전사 표준 v3.0)
 * @param {string} orgCode (예: O-28-260-01)
 * @param {string} buCode (예: GD, ME, HE, CL, EM)
 * @param {Array<string>} inspectors (예: ['박영희', '김철수'])
 * @returns {Array<{name: string, uid: string, role: string}>}
 */
export function buildParticipantProfiles(orgCode = 'O-28-260-01', buCode = 'GD', inspectors = []) {
  return inspectors.map((name, idx) => ({
    name: (name || '').trim(),
    uid: UidEngine.generateParticipantUid(orgCode, buCode, idx + 1),
    role: idx === 0 ? '정' : '부'
  }));
}

/**
 * 기본정보 (기관, 사업단, 참여 활동가 명단) 로컬 스토리지에서 복원
 */
export function loadLastBasicInfo() {
  const today = getLocalTodayString();
  try {
    const raw = localStorage.getItem(WRK_BASIC_INFO_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      // 저장된 조사일자가 과거 날짜이거나 없으면 자동으로 오늘 날짜로 산뜻하게 갱신
      if (!data.inspectionDate || data.inspectionDate < today) {
        data.inspectionDate = today;
      }
      if (data.project && data.project.endsWith(' 사업단')) {
        data.project = data.project.replace(/\s*사업단$/, '');
      }
      return data;
    }
  } catch (e) {
    console.warn('[ParticipantService] 기본정보 로컬 로드 실패:', e);
  }
  return {
    orgName: '인천 서구 통합돌봄센터',
    orgCode: 'O-28-260-01',
    project: '고독사예방게이트키퍼',
    inspectors: ['박영희', '김철수'],
    inspectionDate: today
  };
}

/**
 * 기본정보 로컬 스토리지에 저장 (다음 실행 시 자동 복원)
 */
export function saveBasicInfo(info) {
  try {
    localStorage.setItem(WRK_BASIC_INFO_KEY, JSON.stringify(info));
    return true;
  } catch (e) {
    console.error('[ParticipantService] 기본정보 저장 실패:', e);
    return false;
  }
}

/**
 * 참여자 성명 유효성 검증
 */
export function validateInspectors(inspectors = []) {
  const validList = inspectors.map(n => (n || '').trim()).filter(Boolean);
  if (validList.length === 0) {
    return { isValid: false, message: '활동가(점검자) 성명을 최소 1명 이상 입력해 주십시오.' };
  }
  return { isValid: true, inspectors: validList };
}
