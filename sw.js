const CACHE_NAME = 'radaresconnect-v3.0-pro';

// Archivos básicos de la interfaz que se guardan para funcionar offline
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// 1. INSTALACIÓN: guarda la interfaz básica y fuerza activación inmediata
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. ACTIVACIÓN: elimina cachés obsoletas y toma el control de los clientes abiertos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. GESTIÓN DE PETICIONES (FETCH)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // EXCEPCIONES DIRECTAS A INTERNET (NUNCA BLOQUEAR CON CACHÉ)
  // Waze, Open-Meteo, OpenStreetMap y la base de datos JSON deben ir en directo
  if (
    url.hostname.includes('workers.dev') ||
    url.hostname.includes('open-meteo.com') ||
    url.hostname.includes('openstreetmap.org') ||
    url.pathname.endsWith('radares-catalunya.json')
  ) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Si no hay cobertura y es el JSON, intenta devolver la copia en caché si existiera
        return caches.match(event.request);
      })
    );
    return;
  }

  // ESTRATEGIA STALE-WHILE-REVALIDATE PARA EL RESTO DE RECURSOS (HTML, CSS, ICONOS)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// 4. INTERACCIÓN CON NOTIFICACIONES DE ANDROID
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'desactivar') {
    // Comunica a la página principal que detenga el GPS y el sistema
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ accion: 'detener_sistema' });
      });
    });
  } else {
    // Si toca en la notificación fuera del botón, abre o enfoca la app
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        if (clients.length > 0) {
          return clients[0].focus();
        }
        return self.clients.openWindow('./');
      })
    );
  }
});
