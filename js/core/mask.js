/**
 * @file mask.js
 * @description 부평구 취약계층 100% 완전 가명화(Zero PII Plaintext) 동적 마스킹 엔진 (ESM)
 */

/**
 * 성명 마스킹
 * 2글자: 홍*
 * 3글자: 홍*동
 * 4글자 이상: 남***우
 */
export function maskName(name) {
  if (!name) return '-';
  const str = String(name).trim();
  if (str.length <= 1) return str;
  if (str.length === 2) return str[0] + '*';
  if (str.length === 3) return str[0] + '*' + str[2];
  return str[0] + '*'.repeat(str.length - 2) + str[str.length - 1];
}

/**
 * 생년월일 마스킹: YYYY-**-** 또는 앞1자리만 표출(1952년 ➔ 1952-**-**)
 */
export function maskBirth(birth) {
  if (!birth) return '-';
  const clean = String(birth).replace(/\D/g, '');
  if (clean.length === 8) {
    return `${clean.slice(0, 4)}-**-**`;
  }
  if (clean.length === 6) {
    const yy = clean.slice(0, 2);
    const prefix = parseInt(yy, 10) > 30 ? '19' : '20';
    return `${prefix}${yy}-**-**`;
  }
  return String(birth).replace(/(\d{4})[-/.]?(\d{2})[-/.]?(\d{2})/, '$1-**-**');
}

/**
 * 전화번호 마스킹: 010-****-1234, 032-***-1234
 */
export function maskPhone(phone) {
  if (!phone) return '-';
  const clean = String(phone).replace(/\D/g, '');
  if (clean.length === 11) {
    return `${clean.slice(0, 3)}-****-${clean.slice(7)}`;
  }
  if (clean.length === 10) {
    if (clean.startsWith('02')) {
      return `${clean.slice(0, 2)}-****-${clean.slice(6)}`;
    }
    return `${clean.slice(0, 3)}-***-${clean.slice(6)}`;
  }
  if (clean.length === 9) {
    return `${clean.slice(0, 2)}-***-${clean.slice(5)}`;
  }
  return phone;
}

/**
 * 상세 주소 마스킹: 부평구 00동까지 노출, 상세 지번/호수/아파트동호수는 마스킹
 * 예: "인천광역시 부평구 부평동 123-45" ➔ "인천광역시 부평구 부평동 ***"
 */
export function maskAddress(addr) {
  if (!addr) return '-';
  const str = String(addr).trim();
  // 동/읍/면 또는 로/길 이후를 마스킹
  const match = str.match(/^(.*?[동읍면리]|.*?[로길]\s*\d+(?:-\d+)?)/);
  if (match) {
    return `${match[1]} ***`;
  }
  return str.split(' ').slice(0, 3).join(' ') + ' ***';
}

/**
 * UID 부분 마스킹: C-28-237-01-001 ➔ C-28-237-01-*** (공공 대외 표출용)
 */
export function maskUid(uid) {
  if (!uid) return '-';
  const parts = String(uid).split('-');
  if (parts.length >= 5) {
    parts[4] = '***';
    return parts.join('-');
  }
  return uid;
}
