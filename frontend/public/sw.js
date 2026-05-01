/* CAS Service Portal — minimale service worker.
 *
 * Strategie:
 *  - HTML (pagina-load / refresh): network-first, daarna cache als fallback offline.
 *    Zo zie je na een deploy meteen de nieuwe bundle; cache-first op index.html
 *    zorgde ervoor dat clients eeuwig op oude main.*.js bleven hangen.
 *  - Overige same-origin GET (JS/CSS/fonts/icons): cache-first, network fallback.
 *  - /api/*: niet afhandelen — altijd normale browser-fetch (live data).
 *
 * Bump CACHE_VERSION alleen als je de SW-logica zelf wijzigt (dan oude caches wissen).
 */

const CACHE_VERSION = 'cas-shell-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

function wantsDocument(req) {
  if (req.mode === 'navigate') return true;
  const accept = req.headers.get('accept') || '';
  return accept.includes('text/html');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (url.pathname.startsWith('/api/')) {
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  if (wantsDocument(req)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_VERSION);
        try {
          const res = await fetch(req);
          if (res && res.status === 200 && res.type === 'basic') {
            cache.put(req, res.clone());
          }
          return res;
        } catch {
          const cached =
            (await cache.match(req)) ||
            (await cache.match('/')) ||
            (await cache.match('/index.html'));
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(req);

      const networkPromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            cache.put(req, res.clone());
          }
          return res;
        })
        .catch(() => null);

      return cached || (await networkPromise) || Response.error();
    })()
  );
});
