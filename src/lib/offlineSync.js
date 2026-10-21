const DB_NAME = 'crm-offline';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveOffline(key, data) {
  try {
    const db = await openDB();
    const tx = db.transaction('cache', 'readwrite');
    tx.objectStore('cache').put({ key, data, ts: Date.now() });
  } catch { /* silencioso — no bloquear si IndexedDB no está disponible */ }
}

export async function loadOffline(key) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const req = db.transaction('cache', 'readonly').objectStore('cache').get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

const SYNC_ENDPOINTS = [
  '/api/precios',
  '/api/modelos-grapa',
  '/api/config',
  '/api/pricing/margenes',
  '/api/productos?limit=500&activo=true',
];

export const SYNC_TS_KEY = '__movil_sync_ts';

export async function syncAll() {
  const results = await Promise.allSettled(
    SYNC_ENDPOINTS.map(url =>
      fetch(url)
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(data => saveOffline(url, data))
    )
  );
  const ok = results.filter(r => r.status === 'fulfilled').length;
  if (ok > 0) await saveOffline(SYNC_TS_KEY, { ts: Date.now() });
  return { ok, total: SYNC_ENDPOINTS.length };
}
