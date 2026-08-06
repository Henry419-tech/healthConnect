// public/sw.js
// HealthConnect Navigator — Service Worker v1
// Responsibilities:
//   1. Cache-first strategy for static shell and offline fallback
//   2. Network-first strategy for API routes
//   3. Web Push notification display + click routing
//   4. Offline page served when network unavailable

const CACHE_NAME     = 'hc-shell-v1';
const OFFLINE_URL    = '/offline.html';

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
];

/* ── Install ─────────────────────────────────────────────────────── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(PRECACHE_URLS.map(url => new Request(url, { cache: 'reload' })))
    ).then(() => self.skipWaiting())
  );
});

/* ── Activate ────────────────────────────────────────────────────── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch ───────────────────────────────────────────────────────── */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // API routes — network first, no caching
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // Next.js internal routes — always network
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Everything else: cache first, network fallback, offline page last
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        // Cache successful HTML responses for shell pages
        if (
          response.ok &&
          request.headers.get('Accept')?.includes('text/html')
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() =>
        caches.match(OFFLINE_URL).then(offlinePage => {
          return offlinePage ?? new Response('You are offline.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          });
        })
      );
    })
  );
});

/* ── Push notifications ──────────────────────────────────────────── */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'HealthConnect', body: event.data?.text() ?? 'You have a new notification.' };
  }

  const {
    title   = 'HealthConnect Navigator',
    body    = '',
    icon    = '/icons/icon-192x192.png',
    badge   = '/icons/badge-72x72.png',
    tag     = 'hc-notification',
    url     = '/dashboard',
    data: extraData = {},
  } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      renotify: true,
      data: { url, ...extraData },
    })
  );
});

/* ── Notification click ──────────────────────────────────────────── */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // If the app is already open, focus it and navigate
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(targetUrl);
          return;
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

/* ── Message handler ─────────────────────────────────────────────── */
// Allows pages to send messages to the SW, e.g. to skip waiting
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
