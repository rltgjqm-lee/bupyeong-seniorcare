/**
 * cryptoService.js
 * WellRiskKeeper & S-GDS & Check24h 전사 표준 Web Crypto 암호화 및 동적 마스킹 엔진
 * 
 * - 표준: NIST SP 800-38D (AES-256-GCM), RFC 6238 (TOTP)
 * - 런타임: Cloudflare Workers (Edge) & Node.js 18+ 100% W3C 표준 호환
 * - 키 거버넌스: 256비트 대칭키, 96비트(12바이트) IV, 128비트(16바이트) Auth Tag
 */

const cryptoSubtle = globalThis.crypto?.subtle || (await import('crypto')).webcrypto.subtle;
const cryptoRandom = globalThis.crypto || (await import('crypto')).webcrypto;

// 기본 키 파생 캐시 (동일 키 반복 임포트 오버헤드 방지)
const keyCache = new Map();

/**
 * 256비트 마스터 문자열을 Web Crypto CryptoKey 객체로 변환
 * @param {string} rawKeyStr 32글자 이상 마스터 시크릿 문자열
 * @param {'encrypt'|'decrypt'} usage
 * @returns {Promise<CryptoKey>}
 */
async function importAesKey(rawKeyStr, usage) {
  const cacheKey = `${rawKeyStr}:${usage}`;
  if (keyCache.has(cacheKey)) {
    return keyCache.get(cacheKey);
  }

  // 32바이트(256비트) SHA-256 해시로 고정 키 파생
  const encoder = new TextEncoder();
  const keyBuffer = await cryptoSubtle.digest('SHA-256', encoder.encode(rawKeyStr));

  const key = await cryptoSubtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );

  keyCache.set(cacheKey, key);
  return key;
}

/**
 * [AES-256-GCM] 평문 암호화
 * @param {string} plainText 암호화할 원본 텍스트
 * @param {string} masterKeyStr 마스터 시크릿 키
 * @returns {Promise<string>} Base64 인코딩된 암호문 (IV 12B + Ciphertext + Tag 16B)
 */
export async function encryptAesGcm(plainText, masterKeyStr) {
  if (!plainText) return null;

  const key = await importAesKey(masterKeyStr, 'encrypt');
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText);

  // 1. 12바이트(96비트) 암호학적 난수 IV 채번 (중복 절대 금지)
  const iv = new Uint8Array(12);
  cryptoRandom.getRandomValues(iv);

  // 2. AES-256-GCM 암호화 (128비트 Auth Tag 자동 결합)
  const ciphertextWithTag = await cryptoSubtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128
    },
    key,
    data
  );

  // 3. [IV (12B)] + [Ciphertext + Tag] 결합
  const combined = new Uint8Array(iv.length + ciphertextWithTag.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertextWithTag), iv.length);

  // 4. Base64 인코딩
  let binary = '';
  const len = combined.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary);
}

/**
 * [AES-256-GCM] 암호문 복호화
 * @param {string} packedBase64 Base64 인코딩된 암호문
 * @param {string} masterKeyStr 마스터 시크릿 키
 * @returns {Promise<string>} 복호화된 원본 평문
 */
export async function decryptAesGcm(packedBase64, masterKeyStr) {
  if (!packedBase64) return null;

  try {
    const key = await importAesKey(masterKeyStr, 'decrypt');
    const binary = atob(packedBase64);
    const combined = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      combined[i] = binary.charCodeAt(i);
    }

    // 최소 길이: IV 12B + Tag 16B = 28B
    if (combined.byteLength < 28) {
      throw new Error('Invalid ciphertext length');
    }

    // 1. IV(앞 12바이트)와 Ciphertext+Tag 분리
    const iv = combined.slice(0, 12);
    const ciphertextWithTag = combined.slice(12);

    // 2. 복호화 및 Auth Tag 무결성 자동 검증
    const decrypted = await cryptoSubtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128
      },
      key,
      ciphertextWithTag
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (err) {
    console.error('[cryptoService] Decryption failed or ciphertext tampered:', err.message);
    throw new Error('Decryption failure: Invalid key or tampered data');
  }
}

/**
 * [HMAC-SHA256] 검색용 단방향 인덱스 해시 생성 (전화번호 등 일치 검색용)
 * @param {string} rawText 검색 대상 원본 문자열 (전화번호 등)
 * @param {string} saltSecret 검색용 공통 비밀 솔트
 * @returns {Promise<string>} 64자리 16진수 Hex 문자열
 */
