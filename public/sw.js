// Ally service worker — cache-first with runtime caching so the app
// keeps working offline after the first visit, plus Web Push support so
// reminders can arrive even when the app is closed.
const CACHE_NAME = 'ally-cache-v1'
const CORE_ASSETS = ['/', '/index.html', '/manifest.json', '/ally.png']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS).catch(() => {}))
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  // Never let the cache intercept API calls — they always need a live network hit.
  if (event.request.url.includes('/api/')) return

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse

      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
        .catch(() => caches.match('/index.html'))
    })
  )
})

/* ------------------------------ web push ------------------------------ */

// Fires when the backend sends a push, even if Ally isn't open anywhere —
// this is the whole reason a service worker is needed for this feature.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Ally', body: event.data ? event.data.text() : 'Time to drink some water!' }
  }

  const title = data.title || 'Ally'
  const options = {
    body: data.body || 'Time to drink some water!',
    icon: '/ally.png',
    badge: '/ally.png',
    tag: 'ally-reminder', // reuses one notification slot instead of stacking
    renotify: true,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Tapping the notification focuses an already-open tab if there is one,
// otherwise opens a new one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => 'focus' in c)
      if (existing) return existing.focus()
      return self.clients.openWindow('/')
    })
  )
})
