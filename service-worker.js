
self.addEventListener('install', function(event) {
  console.log('Service Worker installé');
  // Pas de mise en cache
});

self.addEventListener('fetch', function(event) {
  // Toujours aller chercher sur le réseau
  event.respondWith(fetch(event.request));
});
