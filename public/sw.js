/**
 * Alexandria Library Management System - Service Worker
 */

const CACHE_NAME = 'alexandria-lms-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/sample-data.js',
    '/js/api.js',
    '/js/app.js',
    '/icons/icon.svg',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Bypass API requests to allow dynamic backend interaction
    if (url.pathname.startsWith('/api/')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Fetch in background to revalidate cache
                fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
                    }
                }).catch(() => {});
                return cachedResponse;
            }
            return fetch(event.request);
        })
    );
});
