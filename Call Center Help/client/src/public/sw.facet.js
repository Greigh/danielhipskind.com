// Service Worker for Adamas — network-first HTML, versioned asset cache
const CACHE_VERSION = 'adamas-facet-20260918b';
const ASSET_CACHE = `${CACHE_VERSION}-assets`;

self.addEventListener('install', (event) => {
  // Activate immediately so deploys aren't stuck behind an old worker
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== ASSET_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

function isHashedAsset(pathname) {
  // Webpack contenthashed bundles under /adamas/ or root
  return /\/(styles|js|images|fonts|audio)\/[^/]+\.[a-f0-9]{8,}\.(css|js|map|png|jpe?g|gif|svg|woff2?|ttf|mp3|wav|ogg)$/i.test(
    pathname
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never interfere with HMR / API / sockets
  if (
    url.pathname.includes('.hot-update.') ||
    url.pathname.includes('__webpack_hmr') ||
    url.pathname.startsWith('/sockjs-node/') ||
    url.pathname.includes('/api/') ||
    url.pathname.includes('/socket.io')
  ) {
    return;
  }

  // Always fetch a fresh service worker script
  if (url.pathname.endsWith('/sw.js') || url.pathname === '/sw.js') {
    event.respondWith(fetch(request, { cache: 'reload' }));
    return;
  }

  const acceptsHtml =
    request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');

  // HTML / navigations: network-first so deploys show up immediately
  if (acceptsHtml) {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() => caches.match(request))
    );
    return;
  }

  // Hashed static assets: cache-first (safe — filename changes on content change)
  if (isHashedAsset(url.pathname)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // Everything else: network-first, no long-lived stale shell
  event.respondWith(
    fetch(request)
      .then((response) => response)
      .catch(() => caches.match(request))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    );
  }
});
