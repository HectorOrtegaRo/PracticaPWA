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
      if (res.ok) {
        syncedIds.push(e.id);
      }
    } catch (err) {
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

  const stillPending = (await getPendingEntries()).length;
  if (stillPending && 'sync' in self.registration) {
    try { await self.registration.sync.register('sync-entries'); } catch {}
  }
}

self.addEventListener('message', async (ev) => {
  if (ev.data === 'try-sync-now') {
    await syncEntries();
  }
});
