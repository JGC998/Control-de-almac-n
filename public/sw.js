// Service Worker para el modo tablet — permite cargar /tablet sin conexión.
// Estrategia: Network-first para navegación; Cache-first para assets estáticos.
// Las llamadas a /api/* siempre van a la red (nunca se cachean).

const CACHE = 'crm-tablet-v1';

// Páginas a pre-cachear en la instalación
const PRECACHE = ['/tablet'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // API: siempre red, nunca caché
  if (url.pathname.startsWith('/api/')) return;

  // Navegación a /tablet: network-first con fallback a caché
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          // Actualiza la caché con la respuesta fresca
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Assets estáticos (_next/static): cache-first
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(request).then(
        (cached) => cached || fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
          return res;
        })
      )
    );
  }
});
