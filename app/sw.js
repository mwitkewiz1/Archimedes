// sw.js — caches the app so it opens with no signal. Bump VERSION whenever
// any file below changes, or phones keep the old copy.
const VERSION = 'archimedes-v16';
const FILES = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'icons/icon.svg',
  'js/app.js',
  'js/ui/el.js',
  'js/ui/frac.js',
  'js/ui/store.js',
  'js/ui/calc.js',
  'js/ui/cut.js',
  'js/ui/draw.js',
  'js/ui/help.js',
  'js/ui/fusion.js',
  'js/ui/pipes.js',
  'js/ui/ohm.js',
  'js/ui/wire.js',
  'js/ui/subnav.js',
  'js/ui/symbols.js',
  'js/ui/pump.js',
  'js/ui/curve.js',
  'js/ui/kinds.js',
  'js/ui/pumpart.js',
  'js/core/measure.js',
  'js/core/expr.js',
  'js/core/cut.js',
  'js/core/fusion.js',
  'js/core/ohm.js',
  'js/core/wire.js',
  'js/core/symbols.js',
  'js/core/pump.js',
  'js/core/kinds.js',
  'js/core/choose.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// Network first (so updates show up), cache when offline.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
