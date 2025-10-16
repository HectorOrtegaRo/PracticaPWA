//  VERSIONADO Y NOMBRES

const VERSION = 'v3';
const STATIC_CACHE   = `static-${VERSION}`;   
const RUNTIME_CACHE  = `runtime-${VERSION}`;  
const IMAGE_CACHE    = `images-${VERSION}`;   
const OFFLINE_URL    = '/offline.html';

// APP SHELL PRECACHE
const APP_SHELL = [
  '/',                    
  '/index.html',
  '/offline.html',        
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => {
      if (![STATIC_CACHE, RUNTIME_CACHE, IMAGE_CACHE].includes(k)) {
        return caches.delete(k);
      }
    }));
  })());
  self.clients.claim();
});

function cacheFirst(req, cacheName = STATIC_CACHE) {
  return caches.match(req).then((hit) => {
    if (hit) return hit;
    return fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(cacheName).then((c) => c.put(req, copy));
      return res;
    });
  });
}

function staleWhileRevalidate(req, cacheName) {
  return caches.match(req).then((cached) => {
    const fetchPromise = fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(cacheName).then((c) => c.put(req, copy));
      return res;
    }).catch(() => cached);
    return cached || fetchPromise;
  });
}

function networkFirst(req, cacheName, fallbackResponse) {
  return fetch(req).then((res) => {
    const copy = res.clone();
    caches.open(cacheName).then((c) => c.put(req, copy));
    return res;
  }).catch(async () => {
    const cached = await caches.match(req);
    return cached || fallbackResponse || Response.error();
  });
}

const API_HOSTS = [
  'jsonplaceholder.typicode.com'
];

function isAPI(url) {
  return url.origin !== self.location.origin
    ? API_HOSTS.includes(url.hostname)
    : url.pathname.startsWith('/api/');
}

// FETCH
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;

  // Página Network-first con fallback a offline.html
  if (req.mode === 'navigate') {
    event.respondWith(
      networkFirst(req, STATIC_CACHE, caches.match(OFFLINE_URL))
    );
    return;
  }

  // App Shell cache-first
  if (APP_SHELL.includes(url.pathname)) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // APIs network-first con caché dinámico
  if (isAPI(url)) {
    event.respondWith(networkFirst(req, RUNTIME_CACHE));
    return;
  }

  //  Imágenes stale-while-revalidate
  if (req.destination === 'image') {
    event.respondWith(staleWhileRevalidate(req, IMAGE_CACHE));
    return;
  }

  // Estáticos JS/CSS/fonts/manifest
  if (
    req.destination === 'script' ||
    req.destination === 'style'  ||
    req.destination === 'font'   ||
    req.destination === 'manifest'
  ) {
    event.respondWith(staleWhileRevalidate(req, RUNTIME_CACHE));
    return;
  }

  event.respondWith(staleWhileRevalidate(req, RUNTIME_CACHE));
});

const DB_NAME = 'pwa-db';
const DB_VERSION = 1;
const STORE = 'entries';

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('by-status', 'status');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getPendingEntries() {
  const db = await openIDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly');
    const idx = tx.objectStore(STORE).index('by-status');
    const req = idx.getAll('pending');
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
    tx.oncomplete = () => db.close();
  });
}

async function markAsSynced(ids) {
  if (!ids.length) return;
  const db = await openIDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    ids.forEach((id) => {
      const g = store.get(id);
      g.onsuccess = () => {
        const item = g.result;
        if (item) {
          item.status = 'synced';
          store.put(item);
        }
      };
    });
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); resolve(); };
  });
}

const SYNC_URL = 'https://jsonplaceholder.typicode.com/posts';

async function sendToServer(entries) {
  const syncedIds = [];
  for (const e of entries) {
    try {
      const res = await fetch(SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: e.text, createdAt: e.createdAt })
      });
      if (res.ok) syncedIds.push(e.id);
    } catch (_) {
    }
  }
  return syncedIds;
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-entries') {
    event.waitUntil(syncEntries());
  }
});

async function syncEntries() {
  const pending = await getPendingEntries();
  if (!pending.length) return;

  const syncedIds = await sendToServer(pending);
  await markAsSynced(syncedIds);

  if (syncedIds.length) {
    const clientsList = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    clientsList.forEach((c) => c.postMessage({ type: 'synced', count: syncedIds.length }));
  }

  const still = (await getPendingEntries()).length;
  if (still && 'sync' in self.registration) {
    try { await self.registration.sync.register('sync-entries'); } catch {}
  }
}

self.addEventListener('message', async (ev) => {
  if (ev.data === 'try-sync-now') {
    await syncEntries();
  }
});

// Eventos push

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: 'PWA', body: event.data ? event.data.text() : 'Mensaje' };
  }

  const title = data.title || 'Notificación';
  const options = {
    body: data.body || 'Tienes un nuevo mensaje',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification?.data?.url || '/';

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const had = allClients.find((client) => new URL(client.url).pathname === urlToOpen);
    if (had) return had.focus();
    return self.clients.openWindow(urlToOpen);
  })());
});

self.addEventListener('pushsubscriptionchange', (event) => {
});
