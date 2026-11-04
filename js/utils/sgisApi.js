/**
 * @file sgisApi.js
 * @description 통계청 SGIS Open API 연동 및 고정밀 WGS84 ⇄ UTM-K 좌표계 변환 모듈 (ESM)
 */

import { SGIS_CONFIG } from './sgisConfig.js';

let cachedAccessToken = null;
let tokenIssuedTime = 0;

// 토큰 유효기간: 4시간 (14,400,000ms), 3시간 50분(13,800,000ms) 기준 미리 갱신하여 안전 보장
const TOKEN_CACHE_DURATION = 13800000;

const PROXY_URL = (typeof window !== 'undefined' && window.location && window.location.origin)
  ? `${window.location.origin}/proxy?url=`
  : 'http://localhost:8888/proxy?url=';

/**
 * WGS84 (경도 lng, 위도 lat) -> SGIS UTM-K (x_coor, y_coor) 좌표 정밀 수치 변환
 */
export function wgs84ToUtmk(lng, lat) {
  const D2R = Math.PI / 180;
  const a = 6378137.0;
  const f = 1 / 298.257222101;
  const e2 = 2 * f - f * f;
  const k0 = 0.9996;
  const lon0 = 127.5 * D2R;
  const lat0 = 38.0 * D2R;
  const falseEasting = 1000000;
  const falseNorthing = 2000000;

  const phi = lat * D2R;
  const lambda = lng * D2R;

  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);

  const N = a / Math.sqrt(1 - e2 * sinPhi * sinPhi);
  const T = Math.tan(phi) * Math.tan(phi);
  const C = (e2 / (1 - e2)) * cosPhi * cosPhi;
  const A = (lambda - lon0) * cosPhi;

  const M = a * (
    (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256) * phi -
    (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 * e2 * e2 / 1024) * Math.sin(2 * phi) +
    (15 * e2 * e2 / 256 + 45 * e2 * e2 * e2 / 1024) * Math.sin(4 * phi) -
    (35 * e2 * e2 / 3072) * Math.sin(6 * phi)
  );

  const M0 = a * (
    (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256) * lat0 -
    (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 * e2 * e2 / 1024) * Math.sin(2 * lat0) +
    (15 * e2 * e2 / 256 + 45 * e2 * e2 * e2 / 1024) * Math.sin(4 * lat0) -
    (35 * e2 * e2 / 3072) * Math.sin(6 * lat0)
  );

  const x = falseEasting + k0 * N * (A + (1 - T + C) * A * A * A / 6 + (5 - 18 * T + T * T + 72 * C - 58 * (e2 / (1 - e2))) * A * A * A * A * A / 120);
  const y = falseNorthing + k0 * (M - M0 + N * Math.tan(phi) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A * A * A * A / 24 + (61 - 58 * T + T * T + 600 * C - 330 * (e2 / (1 - e2))) * A * A * A * A * A * A / 720));

  return {
    x: Math.round(x),
    y: Math.round(y)
  };
}

/**
 * 프록시 경유 SGIS API 원본 데이터 수신 헬퍼
 */