export async function generateSearchHash(rawText, saltSecret) {
  if (!rawText) return null;

  // 전화번호의 경우 하이픈/공백 제거 정규화
  const normalized = String(rawText).replace(/[^0-9a-zA-Z가-힣]/g, '');

  const encoder = new TextEncoder();
  const key = await cryptoSubtle.importKey(
    'raw',
    encoder.encode(saltSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await cryptoSubtle.sign('HMAC', key, encoder.encode(normalized));
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 동적 마스킹(Dynamic Masking) 함수
 * @param {'name'|'phone'|'address'|'resident_id'} type 대상 PII 타입
 * @param {string} val 원본 값
 * @returns {string} 마스킹 처리된 값
 */
export function applyDynamicMasking(type, val) {
  if (!val) return '';
  const str = String(val).trim();

  switch (type) {
    case 'name': {
      if (str.length <= 1) return str;
      if (str.length === 2) return str[0] + '*';
      if (str.length === 3) return str[0] + '*' + str[2];
      // 4글자 이상
      return str[0] + '*'.repeat(str.length - 2) + str[str.length - 1];
    }
    case 'phone': {
      const clean = str.replace(/[^0-9]/g, '');
      if (clean.length === 11) {
        // 010-1234-5678 -> 010-****-5678
        return `${clean.slice(0, 3)}-****-${clean.slice(7)}`;
      }
      if (clean.length === 10) {
        // 02-1234-5678 또는 031-123-5678
        return clean.startsWith('02')
          ? `02-****-${clean.slice(6)}`
          : `${clean.slice(0, 3)}-***-${clean.slice(6)}`;
      }
      return '010-****-****';
    }
    case 'address': {
      // 행정동/법정동/도로명(동·로·길·읍·면)까지만 표출하고, 이후 번지·건물·상세는 완전 마스킹
      const match = str.match(/^(.+?([가-힣0-9]+[동로길읍면]))(\s+.*)?$/);
      if (match) {
        return `${match[1]} ***`;
      }
      const parts = str.split(/\s+/);
      if (parts.length >= 3) {
        return `${parts.slice(0, 3).join(' ')} ***`;
      }
      return str.endsWith('***') ? str : `${str} ***`;
    }
    case 'resident_id': {
      // 900101-1234567 -> 900101-1******
      const clean = str.replace(/[^0-9]/g, '');
      if (clean.length >= 7) {
        return clean.slice(0, 6) + '-' + clean[6] + '******';
      }
      return str;
    }
    default:
      return str;
  }
}

/**
 * 지자체 공직자 메일(@korea.kr)용 6자리 난수 OTP 생성
 * @returns {string} 6자리 숫자 문자열 (예: '582914')
 */
export function generateMailOtp() {
  const buf = new Uint32Array(1);
  cryptoRandom.getRandomValues(buf);
  const num = buf[0] % 1000000;
  return String(num).padStart(6, '0');
}

/**
 * Check24h 오프라인 스마트도어락 RFC 6238 TOTP 10분 일회성 OTP 생성
 * @param {string} seedSalt 도어락 고유 시드 솔트
 * @param {number} timeStepSec 유효 시간 주기 (기본 600초 = 10분)
 * @param {number} epochMs 기준 시각 (기본 현재 시각)
 * @returns {Promise<string>} 6자리 도어락 OTP (예: '749102')
 */
export async function generateDoorlockOtp(seedSalt, timeStepSec = 600, epochMs = Date.now()) {
  if (!seedSalt) throw new Error('Doorlock seed salt is required');

  const counter = Math.floor(epochMs / 1000 / timeStepSec);

  // 8바이트 Big-Endian 버퍼로 카운터 인코딩
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigUint64(0, BigInt(counter), false); // Big-Endian

  const encoder = new TextEncoder();
  const key = await cryptoSubtle.importKey(
    'raw',
    encoder.encode(seedSalt),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const hmac = await cryptoSubtle.sign('HMAC', key, buffer);
  const hmacBytes = new Uint8Array(hmac);

  // Dynamic Truncation (RFC 4226 / RFC 6238)
  const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;
  const binary =
    ((hmacBytes[offset] & 0x7f) << 24) |
    ((hmacBytes[offset + 1] & 0xff) << 16) |
    ((hmacBytes[offset + 2] & 0xff) << 8) |
    (hmacBytes[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return String(otp).padStart(6, '0');
}

export default {
  encryptAesGcm,
  decryptAesGcm,
  generateSearchHash,
  applyDynamicMasking,
  generateMailOtp,
  generateDoorlockOtp
};
