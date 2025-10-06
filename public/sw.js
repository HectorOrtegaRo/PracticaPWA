const CACHE_NAME = 'app-shell-v1';
const RUNTIME_CACHE = 'runtime-v1';

const APP_SHELL = [
  '/',                     
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => {
        if (k !== CACHE_NAME && k !== RUNTIME_CACHE) return caches.delete(k);
      }))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  const url = new URL(req.url);
  const isStatic =
    req.destination === 'script' ||
    req.destination === 'style' ||
    req.destination === 'image' ||
    req.destination === 'font' ||
    req.destination === 'manifest';

  if (isStatic || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req).then((netRes) => {
          const copy = netRes.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
          return netRes;
        }).catch(() => cached); 
        return cached || fetchPromise;
      })
    );
  }
});
