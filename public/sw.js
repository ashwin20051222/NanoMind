importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

if (workbox) {
  console.log('Workbox is loaded');

  // Cache page navigations (html) with a Network First strategy
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new workbox.strategies.NetworkFirst({
      cacheName: 'pages',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [200],
        }),
      ],
    })
  );

  // Cache CSS, JS, and Web Worker requests with a Stale While Revalidate strategy
  workbox.routing.registerRoute(
    ({ request }) =>
      request.destination === 'style' ||
      request.destination === 'script' ||
      request.destination === 'worker',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'assets',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [200],
        }),
      ],
    })
  );

  // Cache images with a Cache First strategy
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'images',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [200],
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    })
  );

  // Cache API requests (e.g., settings, integrations) with a Network First strategy
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/api/'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'api-responses',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [200],
        }),
      ],
    })
  );

  // Provide a fallback for offline
  workbox.routing.setCatchHandler(async ({ event }) => {
    // Return the offline page if a document is being requested
    if (event.request.destination === 'document') {
      return caches.match('/');
    }
    return Response.error();
  });
} else {
  console.log('Workbox could not be loaded. No offline support.');
}
