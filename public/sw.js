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
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'StudyLedger', {
      body: data.body || 'You have a study reminder',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'studyledger-notification',
      data: { url: data.url || '/dashboard' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/dashboard')
  )
})
