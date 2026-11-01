// Bump VERSION whenever any game file changes so devices pick up the new copy.
const VERSION = 'pocket-grains-v4';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache first: the game always opens from the device, even in airplane mode.
// Opening the game: try the network briefly so updates show at once, else use the saved copy.
function openGame(req) {
  const timeout = new Promise((_, reject) => setTimeout(reject, 2500));
  return Promise.race([fetch(req, { cache: 'no-cache' }), timeout])
    .then((res) => {
      if (!res.ok) throw new Error(res.status);
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put('./index.html', copy));
      return res;
    })
    .catch(() => caches.match('./index.html'));
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (e.request.mode === 'navigate') return e.respondWith(openGame(e.request));
  // Everything else (icons, manifest): saved copy first.
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).catch(() =>
        e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()
      );
    })
  );
});
