const CACHE_NAME = 'studyledger-v2'

// Precached one URL at a time, each failure swallowed — deliberately NOT
// cache.addAll(). addAll() is atomic: a single failing URL (a redirect, a 401,
// a cold 500) rejects the whole install, the worker never activates, and every
// `navigator.serviceWorker.ready` in the app then hangs forever.
//
// That is what killed push. The opt-in card awaited `ready` before deciding to
// render, so it never rendered, so nobody could subscribe, so
// `push_subscriptions` stayed empty and the notification engine sent nothing.
// '/dashboard' was in this list: an auth-gated route, the most redirect-prone
// URL on the site. Precaching is a nice-to-have. It must never block activation.
const STATIC_ASSETS = ['/', '/manifest.json', '/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => Promise.all(STATIC_ASSETS.map((url) => cache.add(url).catch(() => {}))))
      .catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  // Documents are network-first. A Next.js HTML document references
  // content-hashed chunks; serving a stale one from the cache after a deploy
  // points the browser at chunk URLs that no longer exist on the CDN and the
  // app boots into a blank screen. Cache is the offline fallback only.
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && res.type === 'basic' && !res.redirected) {
            const copy = res.clone()
            caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {})
          }
          return res
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match('/').then((root) => root || Response.error()))
        )
    )
    return
  }

  // API: always the network. The cache is a last resort, never a shortcut.
  if (req.url.includes('/api/')) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req).then((cached) => cached || Response.error()))
    )
    return
  }

  // Everything else (content-hashed chunks, fonts, images) — cache-first is safe.
  event.respondWith(caches.match(req).then((cached) => cached || fetch(req)))
})

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data?.json() ?? {} } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'StudyLedger', {
      body: data.body || 'You have a study reminder',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      // Per-type tags: a new exam alert replaces the previous exam alert,
      // but never clobbers a pending streak or risk notification.
      tag: 'studyledger-' + (data.type || 'general'),
      data: { url: data.url || '/dashboard' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      // Focus an existing app window and navigate it, instead of stacking
      // new windows on every click.
      for (const win of wins) {
        if ('focus' in win) {
          win.navigate(url).catch(() => {})
          return win.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
