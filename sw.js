// Service Worker for Cosmic Survivor
// Implements offline caching with cache-first strategy

const CACHE_NAME = 'cosmic-survivor-v1';
const urlsToCache = [
  '/',
  '/index-enhanced.html',
  '/index.html',
  '/main.js',
  '/game.js',
  '/styles.css',
  '/js/config.js',
  '/js/game.js',
  '/js/entities/player.js',
  '/js/entities/enemyTypes.js',
  '/js/entities/bossTypes.js',
  '/js/weapons/weaponSystem.js',
  '/js/systems/highscore.js',
  '/js/systems/sound.js',
  '/js/systems/touchControls.js',
  '/js/systems/achievements.js'
];

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - cache-first strategy for static assets
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return cached response
        if (response) {
          console.log('[SW] Serving from cache:', event.request.url);
          return response;
        }
        
        // Not in cache - fetch from network
        console.log('[SW] Fetching from network:', event.request.url);
        return fetch(event.request).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          // Cache the fetched response for future use
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
      .catch(error => {
        console.error('[SW] Fetch failed:', error);
        // Return offline page if available
        return caches.match('/index-enhanced.html');
      })
  );
});

// Handle messages from the client
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
