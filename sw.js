// MOVE Rehab service worker: makes the app installable and work offline.
// Pages: network first (fresh deploys), falling back to the cached shell.
// Static assets (JS/CSS/models/wasm/fonts): cache first, filled as used.
// The AI chat API is never cached.
const CACHE = 'move-rehab-v3';
// works at a domain root or in a sub-folder (e.g. GitHub Pages /move-rehab/)
const B = new URL(self.registration.scope).pathname;
const SHELL = [B, B + 'manifest.webmanifest', B + 'icons/icon-192.png', B + 'icons/icon-512.png', B + 'move-logo-white.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.startsWith(B + 'api/')) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(B, copy));
        return res;
      }).catch(() => caches.match(B)),
    );
    return;
  }

  const cacheable = url.origin === self.location.origin
    || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)
    || url.hostname === 'storage.googleapis.com';
  if (!cacheable) return;
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    })),
  );
});
