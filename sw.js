/* ============================================================
   sw.js — Golden Pride Hub
   Stable GitHub Pages Service Worker

   IMPORTANT:
   This worker does NOT force a page reload.
   It uses cache-first for static local assets and
   network-first for JSON/API-like requests.
   ============================================================ */

const CACHE_NAME = "gphub-static-v2.8.1";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./version.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.warn("[SW] precache warning:", error);
      })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isJsonRequest(request) {
  const url = new URL(request.url);
  return (
    url.pathname.endsWith(".json") ||
    url.searchParams.has("cache") ||
    url.searchParams.has("ts")
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  /*
   * Never cache cross-origin requests such as Firebase,
   * CDN libraries, or raw.githubusercontent.com.
   */
  if (url.origin !== self.location.origin) {
    return;
  }

  if (isJsonRequest(request)) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request, { cache: "no-store" });

    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(() => {});
    }

    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;

    return new Response(
      JSON.stringify({
        error: "offline",
        message: "Requested data is unavailable offline."
      }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(() => {});
    }

    return response;
  } catch (error) {
    return new Response("Offline", {
      status: 503,
      headers: {
        "Content-Type": "text/plain"
      }
    });
  }
}
