/**
 * @file sw.js
 * @description 부평구 통합돌봄 PWA 서비스 워커 (Service Worker)
 * - iOS Safari (WebKit) 호환성 및 네트워크 음영지역 완전 오프라인 캐싱 지원
 * - Network-First with Cache Fallback 전략 (실시간 최신 버전 유지 + 오프라인 즉시 구동)
 */

const CACHE_NAME = 'bupyeong-seniorcare-v3.8.3';

// 핵심 정적 자산 프리캐시 목록
const PRECACHE_ASSETS = [
  '/',
  '/pages/pwa-survey.html',
  '/manifest.json',
  '/favicon.ico',
  '/css/common.css',
  '/css/pwa.css',
  '/img/부평구.png',
  '/img/logo@4x.png',
  '/img/incheon_intro_logo.png',
  '/img/incheon_city_symbol.png',
  '/img/incheon_signature_koren.png',
  '/img/incheon_signature_kor.png',
  '/img/icons/icon-192.png',
  '/img/icons/icon-512.png',
  '/img/icons/icon-maskable.png',
  '/img/icons/apple-touch-icon.png',
  '/img/BP-survey-qr.png',
  '/img/pwa-survey-qr.png',
  '/lib/html2pdf.bundle.min.js',
  '/lib/exceljs.min.js',
  '/js/api/apiClient.js',
  '/js/core/mask.js',
  '/js/core/uid.js',
  '/js/utils/date.js',
  '/js/utils/notifier.js',
  '/js/utils/signaturePad.js',
  '/js/pwa/bupyeongPwaView.js',
  '/js/pwa/steps/step1BasicView.js',
  '/js/pwa/steps/step2TargetView.js',
  '/js/pwa/steps/step3ActivityCardView.js',
  '/js/pwa/steps/step3BasicSurveyView.js',
  '/js/pwa/steps/step4MonitoringView.js',
  '/js/pwa/steps/step5SatisfactionView.js',
  '/js/pwa/steps/step6ConsentView.js',
  '/js/pwa/steps/step7CompleteView.js'
];

// 1. Install Event: 개별 자산 안전 캐싱 (한 파일 실패 시에도 전체 중단 방지)
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[Service Worker] 프리캐싱 시작:', CACHE_NAME);
      for (const url of PRECACHE_ASSETS) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            await cache.put(url, res);
          }
        } catch (e) {
          // 설치 중 개별 파일 네트워크 오류 무시 (점진적 캐시 구성)
          console.warn('[Service Worker] 캐시 프리로드 생략:', url);
        }
      }
    })
  );
});

// 2. Activate Event: 구버전 캐시 정리 및 클라이언트 즉시 제어권 획득
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] 이전 캐시 삭제:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Network-First with Cache Fallback (iOS WebKit 방어 코드 내장)
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // iOS Safari / Chrome 익스텐션 등 비표준 scheme 배제
  if (!req.url.startsWith('http')) return;

  // API 통신은 ApiClient 내부 오프라인 큐가 처리하므로 SW 캐시 우회
  if (req.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        // 완전한 200 OK 응답만 캐시에 저장 (iOS Safari 206 Partial Content 방어)
        if (networkRes && networkRes.status === 200 && req.method === 'GET') {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, resClone);
          });
        }
        return networkRes;
      })
      .catch(async () => {
        // 네트워크 단절 / 오프라인 시 캐시 응답
        const cachedRes = await caches.match(req);
        if (cachedRes) {
          return cachedRes;
        }

        // HTML 페이지 탐색 요청 실패 시 기본 PWA 메인 화면 제공
        if (req.mode === 'navigate') {
          const fallbackPage = await caches.match('/pages/pwa-survey.html');
          if (fallbackPage) {
            return fallbackPage;
          }
        }

        return new Response('오프라인 상태입니다. 네트워크 연결을 확인해주세요.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
  );
});