async function fetchViaProxy(targetUrl) {
  const proxyUrl = `${PROXY_URL}${encodeURIComponent(targetUrl)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const text = await res.text();
  if (text.trim().startsWith('<') || text.includes('<html>')) {
    return { errCd: -4001, errMsg: '토큰 만료 또는 302 리다이렉트 응답' };
  }
  return JSON.parse(text);
}

/**
 * SGIS 보안 토큰(accessToken) 발급 및 스마트 캐싱 (4시간 보존)
 */
export async function getSgisAccessToken() {
  const now = Date.now();
  if (cachedAccessToken && (now - tokenIssuedTime < TOKEN_CACHE_DURATION)) {
    return cachedAccessToken;
  }

  try {
    const authUrl = `${SGIS_CONFIG.AUTH_URL}?consumer_key=${SGIS_CONFIG.CONSUMER_KEY}&consumer_secret=${SGIS_CONFIG.CONSUMER_SECRET}`;
    const data = await fetchViaProxy(authUrl);

    if (data && data.errCd === 0 && data.result && data.result.accessToken) {
      cachedAccessToken = data.result.accessToken;
      tokenIssuedTime = Date.now();
      return cachedAccessToken;
    }
    return null;
  } catch (error) {
    console.error('[SGIS] 토큰 발급 오류:', error);
    return null;
  }
}

/**
 * SGIS UTM-K (x, y) -> WGS84 (lat, lng) 고정밀 역변환
 */
export function utmkToWgs84(x, y) {
  const D2R = Math.PI / 180;
  const R2D = 180 / Math.PI;
  const a = 6378137.0;
  const f = 1 / 298.257222101;
  const e2 = 2 * f - f * f;
  const e_prime_sq = e2 / (1 - e2);
  const k0 = 0.9996;
  const lon0 = 127.5 * D2R;
  const lat0 = 38.0 * D2R;
  const falseEasting = 1000000;
  const falseNorthing = 2000000;

  const M0 = a * (
    (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256) * lat0 -
    (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 * e2 * e2 / 1024) * Math.sin(2 * lat0) +
    (15 * e2 * e2 / 256 + 45 * e2 * e2 * e2 / 1024) * Math.sin(4 * lat0) -
    (35 * e2 * e2 / 3072) * Math.sin(6 * lat0)
  );

  const x_adj = (Number(x) - falseEasting) / k0;
  const y_adj = (Number(y) - falseNorthing) / k0 + M0;

  const mu = y_adj / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));

  const phi1 = mu + 
    (3 * e1 / 2 - 27 * Math.pow(e1, 3) / 32) * Math.sin(2 * mu) +
    (21 * Math.pow(e1, 2) / 16 - 55 * Math.pow(e1, 4) / 32) * Math.sin(4 * mu) +
    (151 * Math.pow(e1, 3) / 96) * Math.sin(6 * mu) +
    (1097 * Math.pow(e1, 4) / 512) * Math.sin(8 * mu);

  const sinPhi1 = Math.sin(phi1);
  const cosPhi1 = Math.cos(phi1);
  const tanPhi1 = Math.tan(phi1);

  const N1 = a / Math.sqrt(1 - e2 * sinPhi1 * sinPhi1);
  const T1 = tanPhi1 * tanPhi1;
  const C1 = e_prime_sq * cosPhi1 * cosPhi1;
  const R1 = a * (1 - e2) / Math.pow(1 - e2 * sinPhi1 * sinPhi1, 1.5);
  const D = x_adj / N1;

  const lat = phi1 - (N1 * tanPhi1 / R1) * (
    D * D / 2 -
    (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * e_prime_sq) * Math.pow(D, 4) / 24 +
    (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * e_prime_sq - 3 * C1 * C1) * Math.pow(D, 6) / 720
  );

  const lng = lon0 + (
    D -
    (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6 +
    (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * e_prime_sq + 24 * T1 * T1) * Math.pow(D, 5) / 120
  ) / cosPhi1;

  return {
    lat: Number((lat * R2D).toFixed(6)),
    lng: Number((lng * R2D).toFixed(6))
  };
}

/**
 * 주소(도로명 또는 지번)로부터 WGS84 위도/경도 초고속 단일 조회
 * @param {string} keyword - 주소
 * @param {string} defaultSido - 관할 시도 (기본: 인천광역시)
 * @param {string} defaultSgg - 관할 시군구 (기본: 서구)
 */
export async function getSgisCoordinates(keyword, defaultSido = '인천광역시', defaultSgg = '서구') {
  if (!keyword || !keyword.trim()) return null;

  try {
    let token = await getSgisAccessToken();
    if (!token) return null;

    const cleanKw = keyword.trim();
    let geocodeUrl = `${SGIS_CONFIG.GEOCODE_URL}?accessToken=${token}&address=${encodeURIComponent(cleanKw)}&pagenum=0&resultcount=5`;
    let data = await fetchViaProxy(geocodeUrl);

    if (data && (data.errCd === -4001 || data.errCd === -4002)) {
      cachedAccessToken = null;
      tokenIssuedTime = 0;
      token = await getSgisAccessToken();
      if (token) {
        geocodeUrl = `${SGIS_CONFIG.GEOCODE_URL}?accessToken=${token}&address=${encodeURIComponent(cleanKw)}&pagenum=0&resultcount=5`;
        data = await fetchViaProxy(geocodeUrl);
      }
    }

    if (!data || data.errCd !== 0 || !data.result || !Array.isArray(data.result.resultdata) || data.result.resultdata.length === 0) {
      const combinedKw = (cleanKw.startsWith(defaultSido) || cleanKw.startsWith(defaultSido.slice(0, 2)))
        ? cleanKw 
        : `${defaultSido} ${defaultSgg} ${cleanKw}`.trim();
      
      if (combinedKw !== cleanKw) {
        const fallbackUrl = `${SGIS_CONFIG.GEOCODE_URL}?accessToken=${token}&address=${encodeURIComponent(combinedKw)}&pagenum=0&resultcount=5`;
        const fallbackData = await fetchViaProxy(fallbackUrl);
        if (fallbackData && fallbackData.errCd === 0 && fallbackData.result && Array.isArray(fallbackData.result.resultdata) && fallbackData.result.resultdata.length > 0) {
          data = fallbackData;
        }
      }
    }

    if (data && data.result && Array.isArray(data.result.resultdata) && data.result.resultdata.length > 0) {
      const first = data.result.resultdata[0];
      if (first.x && first.y) {
        const wgs = utmkToWgs84(first.x, first.y);
        if (wgs.lat && wgs.lng) {
          return {
            lat: Number(wgs.lat.toFixed(6)),
            lng: Number(wgs.lng.toFixed(6))
          };
        }
      }
    }
    return null;
  } catch (e) {
    console.warn('[SGIS] 좌표 변환 실패:', e);
    return null;
  }
}
