// Service Worker for Cosmic Survivor
// Implements offline caching with network-first strategy for HTML files

// CACHE_VERSION should be updated by build process
// This ensures cache invalidation on deployments
const CACHE_VERSION = '__BUILD_TIMESTAMP__'; // Will be replaced during build
const CACHE_NAME = `cosmic-survivor-${CACHE_VERSION}`;

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
  '/js/weapons/weaponBase.js',
  '/js/weapons/evolutions/meteorStrike.js',
  '/js/systems/highscore.js',
  '/js/systems/sound.js',
  '/js/systems/touchControls.js',
  '/js/systems/achievements.js',
  '/js/systems/weaponEvolutionSystem.js'
];

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker version:', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] Cache populated, skipping waiting');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches and notify clients
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker version:', CACHE_VERSION);
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
    }).then(() => {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    }).then(() => {
      // Notify all clients about the new version
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_UPDATED',
            version: CACHE_VERSION
          });
        });
      });
    })
  );
});

// Determine if a request is for an HTML file
function isHtmlRequest(request) {
  const url = new URL(request.url);
  return request.destination === 'document' || 
         url.pathname.endsWith('.html') || 
         url.pathname === '/';
}

// Fetch event - network-first for HTML, cache-first for other assets
self.addEventListener('fetch', event => {
  const isHtml = isHtmlRequest(event.request);
  
  if (isHtml) {
    // Network-first strategy for HTML files
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Check if valid response
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(error => {
          console.log('[SW] Network failed for HTML, serving from cache:', event.request.url);
          // Fallback to cache if network fails
          return caches.match(event.request).then(cachedResponse => {
            return cachedResponse || caches.match('/index-enhanced.html');
          });
        })
    );
  } else {
    // Cache-first strategy for static assets (JS, CSS, images, etc.)
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          
          // Not in cache - fetch from network
          return fetch(event.request).then(response => {
            // Check if valid response
            if (!response || response.status !== 200) {
              return response;
            }
            
            // Clone and cache the response
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
            
            return response;
          });
        })
        .catch(error => {
          console.error('[SW] Fetch failed:', error);
          return new Response('Offline - resource not available', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        })
    );
  }
});

// Handle messages from the client
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
