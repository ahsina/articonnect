/**
 * Krafolt Custom Service Worker
 * Provides offline capabilities and push notification handling
 */

const CACHE_NAME = 'articonnect-v1';
const OFFLINE_URL = '/offline';

// Static assets to cache immediately
const STATIC_CACHE_URLS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// API routes that should be cached with network-first strategy
const API_CACHE_PATTERNS = [
  '/api/user/profile',
  '/api/artisan/profile',
  '/api/missions',
  '/api/notifications',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_CACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network-first with cache fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // API requests - Network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses for offline
          if (response.ok && shouldCacheApiRoute(url.pathname)) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Try to return cached response
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return offline JSON response for API
          return new Response(
            JSON.stringify({ error: 'offline', message: 'No internet connection' }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        })
    );
    return;
  }

  // Page requests - Network first, offline page fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful page responses
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(async () => {
          // Try cached version first
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback to offline page
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // Static assets - Cache first, network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cache and update in background
        fetch(request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, response);
            });
          }
        });
        return cachedResponse;
      }
      return fetch(request).then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      });
    })
  );
});

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  const data = event.data.json();
  const options = {
    body: data.body || data.message,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || data.link || '/',
      ...data.data,
    },
    actions: data.actions || [
      { action: 'open', title: 'Ouvrir' },
      { action: 'dismiss', title: 'Ignorer' },
    ],
    tag: data.tag || 'articonnect-notification',
    renotify: true,
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already an open window
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-missions') {
    event.waitUntil(syncMissions());
  }
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

// Sync pending mission actions
async function syncMissions() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const pendingActions = await cache.match('pending-mission-actions');

    if (pendingActions) {
      const actions = await pendingActions.json();

      for (const action of actions) {
        await fetch(action.url, {
          method: action.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.body),
        });
      }

      // Clear pending actions
      await cache.delete('pending-mission-actions');
    }
  } catch (error) {
    console.error('[SW] Failed to sync missions:', error);
  }
}

// Sync pending chat messages
async function syncMessages() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const pendingMessages = await cache.match('pending-messages');

    if (pendingMessages) {
      const messages = await pendingMessages.json();

      for (const message of messages) {
        await fetch('/api/chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message),
        });
      }

      // Clear pending messages
      await cache.delete('pending-messages');
    }
  } catch (error) {
    console.error('[SW] Failed to sync messages:', error);
  }
}

// Helper function to check if API route should be cached
function shouldCacheApiRoute(pathname) {
  return API_CACHE_PATTERNS.some((pattern) => pathname.includes(pattern));
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-missions') {
    event.waitUntil(updateMissionsCache());
  }
});

// Update missions cache in background
async function updateMissionsCache() {
  try {
    const response = await fetch('/api/missions?limit=20');
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put('/api/missions?limit=20', response);
    }
  } catch (error) {
    console.error('[SW] Failed to update missions cache:', error);
  }
}

console.log('[SW] Krafolt Service Worker loaded');
