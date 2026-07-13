/**
 * ricehub Service Worker
 * Provides offline support, caching strategies, and background sync
 * Version: 1.0.0
 */

const CACHE_NAME = 'ricehub-v1';
const STATIC_CACHE = 'ricehub-static-v1';
const DYNAMIC_CACHE = 'ricehub-dynamic-v1';
const IMAGE_CACHE = 'ricehub-images-v1';

// Files to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/robots.txt',
  '/sitemap.xml',
  '/rss.xml',
  '/atom.xml',
  '/feed.json',
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Cache first - for static assets
  CACHE_FIRST: 'cache-first',
  // Network first - for API calls and dynamic content
  NETWORK_FIRST: 'network-first',
  // Stale while revalidate - for images and content
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  // Network only - for auth and mutations
  NETWORK_ONLY: 'network-only',
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
      })
      .then(() => {
        console.log('[SW] Static assets cached');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Failed to cache static assets:', err);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== IMAGE_CACHE)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http schemes
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Determine caching strategy based on request
  let strategy = CACHE_STRATEGIES.NETWORK_FIRST;
  
  // Static assets - cache first
  if (isStaticAsset(url)) {
    strategy = CACHE_STRATEGIES.CACHE_FIRST;
  }
  // Images - stale while revalidate
  else if (isImageRequest(request)) {
    strategy = CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
  }
  // API calls - network first
  else if (isApiRequest(url)) {
    strategy = CACHE_STRATEGIES.NETWORK_FIRST;
  }
  // HTML pages - stale while revalidate
  else if (request.headers.get('accept')?.includes('text/html')) {
    strategy = CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
  }
  
  event.respondWith(handleRequest(request, strategy));
});

// Handle request with appropriate strategy
async function handleRequest(request, strategy) {
  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request);
    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request);
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request);
    case CACHE_STRATEGIES.NETWORK_ONLY:
      return networkOnly(request);
    default:
      return networkFirst(request);
  }
}

// Cache first strategy
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Cache first failed:', error);
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Network first strategy
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error);
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Stale while revalidate strategy
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  
  // Fetch in background
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        const cacheName = isImageRequest(request) ? IMAGE_CACHE : DYNAMIC_CACHE;
        return caches.open(cacheName).then((cache) => {
          cache.put(request, response.clone());
          return response;
        });
      }
      return response;
    })
    .catch(() => cached); // Return cached if network fails
  
  // Return cached immediately if available
  if (cached) {
    return cached;
  }
  
  // Otherwise wait for network
  return fetchPromise;
}

// Network only strategy
async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch (error) {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Helper functions
function isStaticAsset(url) {
  return url.pathname.match(/\.(js|css|woff2?|ttf|eot|ico|svg|png|jpg|jpeg|gif|webp|avif)$/i) ||
         url.pathname === '/' ||
         url.pathname === '/index.html';
}

function isImageRequest(request) {
  return request.destination === 'image' || 
         request.headers.get('accept')?.includes('image/');
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/') ||
         url.hostname.includes('firebase') ||
         url.hostname.includes('firestore') ||
         url.hostname.includes('identitytoolkit');
}

// Background sync for offline mutations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-posts') {
    event.waitUntil(syncPosts());
  } else if (event.tag === 'sync-likes') {
    event.waitUntil(syncLikes());
  } else if (event.tag === 'sync-comments') {
    event.waitUntil(syncComments());
  }
});

async function syncPosts() {
  console.log('[SW] Syncing offline posts...');
  // Implementation would read from IndexedDB and sync to Firebase
}

async function syncLikes() {
  console.log('[SW] Syncing offline likes...');
}

async function syncComments() {
  console.log('[SW] Syncing offline comments...');
}

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Dismiss' },
    ],
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-feeds') {
    event.waitUntil(updateFeeds());
  }
});

async function updateFeeds() {
  console.log('[SW] Updating feeds in background...');
  // Fetch latest posts and update caches
}

console.log('[SW] Service worker loaded');