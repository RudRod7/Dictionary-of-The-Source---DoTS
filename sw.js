// Dictionary of The Source — service worker
// Met en cache la coquille de l'application pour un chargement hors-ligne.
// Les données du dictionnaire (mots, préface, etc.) sont gérées séparément
// via localStorage dans index.html, car elles viennent de Supabase et
// changent plus souvent que les fichiers de l'application.

const CACHE_NAME = 'dots-shell-v4';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ne jamais intercepter les appels vers Supabase : ils doivent
  // échouer naturellement hors-ligne pour que l'app bascule sur
  // son propre cache local (localStorage) des définitions.
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  // Uniquement les requêtes GET de même origine (coquille de l'app, polices).
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && url.origin === self.location.origin) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
                                     
