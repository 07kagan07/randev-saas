import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const self: any;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event: any) => {
  if (!event.data) return;
  const data = event.data.json() as { title?: string; body?: string; url?: string };
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Yeni Randevu', {
      body: data.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url ?? '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event: any) => {
  event.notification.close();
  const url: string = event.notification.data?.url ?? '/';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList: any[]) => {
        for (const client of clientList) {
          if ('focus' in client) return client.focus();
        }
        return self.clients.openWindow(url);
      }),
  );
});
