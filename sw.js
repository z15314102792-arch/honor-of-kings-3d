const CACHE_NAME = 'moba-kings-v3.2.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css?v=3.2.0',
  './js/three.min.js?v=3.2.0',
  './js/bundle.js?v=3.2.0',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png'
];


self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) {
            console.log('Purging old cache:', k);
            return caches.delete(k);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-First strategy: Always try to fetch freshest version first, fallback to cache if offline
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(e.request))
  );
});

