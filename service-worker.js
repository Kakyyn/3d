const CACHE_NAME = '3d-control-center-v1';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Instalar Service Worker
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Service Worker: Cache abierto');
        return cache.addAll(urlsToCache);
      })
      .catch(function(error) {
        console.log('Service Worker: Error al abrir cache', error);
      })
  );
});

// Activar Service Worker
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Eliminando cache antiguo', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptar requests
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - devolver respuesta
        if (response) {
          return response;
        }

        return fetch(event.request).then(
          function(response) {
            // Verificar si recibimos una respuesta válida
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clonar la respuesta
            var responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
      .catch(function() {
        // Si falla todo, mostrar página offline básica
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      })
  );
});

// Manejo de notificaciones push (opcional para futuras funcionalidades)
self.addEventListener('push', function(event) {
  const options = {
    body: event.data ? event.data.text() : 'Nueva notificación',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="%23ff6b35"/><text x="64" y="80" text-anchor="middle" font-size="48" font-weight="bold" fill="white">3D</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="%23ff6b35"/><text x="64" y="80" text-anchor="middle" font-size="48" font-weight="bold" fill="white">3D</text></svg>',
    tag: '3d-control-notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification('3D Control Center', options)
  );
});

// Manejo de clicks en notificaciones
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/')
  );
});

// Evento de sincronización en background (opcional)
self.addEventListener('sync', function(event) {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Aquí podrías sincronizar datos cuando haya conexión
      console.log('Service Worker: Sincronización en background')
    );
  }
});

// Manejo de actualizaciones de la aplicación
self.addEventListener('message', function(event) {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});