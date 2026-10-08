const CACHE = 'ketohoy-shopping-list-offline-v1'
const OWN_CACHE_PREFIX = 'ketohoy-shopping-list-offline-'

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(['/offline-shopping-list.html', '/offline-shopping-list.js'])).then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(OWN_CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method === 'GET' && url.origin === self.location.origin && ['/offline-shopping-list.html', '/offline-shopping-list.js'].includes(url.pathname)) {
    event.respondWith(caches.match(url.pathname).then(response => response || fetch(request)))
    return
  }
  if (request.method !== 'GET' || request.mode !== 'navigate' || url.origin !== self.location.origin || url.pathname !== '/shopping-list') return
  event.respondWith(fetch(request).catch(async () => (await caches.match('/offline-shopping-list.html')) || Response.error()))
})
