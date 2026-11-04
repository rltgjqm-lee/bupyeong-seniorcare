/**
 * @file date.js
 * @description 로컬 시간대(KST 등) 기준 날짜 유틸 (UTC 시차 왜곡 방지) (ESM)
 */

/**
 * 로컬 기준 YYYY-MM-DD 문자열 반환 (시간대 시차 왜곡 없이 항상 오늘 날짜 보장)
 * @param {Date|string} dateInput 
 * @returns {string} 예: 2026-10-04
 */
export function getLocalTodayString(dateInput = new Date()) {
  const d = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) {
    const fallback = new Date();
    const year = fallback.getFullYear();
    const month = String(fallback.getMonth() + 1).padStart(2, '0');
    const day = String(fallback.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 로컬 기준 HH:mm 문자열 반환 (시간대 시차 왜곡 없이 항상 24시간제 시:분 보장)
 * @param {Date|string} dateInput 
 * @returns {string} 예: 14:30
 */
export function getLocalTimeString(dateInput = new Date()) {
  const d = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  const hours = String(validDate.getHours()).padStart(2, '0');
  const minutes = String(validDate.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}
