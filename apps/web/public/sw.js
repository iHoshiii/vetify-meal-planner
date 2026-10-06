const CACHE = 'vetify-planner-shell-v1';
const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg', '/icon-192.png', '/icon-512.png'];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const asset = /^\/assets\/[^/]+\.(?:js|css|woff2?|png|svg)$/.test(url.pathname);
  if (!asset && !SHELL.includes(url.pathname)) return;
  if (event.request.headers.has('authorization')) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      try {
        const response = await fetch(event.request);
        if (response.ok && response.type === 'basic')
          await cache.put(event.request, response.clone());
        return response;
      } catch (error) {
        const saved = await cache.match(event.request);
        if (saved) return saved;
        throw error;
      }
    }),
  );
});
