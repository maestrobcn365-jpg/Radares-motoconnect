self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// GESTIÓN DE ACCIONES DE LA NOTIFICACIÓN
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;

  notification.close();

  if (action === 'desactivar') {
    // Si pulsa en el botón "Desactivar", avisa a la web para que pare el GPS y el audio
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          client.postMessage({ accion: 'detener_sistema' });
        }
      })
    );
  } else {
    // Si toca el cuerpo de la notificación, vuelve a abrir y enfocar la app activa
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/Radares-motoconnect/');
        }
      })
    );
  }
});
