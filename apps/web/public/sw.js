// Artist Booking Platform - Service Worker
// Enables offline functionality and caching strategies

const CACHE_VERSION = 'v1';
const CACHE_NAMES = {
  static: `static-${CACHE_VERSION}`,
  dynamic: `dynamic-${CACHE_VERSION}`,
  api: `api-${CACHE_VERSION}`,
  images: `images-${CACHE_VERSION}`,
};

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
];

/**
 * Install event: Cache static assets
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAMES.static)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

/**
 * Activate event: Clean up old caches
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(cacheName => !Object.values(CACHE_NAMES).includes(cacheName))
          .map(cacheName => caches.delete(cacheName))
      );
    })
      .then(() => self.clients.claim())
  );
});

/**
 * Fetch event: Implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Don't cache cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API requests: Network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request, CACHE_NAMES.api));
    return;
  }

  // Image assets: Cache first, fallback to network
  if (request.destination === 'image') {
    event.respondWith(cacheFirstStrategy(request, CACHE_NAMES.images));
    return;
  }

  // HTML pages: Network first, fallback to offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // Everything else: Stale while revalidate
  event.respondWith(staleWhileRevalidateStrategy(request, CACHE_NAMES.dynamic));
});

/**
 * Network first strategy: Try network, fallback to cache
 */
async function networkFirstStrategy(request, cacheName) {
  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Return cached response if network fails
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Return error response
    return new Response(
      JSON.stringify({
        success: false,
        data: null,
        errors: [{ code: 'OFFLINE', message: 'You are offline. Please check your connection.' }],
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Cache first strategy: Try cache, fallback to network
 */
async function cacheFirstStrategy(request, cacheName) {
  // Check cache first
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Return a placeholder image if network fails
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#e0e0e0" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="#999">Image</text></svg>',
      {
        headers: { 'Content-Type': 'image/svg+xml' },
      }
    );
  }
}

/**
 * Stale while revalidate strategy: Return cache immediately, update in background
 */
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request).then((response) => {
    // Cache successful responses
    if (response.ok) {
      const cache = caches.open(cacheName);
      cache.then(c => c.put(request, response.clone()));
    }
    return response;
  });

  return cached || fetchPromise;
}

/**
 * Background sync: Retry failed requests when back online
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-bookings') {
    event.waitUntil(syncPendingRequests());
  }
});

async function syncPendingRequests() {
  try {
    // Get pending requests from IndexedDB or similar
    // This is a placeholder implementation
    console.log('Syncing pending requests...');
    // Implement actual sync logic
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

/**
 * Push notifications
 */
self.addEventListener('push', (event) => {
  const options = {
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'artist-booking-notification',
    requireInteraction: false,
  };

  if (event.data) {
    try {
      const data = event.data.json();
      options.title = data.title || 'Artist Booking';
      options.body = data.body || 'You have a new notification';
      options.data = data;
    } catch {
      options.title = 'Artist Booking';
      options.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification('Artist Booking', options)
  );
});

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { data } = event.notification;
  const urlToOpen = data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if we have a window/tab already open with the target URL
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return (client as any).focus();
          }
        }
        // If not, open a new window/tab with the target URL
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

/**
 * Message handler: Allow clients to send messages to the service worker
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAMES.dynamic);
    event.ports[0].postMessage({ success: true });
  }
});
