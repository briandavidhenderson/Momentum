const CACHE_NAME = 'momentum-v1'
const urlsToCache = [
  '/',
]

// Install service worker - cache resources for offline use
self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch((error) => {
        console.log('Cache installation failed:', error)
      })
    }).then(() => {
      return self.skipWaiting()
    })
  )
})

// Listen for skip waiting message from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Fetch handler - offline-first strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip service worker for external API requests during development
  if (
    url.hostname !== self.location.hostname
  ) {
    return fetch(request)
  }
  
  // For navigation requests, network first with cache fallback
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((response) => {
          return response
        })
        .catch(() => {
          // Fallback to cache if network fails (offline)
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match('/').then((indexResponse) => {
              return indexResponse || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/html' } })
            })
          })
        })
    )
    return
  }
  
  // For static assets, cache first strategy
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }
      return fetch(request).then((response) => {
        // Cache successful responses for static assets
        if (response.status === 200 && request.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone)
          })
        }
        return response
      }).catch(() => {
        // Return cached version if network fails
        return caches.match(request)
      })
    })
  )
})

// Activate service worker and clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clear old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName)
            }
          })
        )
      }),
      // Take control of all clients immediately
      self.clients.claim(),
    ])
  )
})
