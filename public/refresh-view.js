/* global self, URL, caches, Response */

const migrationCache = `lottogeneration-refresh:${self.registration.scope}`;
const migrationKey = new URL('refresh-view.js', self.registration.scope).href;

function requestedRefresh(client) {
  const url = new URL(client.url);
  return (
    url.href.startsWith(self.registration.scope) &&
    url.searchParams.get('refresh') === '1'
  );
}

// An explicit refresh link also works when an older app shell serves the page.
// Migrate pre-refresh app shells once, even if the new worker was found before
// the refresh link was opened. Later releases keep user-controlled updates.
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(migrationCache).then((cache) => cache.match(migrationKey)),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }),
    ]).then(([migrated, clients]) => {
      if (!migrated || clients.some(requestedRefresh))
        return self.skipWaiting();
    }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(migrationCache);
      await cache.put(migrationKey, new Response('ready'));
      await self.clients.claim();
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients.filter(requestedRefresh)) {
        const url = new URL(client.url);
        url.searchParams.delete('refresh');
        // Let activation finish before the resulting navigation uses this worker.
        void client.navigate(url.href).catch(() => {});
      }
    })(),
  );
});
