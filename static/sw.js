// StockPulse Service Worker
const CACHE_VERSION = 'v3';
const STATIC_CACHE = `stockpulse-static-${CACHE_VERSION}`;
const DATA_CACHE = `stockpulse-data-${CACHE_VERSION}`;
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/static/icon-192.png',
    '/static/icon-512.png',
    '/static/icon-180.png'
];
const CACHEABLE_API_PATHS = new Set([
    '/api/snapshot',
    '/api/market-sentiment',
    '/api/market-indexes',
    '/api/earnings-calendar',
    '/api/penny-stocks'
]);

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((names) => Promise.all(
                names
                    .filter((name) => name.startsWith('stockpulse-') && ![STATIC_CACHE, DATA_CACHE].includes(name))
                    .map((name) => caches.delete(name))
            ))
            .then(() => self.clients.claim())
    );
});

async function fetchWithTimeout(request, timeoutMs = 10000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(request, { signal: controller.signal });
    } finally {
        clearTimeout(timeout);
    }
}

async function offlineResponse(request) {
    const cached = await caches.match(request);
    if (cached) {
        const headers = new Headers(cached.headers);
        headers.set('Warning', '110 - Response is from the offline cache');
        headers.set('X-StockPulse-Cache', 'offline');
        return new Response(await cached.blob(), {
            status: cached.status,
            statusText: cached.statusText,
            headers
        });
    }
    return new Response(
        JSON.stringify({
            status: 'offline',
            code: 'network_unavailable',
            error: 'No network connection or cached market data is available.'
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
}

async function networkFirstApi(request) {
    try {
        const response = await fetchWithTimeout(request);
        if (response.ok) {
            const cache = await caches.open(DATA_CACHE);
            await cache.put(request, response.clone());
        }
        return response;
    } catch {
        return offlineResponse(request);
    }
}

async function staleWhileRevalidate(request, event) {
    const cached = await caches.match(request);
    const update = fetch(request)
        .then(async (response) => {
            if (response.ok && response.type !== 'opaque') {
                const cache = await caches.open(STATIC_CACHE);
                await cache.put(request, response.clone());
            }
            return response;
        });

    if (cached) {
        event.waitUntil(update.catch(() => undefined));
        return cached;
    }
    return update;
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    if (url.pathname.startsWith('/api/')) {
        // Cache only anonymous, idempotent market-data reads. Never persist
        // analyses, trades, auth-bearing requests, or mutations.
        if (
            request.method === 'GET' &&
            !request.headers.has('Authorization') &&
            (CACHEABLE_API_PATHS.has(url.pathname) || url.pathname.startsWith('/api/stock/'))
        ) {
            event.respondWith(networkFirstApi(request));
        }
        return;
    }

    if (request.method === 'GET') {
        event.respondWith(staleWhileRevalidate(request, event));
    }
});

self.addEventListener('push', (event) => {
    if (!event.data) return;
    const data = event.data.json();
    event.waitUntil(self.registration.showNotification(data.title || 'StockPulse', {
        body: data.body || 'New market update available',
        icon: '/static/icon-192.png',
        badge: '/static/icon-72.png',
        vibrate: [100, 50, 100],
        data: { url: data.url || '/' }
    }));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url || '/'));
});
