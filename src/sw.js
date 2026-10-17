/* Service worker — generated per build (placeholders are replaced by scripts/build.mjs).
 *
 * Strategy
 *  - Precache: the app shell (CSS/JS/fonts/icons) + both language home pages + the offline page.
 *  - Pages (navigations): network-first, fall back to the last cached copy, then to /offline/.
 *  - /css /js /fonts: content-hashed, cache-first.
 *  - /img and legacy /assets: stale-while-revalidate in a size-limited cache.
 *  - Every deployment gets a new VERSION, so old caches are deleted on activate and a new worker
 *    waits until the visitor accepts the "Refresh" prompt (message: SKIP_WAITING).
 */
const VERSION = "__VERSION__";
const PRECACHE_URLS = __PRECACHE__;

const STATIC_CACHE = `fe-static-${VERSION}`;
const PAGES_CACHE = `fe-pages-${VERSION}`;
const IMAGES_CACHE = "fe-images-v1";
const MAX_IMAGES = 140;
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const keep = new Set([STATIC_CACHE, PAGES_CACHE, IMAGES_CACHE]);
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("fe-") && !keep.has(k)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

function timeout(ms, controller) {
  return setTimeout(() => controller.abort(), ms);
}

async function pageStrategy(request) {
  const pages = await caches.open(PAGES_CACHE);
  const controller = new AbortController();
  const timer = timeout(NETWORK_TIMEOUT_MS, controller);
  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    // redirected responses cannot be replayed for navigations, so never cache them
    if (response.ok && !response.redirected) pages.put(request, response.clone());
    return response;
  } catch (err) {
    clearTimeout(timer);
    const cached = (await pages.match(request)) || (await caches.match(request));
    if (cached) return cached;
    const offline = await caches.match("/offline/");
    return offline || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function trim(cache, max) {
  const keys = await cache.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(IMAGES_CACHE);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone()).then(() => trim(cache, MAX_IMAGES));
      }
      return response;
    })
    .catch(() => hit);
  return hit || network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/sw.js") return;

  if (request.mode === "navigate") {
    event.respondWith(pageStrategy(request));
    return;
  }

  const p = url.pathname;
  if (p.startsWith("/css/") || p.startsWith("/js/") || p.startsWith("/fonts/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
  if (p.startsWith("/img/") || p.startsWith("/assets/")) {
    // range requests (video etc.) are not used here; images only
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  if (PRECACHE_URLS.includes(p)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  }
});
