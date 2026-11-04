/**
 * @file mask.js
 * @description 개인정보 스마트 마스킹 유틸리티 (ESM)
 */

export function maskName(name) {
  if (!name) return '';
  const clean = name.trim();
  if (clean.length <= 1) return clean;
  if (clean.length === 2) return clean[0] + '*';
  return clean[0] + '*'.repeat(clean.length - 2) + clean[clean.length - 1];
}

export function maskPhone(phone) {
  if (!phone) return '';
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3');
  } else if (clean.length === 10) {
    return clean.replace(/(\d{3})(\d{3})(\d{4})/, '$1-***-$3');
  }
  return phone;
}

export function maskAddress(addr) {
  if (!addr) return '';
  const clean = addr.trim();
  const match = clean.match(/^(.+?([가-힣0-9]+[동로길읍면]))(\s+.*)?$/);
  if (match) {
    return `${match[1]} ***`;
  }
  const parts = clean.split(/\s+/);
  if (parts.length >= 3) {
    return `${parts.slice(0, 3).join(' ')} ***`;
  }
  return clean.endsWith('***') ? clean : `${clean} ***`;
}

export function maskGender(gender) {
  return '*';
}

export function maskUid(uid) {
  if (!uid) return '';
  // S-28-260-03-001-20260930 ➔ S-28-***-03-001-0930
  // C-28-260-03-001 ➔ C-28-***-03-001
  const parts = uid.split('-');
  if (parts.length >= 5) {
    // S-28-260-03-001-20260930
    const prefix = parts[0];
    const sido = parts[1];
    const seq = parts[3];
    const caseNum = parts[4];
    const datePart = parts[5] ? parts[5].slice(-4) : '';
    return `${prefix}-${sido}-***-${seq}-${caseNum}${datePart ? '-' + datePart : ''}`;
  } else if (parts.length === 4) {
    // C-28-260-03-001
    return `${parts[0]}-${parts[1]}-***-${parts[3]}`;
  }
  return uid;
}

export function maskBirth(birth) {
  if (!birth) return '';
  const clean = birth.trim();
  const match = clean.match(/^(\d{4})[-./]?(\d{2})[-./]?(\d{2})$/);
  if (match) {
    return `${match[1]}-**-**`;
  }
  if (clean.length === 4) {
    return `${clean}-**-**`;
  }
  return clean;
}
