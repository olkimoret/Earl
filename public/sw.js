const CACHE = 'earl-v1';
const SHELL = ['/', '/index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
  // Always go network-first for API calls — never serve stale responses
  if (e.request.url.includes('/api/') || e.request.url.includes('/.netlify/')) return;

  // Cache-first for the app shell and static assets
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
