// sw.js — offline-first service worker for Cosmic Survivor (PWA).
//
// CACHE is derived from VERSION. `tools/build.mjs` stamps VERSION with a content
// hash of the built site at deploy time, so every release gets a brand-new cache
// name: `activate` then deletes the previous cache and every client is handed the
// fresh build instead of a stale one. VERSION stays 'dev' for un-built local runs.
const VERSION = 'dev';
const CACHE = `cosmic-survivor-${VERSION}`;

// Core app shell — everything required to boot and play fully offline.
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
  './src/engine/sprites.js',
  './src/engine/storage.js',
  './src/game/config.js',
  './src/game/elements.js',
  './src/game/upgrades.js',
  './src/game/weapons.js',
  './src/game/enemies.js',
  './src/game/enemyArt.js',
  './src/game/player.js',
  './src/game/world.js',
  './src/game/background.js',
  './src/game/ships.js',
  './src/game/meta.js',
  './src/game/modifiers.js',
  './src/game/achievements.js',
];

// Precache the shell straight from the network. `cache: 'reload'` bypasses the
// HTTP cache so a fresh deploy never captures stale files, and allSettled keeps a
// single failed asset from blocking activation (the fetch handler backfills it).
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(ASSETS.map((url) => c.add(new Request(url, { cache: 'reload' })))))
      .then(() => self.skipWaiting())
  );
});

// Drop every cache that isn't the current VERSION, then take control immediately.
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return; // ignore cross-origin

  // Navigations: network-first so a new deploy loads immediately, falling back to
  // the cached shell when offline.
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  // Static assets: stale-while-revalidate. Serve the cached copy instantly, then
  // refresh it in the background. `cache: 'no-cache'` forces a real revalidation
  // instead of reading the browser's HTTP cache, so the next load is up to date.
  e.respondWith(
    caches.match(request).then((cached) => {
      const fresh = fetch(new Request(request, { cache: 'no-cache' }))
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached || new Response('', { status: 504, statusText: 'Offline' }));
      return cached || fresh;
    })
  );
});
