// public/service-worker.js
// Debe quedar en la raíz servida (https://tu-dominio/service-worker.js) para
// poder registrarse con scope '/'. No usa ningún framework de PWA — es un
// service worker mínimo, solo para push notifications (no cachea nada).

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Control de Horario', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || '🚨 Descanso terminado';
  const options = {
    body: data.body || 'Regresa a la app y marca "Finalizar descanso".',
    icon: '/icon.png',
    badge: '/icon.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'break-alarm',
    renotify: true,
    requireInteraction: true,
    data: { url: data.url || '/horario' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/horario';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
