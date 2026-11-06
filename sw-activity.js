/**
 * @file sw-activity.js
 * @description 부평 시니어안심살핌 (사업단 활동 전용) PWA Service Worker (Network-First & Offline Fallback)
 */

const CACHE_NAME = 'bupyeong-activity-v1.0.0';

const URLS_TO_CACHE = [
  '/pages/pwa-activity.html',
  '/manifest-activity.json',
  '/favicon.ico',
  '/css/common.css',
  '/css/pwa.css',
  '/img/부평구.png',
  '/img/logo@4x.png',
  '/img/icons/icon-192.png',
  '/img/icons/icon-512.png',
  '/lib/html2pdf.bundle.min.js',
  '/js/pwa-activity/activityApp.js',
  '/js/pwa-activity/activityService.js',
  '/js/pwa-activity/step1RegistrationView.js',
  '/js/pwa-activity/step2TargetScheduleView.js',
  '/js/pwa-activity/step3WorkDutyView.js',
  '/js/pwa-activity/step4ReportConfirmView.js',
  '/js/pwa-activity/step5CheckoutView.js',
  '/js/utils/notifier.js',
  '/js/utils/signaturePad.js'
];

// Install: 사업단 핵심 자산 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate: 구버전 캐시 정리 (부평 사업단 전용 캐시 관리)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key.startsWith('bupyeong-activity-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-First 전략
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API는 네트워크 직접 호출
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({
          error: '네트워크 연결이 오프라인 상태입니다.',
          offline: true
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
      })
    );
    return;
  }

  // HTML / 정적 파일: Network-First with Cache Fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/pages/pwa-activity.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});
