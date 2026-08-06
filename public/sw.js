// Service Worker for Android System Notification Drawer & OS Desktop Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, badge, tag } = event.data;
    self.registration.showNotification(title || 'TheRoom Signal', {
      body: body || 'New encrypted message received',
      icon: icon || '/logos/icon-192.png',
      badge: badge || '/logos/icon-192.png',
      vibrate: [200, 100, 200],
      tag: tag || 'theroom-msg-' + Date.now(),
      renotify: true,
      data: { url: '/' }
    });
  }
});
