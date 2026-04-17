// Service Worker — Phase 7
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => clients.claim());
