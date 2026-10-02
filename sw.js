// sw.js — offline-first service worker for Cosmic Survivor (PWA).
const CACHE = 'cosmic-survivor-v2.0.0';

const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './assets/icon.svg',
  './src/main.js',
  './src/engine/utils.js',
  './src/engine/input.js',
  './src/engine/audio.js',
  './src/engine/particles.js',
  './src/engine/camera.js',
  './src/engine/storage.js',
  './src/game/config.js',
  './src/game/elements.js',
  './src/game/upgrades.js',
  './src/game/enemies.js',
  './src/game/player.js',
  './src/game/world.js',
  './src/game/background.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  e.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => {
          if (request.mode === 'navigate') return caches.match('./index.html');
          return new Response('', { status: 504 });
        });
    })
  );
});
