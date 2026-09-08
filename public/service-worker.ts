/**
 * Service Worker for AUTORENT
 * Handles push notifications and offline functionality
 */

const CACHE_NAME = 'autorent-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/autorent-logo.png',
  '/autorent-badge.png',
];

// Install event - cache resources
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(urlsToCache).catch((error) => {
        console.warn('Cache addAll error:', error);
        // Don't fail installation if some URLs fail
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event: FetchEvent) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }

      return fetch(event.request).then((response) => {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});

// Push notification event
self.addEventListener('push', (event: PushEvent) => {
  console.log('Push notification received:', event);

  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  try {
    const data = event.data.json();
    const { title, body, icon, badge, tag, data: notificationData } = data;

    const options: NotificationOptions = {
      body: body || '',
      icon: icon || '/autorent-logo.png',
      badge: badge || '/autorent-badge.png',
      tag: tag || 'autorent-notification',
      data: notificationData || {},
      requireInteraction: true, // Keep notification until user interacts
      vibrate: [200, 100, 200],
      sound: '/notification-sound.mp3',
    };

    event.waitUntil(
      self.registration.showNotification(title || 'AUTORENT', options)
    );
  } catch (error) {
    console.error('Error parsing push event:', error);
    // Fallback: show simple notification
    event.waitUntil(
      self.registration.showNotification('AUTORENT Notification', {
        body: event.data.text(),
        icon: '/autorent-logo.png',
      })
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  console.log('Notification clicked:', event.notification);

  event.notification.close();

  const notificationData = event.notification.data || {};
  const bookingId = notificationData.bookingId;
  const type = notificationData.type;

  let urlToOpen = '/';

  if (type === 'check-in-reminder' && bookingId) {
    urlToOpen = `/bookings/${bookingId}/check-in`;
  } else if (type === 'check-out-reminder' && bookingId) {
    urlToOpen = `/bookings/${bookingId}/check-out`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if there's already a window open with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
      return Promise.resolve();
    })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event: NotificationEvent) => {
  console.log('Notification closed:', event.notification);
});

// Handle messages from clients
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  console.log('Service Worker received message:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});
