
// ========================================================
// UNIFREIRE SMART PWA SERVICE WORKER (WORKBOX-INSPIRED)
// Estrategias: Stale-While-Revalidate, Cache-First, Network-First
// ========================================================
const CACHE_STATIC_NAME = 'unifreire-static-v6';
const CACHE_MEDIA_NAME = 'unifreire-media-v6';
const CACHE_DYNAMIC_NAME = 'unifreire-dynamic-v6';

const CORE_ASSETS = [
    './',
    './index.html',
    './admissions.html',
    './career.html',
    './vocational.html',
    './styles.css',
    './app.js',
    './data.js',
    './assets/images/logo.webp',
    './assets/images/hero_bg.webp'
];

self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_STATIC_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
    );
});

self.addEventListener('activate', (e) => {
    const currentCaches = [CACHE_STATIC_NAME, CACHE_MEDIA_NAME, CACHE_DYNAMIC_NAME];
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(
                keyList.map((key) => {
                    if (!currentCaches.includes(key)) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    const req = e.request;
    const url = new URL(req.url);

    // Ignorar solicitudes no GET o extensiones de navegador
    if (req.method !== 'GET' || url.protocol.startsWith('chrome-extension')) return;

    // 1. Estrategia Network-First para APIs y configuración en la nube
    if (url.search.includes('action=') || url.pathname.includes('/api/')) {
        e.respondWith(
            fetch(req)
                .then((networkRes) => {
                    if (networkRes && networkRes.status === 200) {
                        const copy = networkRes.clone();
                        caches.open(CACHE_DYNAMIC_NAME).then((c) => c.put(req, copy));
                    }
                    return networkRes;
                })
                .catch(() => caches.match(req))
        );
        return;
    }

    // 2. Estrategia Cache-First para Medios e Imágenes (Drive, Cloudinary, Assets locales)
    if (
        req.destination === 'image' ||
        req.destination === 'font' ||
        url.hostname.includes('googleusercontent.com') ||
        url.hostname.includes('cloudinary.com') ||
        url.pathname.match(/\.(webp|png|jpg|jpeg|svg|woff2|woff|ttf)$/i)
    ) {
        e.respondWith(
            caches.match(req).then((cachedRes) => {
                if (cachedRes) return cachedRes;
                return fetch(req)
                    .then((networkRes) => {
                        if (networkRes && networkRes.status === 200) {
                            const copy = networkRes.clone();
                            caches.open(CACHE_MEDIA_NAME).then((c) => c.put(req, copy));
                        }
                        return networkRes;
                    })
                    .catch(() => {
                        if (req.destination === 'image') {
                            return caches.match('./assets/images/hero_bg.webp');
                        }
                    });
            })
        );
        return;
    }

    // 3. Estrategia Stale-While-Revalidate para Documentos, CSS y JS
    e.respondWith(
        caches.match(req).then((cachedRes) => {
            const fetchPromise = fetch(req)
                .then((networkRes) => {
                    if (networkRes && networkRes.status === 200) {
                        const copy = networkRes.clone();
                        caches.open(CACHE_STATIC_NAME).then((c) => c.put(req, copy));
                    }
                    return networkRes;
                })
                .catch(() => cachedRes);

            return cachedRes || fetchPromise;
        })
    );
});

