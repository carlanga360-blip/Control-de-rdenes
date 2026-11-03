/* Service worker: permite usar el formulario sin conexión en campo */
const CACHE = 'infocom-v1';
const ASSETS = [
  './',
  'index.html',
  'css/styles.css',
  'js/config.js',
  'js/db.js',
  'js/widgets.js',
  'js/form.js',
  'js/dashboard.js',
  'js/app.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.all(ASSETS.map((a) => c.add(a).catch(() => null))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Teselas de mapa: red primero, sin caché persistente
  if (url.hostname.endsWith('tile.openstreetmap.org')) return;
  // Red primero para la app (actualizaciones), caché como respaldo sin conexión
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && (url.origin === location.origin || ASSETS.includes(req.url))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('index.html')))
  );
});
