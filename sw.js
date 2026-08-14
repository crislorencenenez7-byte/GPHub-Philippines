/* ============================================================
   sw.js — Golden Pride Hub
   Service Worker / PWA
   Fixed cache/update strategy
   ============================================================ */

const CACHE_NAME = "golden-pride-hub-v2.5";
const BASE_PATH = "/GPHub-Philippines/";

/*
   Static app shell.
*/
const APP_SHELL = [
  `${BASE_PATH}`,
  `${BASE_PATH}index.html`,
  `${BASE_PATH}login.html`,
  `${BASE_PATH}register.html`,
  `${BASE_PATH}dashboard.html`,

  `${BASE_PATH}css/style.css`,
  `${BASE_PATH}css/auth.css`,
  `${BASE_PATH}css/dashboard.css`,
  `${BASE_PATH}css/responsive.css`,

  `${BASE_PATH}js/app.js`,
  `${BASE_PATH}js/firebase-config.js`,
  `${BASE_PATH}js/auth.js`,
  `${BASE_PATH}js/dashboard.js`,

  `${BASE_PATH}manifest.json`
];


/* ============================================================
   INSTALL
   ============================================================ */

self.addEventListener("install", (event) => {

  console.log(
    "[SW] Installing:",
    CACHE_NAME
  );

  event.waitUntil(

    caches.open(CACHE_NAME)

      .then((cache) => {

        return cache.addAll(APP_SHELL);

      })

      .then(() => {

        console.log(
          "[SW] App shell cached."
        );

        /*
           Activate the new worker immediately.
        */
        return self.skipWaiting();

      })

      .catch((error) => {

        console.error(
          "[SW] Cache installation failed:",
          error
        );

      })

  );

});


/* ============================================================
   ACTIVATE
   ============================================================ */

self.addEventListener("activate", (event) => {

  console.log(
    "[SW] Activating:",
    CACHE_NAME
  );

  event.waitUntil(

    caches.keys()

      .then((cacheNames) => {

        return Promise.all(

          cacheNames
            .filter(
              (cacheName) =>
                cacheName !== CACHE_NAME
            )
            .map((oldCache) => {

              console.log(
                "[SW] Deleting old cache:",
                oldCache
              );

              return caches.delete(oldCache);

            })

        );

      })

      .then(() => {

        /*
           Take control of currently open pages.
        */
        return self.clients.claim();

      })

  );

});


/* ============================================================
   FETCH
   ============================================================ */

self.addEventListener("fetch", (event) => {

  const request = event.request;

  /*
     Only handle GET requests.
  */
  if (request.method !== "GET") {
    return;
  }


  const url = new URL(request.url);


  /*
     Ignore external services.
  */
  if (
    url.hostname.includes("firebaseio.com") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("gstatic.com") ||
    url.hostname.includes("githubusercontent.com") ||
    url.hostname.includes("cdnjs.cloudflare.com") ||
    url.hostname.includes("fonts.googleapis.com") ||
    url.hostname.includes("fonts.gstatic.com")
  ) {

    return;

  }


  /*
     IMPORTANT:

     HTML documents use NETWORK-FIRST.

     This prevents an old cached index.html from
     remaining visible after a new GitHub Pages release.
  */
  const isHTML =
    request.mode === "navigate" ||
    request.destination === "document" ||
    request.headers.get("accept")?.includes("text/html");


  if (isHTML) {

    event.respondWith(

      fetch(request, {
        cache: "no-store"
      })

        .then((networkResponse) => {

          /*
             Save the latest HTML response.
          */
          if (
            networkResponse &&
            networkResponse.ok
          ) {

            const responseClone =
              networkResponse.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {

                cache.put(
                  request,
                  responseClone
                );

              });

          }

          return networkResponse;

        })

        .catch(() => {

          /*
             Offline fallback:
             use cached HTML if available.
          */
          return caches.match(request)
            .then((cachedResponse) => {

              if (cachedResponse) {
                return cachedResponse;
              }

              return new Response(
                "Golden Pride Hub is currently offline.",
                {
                  status: 503,
                  headers: {
                    "Content-Type":
                      "text/plain; charset=utf-8"
                  }
                }
              );

            });

        })

    );

    return;

  }


  /*
     Static assets:

     Cache-first with network fallback.
  */
  event.respondWith(

    caches.match(request)

      .then((cachedResponse) => {

        if (cachedResponse) {
          return cachedResponse;
        }


        return fetch(request)

          .then((networkResponse) => {

            /*
               Cache only successful same-origin
               responses.
            */
            if (
              networkResponse &&
              networkResponse.status === 200 &&
              networkResponse.type === "basic"
            ) {

              const responseClone =
                networkResponse.clone();

              caches.open(CACHE_NAME)
                .then((cache) => {

                  cache.put(
                    request,
                    responseClone
                  );

                });

            }

            return networkResponse;

          });

      })

      .catch(() => {

        return new Response(
          "Golden Pride Hub is currently offline.",
          {
            status: 503,
            headers: {
              "Content-Type":
                "text/plain; charset=utf-8"
            }
          }
        );

      })

  );

});


/* ============================================================
   MESSAGE
   ============================================================ */

/*
   Allows app.js to tell the service worker
   to activate immediately.
*/

self.addEventListener("message", (event) => {

  if (
    event.data &&
    event.data.type === "SKIP_WAITING"
  ) {

    self.skipWaiting();

  }

});
