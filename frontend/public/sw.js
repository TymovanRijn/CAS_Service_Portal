// Service Worker for CAS Service Portal PWA
const CACHE_NAME = 'cas-service-portal-v2';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.svg',
  '/logo192.png',
  '/logo512.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker installed successfully');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated successfully');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache when offline, but allow API calls to pass through
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip caching for API calls and external resources
  if (url.pathname.startsWith('/api/') || 
      url.hostname !== 'localhost' || 
      url.port === '3001' ||
      request.method !== 'GET') {
    // Let API calls and external requests pass through
    event.respondWith(fetch(request));
    return;
  }

  // For static assets, try cache first, then network
  event.respondWith(
    caches.match(request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          console.log('Serving from cache:', request.url);
          return response;
        }
        
        console.log('Fetching from network:', request.url);
        return fetch(request).then((response) => {
          // Cache successful responses for static assets
          if (response.status === 200 && request.method === 'GET') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
      .catch(() => {
        // If both cache and network fail, return a fallback
        if (request.destination === 'document') {
          return caches.match('/');
        }
        return new Response('Offline content not available', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
  );
});

// Background sync for offline functionality
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Handle background sync for offline data
  console.log('Background sync triggered');
  return Promise.resolve();
}

// Push notification handling
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New notification from CAS Portal',
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open App',
        icon: '/logo192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/logo192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('CAS Portal', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
}); 