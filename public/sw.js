const CACHE_NAME = 'studyledger-v1'
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
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
  // Network-first for API routes, cache-first for static assets
  if (event.request.url.includes('/api/')) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)))
    return
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  )
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
