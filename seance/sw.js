// Cache hors ligne : réseau en priorité, cache en secours.
const CACHE = 'seance-v12';
const FILES = ['./', 'index.html', 'style.css', 'js/app.js', 'js/data.js', 'js/forme.js', 'js/muscu.js', 'js/run.js',
  'js/timer.js', 'js/game.js', 'js/ai.js', 'js/manga.js', 'js/hero.js', 'js/sante.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'data/paliers/paliers.json', 'data/running/paliers.json', ...[1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100].map(n => `data/running/niveau-${String(n).padStart(3, '0')}.jpg`), ...[1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100].map(n => `data/paliers/niveau-${String(n).padStart(3, '0')}.jpg`)];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'api.anthropic.com') return;
  if (url.origin !== location.origin && url.hostname !== 'cdn.jsdelivr.net') return;
  e.respondWith(
    fetch(req).then(r => {
      if (r.ok || r.type === 'opaque') { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return r;
    }).catch(() => caches.match(req, { ignoreSearch: true })
      .then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
