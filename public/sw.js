const CACHE_NAME = 'ege-boss-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/icon-pwa-192.png',
  '/icon-pwa-512.png',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache, starting resilient pre-caching...');
        // Use Promise.all with individual catches so that even if one asset fails,
        // the installation of the service worker succeeds and PWA installation is not blocked.
        return Promise.all(
          urlsToCache.map(url => {
            return cache.add(url)
              .then(() => console.log(`Successfully cached: ${url}`))
              .catch(err => console.error(`Failed to cache ${url} during install:`, err));
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // STRICT EXCLUSIONS: Do NOT intercept or cache:
  // - Non-GET requests
  // - API calls (starting with /api/)
  // - Chrome extensions, WebSockets, or live-reload scripts
  if (
    event.request.method !== 'GET' ||
    !url.startsWith(self.location.origin) ||
    url.includes('/api/') ||
    url.includes('/socket.io/') ||
    url.includes('hot-update') ||
    url.includes('@vite')
  ) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          // Serve from cache and update cache in background (Stale-While-Revalidate)
          fetch(event.request)
            .then(networkResponse => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
              }
            })
            .catch(() => {});
          return response;
        }
        return fetch(event.request);
      })
  );
});
