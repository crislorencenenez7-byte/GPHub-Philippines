/* ============================================================
   sw.js — Golden Pride Hub
   PWA Service Worker

   Features:
   - Offline fallback
   - Network-first HTML/navigation
   - Stale-while-revalidate static assets
   - Automatic cache refresh
   - Old cache cleanup
   - Firebase / external API requests stay on network
   ============================================================ */

const CACHE_PREFIX = "golden-pride-hub-";
const CACHE_NAME = `${CACHE_PREFIX}runtime-v2`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./login.html",
  "./register.html",
  "./dashboard.html",
  "./manifest.json",

  "./css/style.css",
  "./css/auth.css",
  "./css/dashboard.css",
  "./css/responsive.css",

  "./js/app.js",
  "./js/firebase-config.js",
  "./js/auth.js",
  "./js/dashboard.js"
];


/* ============================================================
   INSTALL
   ============================================================ */

self.addEventListener("install", (event) => {

  event.waitUntil(

    caches.open(CACHE_NAME)
      .then((cache) => {

        return cache.addAll(APP_SHELL);

      })
      .catch((error) => {

        console.error(
          "Golden Pride Hub cache install failed:",
          error
        );

      })

  );

  // Activate the new worker immediately.
  self.skipWaiting();

});


/* ============================================================
   ACTIVATE
   ============================================================ */

self.addEventListener("activate", (event) => {

  event.waitUntil(

    (async () => {

      const cacheNames = await caches.keys();

      await Promise.all(

        cacheNames
          .filter(
            (name) =>
              name.startsWith(CACHE_PREFIX) &&
              name !== CACHE_NAME
          )
          .map(
            (name) =>
              caches.delete(name)
          )
      );

      await self.clients.claim();

    })()

  );

});


/* ============================================================
   MESSAGE
   ============================================================ */

self.addEventListener("message", (event) => {

  if (!event.data) return;

  if (event.data.type === "CLEAR_APP_CACHE") {

    event.waitUntil(

      caches.keys()
        .then((names) =>

          Promise.all(

            names
              .filter((name) =>
                name.startsWith(CACHE_PREFIX)
              )
              .map((name) =>
                caches.delete(name)
              )

          )

        )

    );

  }

});


/* ============================================================
   REQUEST HELPERS
   ============================================================ */

function isExternalRequest(url) {

  return url.origin !== self.location.origin;

}


function isFirebaseRequest(url) {

  return (
    url.hostname.includes("firebaseio.com") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("gstatic.com") ||
    url.hostname.includes("firebaseapp.com")
  );

}


function isDynamicDataRequest(url) {

  return (
    url.pathname.endsWith("/version.json") ||
    url.pathname.endsWith("/update.json")
  );

}


/* ============================================================
   NETWORK-FIRST NAVIGATION
   ============================================================ */

async function networkFirst(request) {

  try {

    const response =
      await fetch(request);

    if (response.ok) {

      const cache =
        await caches.open(CACHE_NAME);

      await cache.put(
        request,
        response.clone()
      );

    }

    return response;

  } catch (error) {

    const cached =
      await caches.match(request);

    if (cached) {

      return cached;

    }

    const fallback =
      await caches.match("./index.html");

    if (fallback) {

      return fallback;

    }

    return new Response(
      "Golden Pride Hub is currently offline.",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8"
        }
      }
    );

  }

}


/* ============================================================
   STATIC ASSET
   STALE-WHILE-REVALIDATE
   ============================================================ */

async function staleWhileRevalidate(request) {

  const cache =
    await caches.open(CACHE_NAME);

  const cached =
    await cache.match(request);

  const networkFetch =
    fetch(request)
      .then((response) => {

        if (response.ok) {

          cache.put(
            request,
            response.clone()
          );

        }

        return response;

      })
      .catch(() => null);

  if (cached) {

    // Update cache in background.
    networkFetch.catch(() => {});

    return cached;

  }

  const networkResponse =
    await networkFetch;

  if (networkResponse) {

    return networkResponse;

  }

  return new Response(
    "",
    {
      status: 503
    }
  );

}


/* ============================================================
   FETCH
   ============================================================ */

self.addEventListener("fetch", (event) => {

  const request =
    event.request;

  if (request.method !== "GET") {

    return;

  }

  const url =
    new URL(request.url);


  /*
     External requests:
     never intercept.
  */

  if (
    isExternalRequest(url) ||
    isFirebaseRequest(url)
  ) {

    return;

  }


  /*
     Dynamic JSON:
     ALWAYS network.

     This is important because version.json
     and update.json must not become stale.
  */

  if (isDynamicDataRequest(url)) {

    event.respondWith(

      fetch(request, {
        cache: "no-store"
      })

    );

    return;

  }


  /*
     HTML navigation:
     network first.
  */

  if (
    request.mode === "navigate" ||
    request.destination === "document"
  ) {

    event.respondWith(
      networkFirst(request)
    );

    return;

  }


  /*
     CSS / JS / images / manifest:
     stale while revalidate.
  */

  event.respondWith(
    staleWhileRevalidate(request)
  );

});
