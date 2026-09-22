// TRAVEL GUARDIAN SERVICE WORKER (PHASE 8)
// Cache Version: travel-guardian-static-v8
const CACHE_VERSION = 'travel-guardian-v8';
const STATIC_CACHE = `travel-guardian-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `travel-guardian-runtime-${CACHE_VERSION}`;

// Application shell assets required for offline boot
const APP_SHELL = [
  '/',
  '/plan',
  '/map',
  '/emergency',
  '/offline',
  '/offline-mode',
  '/assist',
  '/settings',
  '/manifest.json',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
];

// Install Event — Pre-cache Application Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Use catch on each entry so one missing dev asset doesn't fail entire install
      return Promise.allSettled(
        APP_SHELL.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] Pre-caching failed for: ${url}`, err);
          })
        )
      );
    })
  );
  // Do not self.skipWaiting() automatically to protect active navigation sessions
});

// Activate Event — Clean up obsolete Service Worker caches
// Note: This operates strictly on CacheStorage and never touches IndexedDB
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!currentCaches.includes(cacheName) && cacheName.startsWith('travel-guardian-')) {
            console.log(`[SW] Pruning obsolete cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event — Controlled Multi-Tier Caching Strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Skip non-GET requests and browser extensions
  if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // 2. API Routes: Network-First with graceful offline fallback
  // CRITICAL: Never cache private tokens or secrets
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({
            error: 'Network connection unavailable. Operating in truthful offline mode.',
            offline: true,
            timestamp: new Date().toISOString(),
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      })
    );
    return;
  }

  // 3. Static Assets (_next/static, icons, fonts): Cache-First Strategy
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        }).catch(() => {
          // Return empty or fallback if asset fetch fails offline
          return new Response('', { status: 408, statusText: 'Offline asset unavailable' });
        });
      })
    );
    return;
  }

  // 4. HTML Page Navigation: Network-First with Cache Fallback for Offline Boot
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Try matched page from runtime or static cache
          const cachedPage = await caches.match(event.request);
          if (cachedPage) {
            return cachedPage;
          }
          // Fallback to offline portal or root shell
          const offlinePortal = await caches.match('/offline-mode');
          if (offlinePortal) {
            return offlinePortal;
          }
          const rootShell = await caches.match('/');
          if (rootShell) {
            return rootShell;
          }
          return new Response(
            `<!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Travel Guardian — Offline</title>
                <style>
                  body { background: #0a0f1d; color: #f8fafc; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; text-align: center; }
                  .card { max-width: 440px; background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 32px 24px; }
                  h1 { color: #10b981; font-size: 1.5rem; margin-bottom: 8px; }
                  p { color: #9ca3af; font-size: 0.95rem; line-height: 1.5; }
                  .btn { display: inline-block; margin-top: 16px; padding: 12px 24px; background: #059669; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; }
                </style>
              </head>
              <body>
                <div class="card">
                  <h1>Travel Guardian Offline</h1>
                  <p>You are currently offline. Your cached survival packs and emergency protocols remain accessible.</p>
                  <a href="/offline-mode" class="btn">Open Offline Survival Hub</a>
                </div>
              </body>
            </html>`,
            {
              status: 200,
              headers: { 'Content-Type': 'text/html' },
            }
          );
        })
    );
    return;
  }

  // 5. Default: Network-First with Cache fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Message Listener for User-Triggered Updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
