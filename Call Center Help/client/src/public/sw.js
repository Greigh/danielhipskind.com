// Service Worker for Adamas
const CACHE_NAME = 'adamas-v1.0.0';
const STATIC_CACHE = 'adamas-static-v1.0.0';
const DYNAMIC_CACHE = 'adamas-dynamic-v1.0.0';

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/src/index.html',
  '/src/js/main.js',
  '/src/js/modules/storage.js',
  '/src/js/modules/settings.js',
  '/src/js/modules/notes.js',
  '/src/js/modules/patterns.js',
  '/src/js/modules/timer.js',
  '/src/js/modules/themes.js',
  '/src/js/modules/floating.js',
  '/src/js/modules/draggable.js',
  '/src/js/modules/callflow.js',
  '/src/js/utils/app-globals.js',
  '/src/js/utils/app-state.js',
  '/src/js/utils/audio.js',
  '/src/js/utils/form-fixer.js',
  '/src/js/utils/helpers.js',
  '/src/js/utils/keyboard-shortcuts.js',
  '/src/styles/main.css',
  '/src/styles/main.scss',
  '/src/public/download-alert-sounds.sh',
  '/src/public/audio/',
  // Add manifest and icons when available
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing service worker');
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log('[Service Worker] Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .catch((error) => {
        console.error('[Service Worker] Error caching static files:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating service worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip external requests
  if (!url.origin.includes(self.location.origin)) return;

  // Skip webpack development files
  if (
    url.pathname.includes('.hot-update.') ||
    url.pathname.includes('__webpack_hmr') ||
    url.pathname.startsWith('/sockjs-node/')
  ) {
    return;
  }

  // Handle API requests differently
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.ok) {
            const responseClone = response.clone();
            caches
              .open(DYNAMIC_CACHE)
              .then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Return cached API response if available
          return caches.match(request);
        })
    );
    return;
  }

  // Cache-first strategy for static files
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // Network-first for HTML files
      if (request.destination === 'document') {
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const responseClone = response.clone();
              caches
                .open(DYNAMIC_CACHE)
                .then((cache) => cache.put(request, responseClone));
            }
            return response;
          })
          .catch(() => {
            // Return offline fallback
            return caches.match('/src/index.html');
          });
      }

      // Network-first for other requests
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches
              .open(DYNAMIC_CACHE)
              .then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Return cached version if available
          return caches.match(request);
        });
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync triggered:', event.tag);

  if (event.tag === 'background-sync-notes') {
    event.waitUntil(syncNotes());
  }

  if (event.tag === 'background-sync-settings') {
    event.waitUntil(syncSettings());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);

  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);

  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(clients.openWindow(event.notification.data.url || '/'));
  } else {
    // Default action - open the app
    event.waitUntil(clients.openWindow('/'));
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('[Service Worker] Periodic sync triggered:', event.tag);

  if (event.tag === 'periodic-sync-data') {
    event.waitUntil(syncAllData());
  }
});

// Helper functions for data synchronization
async function syncNotes() {
  try {
    // Get pending notes from IndexedDB or similar
    const pendingNotes = await getPendingNotes();

    for (const note of pendingNotes) {
      // Sync with server (placeholder)
      await syncNoteWithServer(note);
    }

    // Clear pending notes
    await clearPendingNotes();
  } catch (error) {
    console.error('[Service Worker] Error syncing notes:', error);
  }
}

async function syncSettings() {
  try {
    // Sync settings with server (placeholder)
    const settings = await getLocalSettings();
    await syncSettingsWithServer(settings);
  } catch (error) {
    console.error('[Service Worker] Error syncing settings:', error);
  }
}

async function syncAllData() {
  await Promise.all([syncNotes(), syncSettings()]);
}

// Placeholder functions for data operations
async function getPendingNotes() {
  // Implementation would depend on your data storage strategy
  return [];
}

async function syncNoteWithServer() {
  // Implementation would depend on your backend API
  return Promise.resolve();
}

async function clearPendingNotes() {
  // Implementation would depend on your data storage strategy
  return Promise.resolve();
}

async function getLocalSettings() {
  // Implementation would depend on your settings storage
  return {};
}

async function syncSettingsWithServer() {
  // Implementation would depend on your backend API
  return Promise.resolve();
}

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});
