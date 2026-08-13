/* ============================================================
   sw.js — Golden Pride Hub
   Service Worker / PWA
   ============================================================ */

const CACHE_NAME = "golden-pride-hub-v2.3";

const BASE_PATH = "/GPHub-Philippines/";

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

self.addEventListener(
  "install",
  (event) => {

    console.log(
      "Golden Pride Hub Service Worker installing..."
    );

    event.waitUntil(

      caches
        .open(CACHE_NAME)

        .then((cache) => {

          console.log(
            "Caching Golden Pride Hub app shell..."
          );

          return cache.addAll(APP_SHELL);

        })

        .catch((error) => {

          console.error(
            "Failed to cache app shell:",
            error
          );

        })

    );

    // Activate immediately
    self.skipWaiting();

  }
);


/* ============================================================
   ACTIVATE
   ============================================================ */

self.addEventListener(
  "activate",
  (event) => {

    console.log(
      "Golden Pride Hub Service Worker activated."
    );

    event.waitUntil(

      caches
        .keys()

        .then((cacheNames) => {

          return Promise.all(

            cacheNames

              .filter(
                (cacheName) =>
                  cacheName !== CACHE_NAME
              )

              .map(
                (cacheName) => {

                  console.log(
                    "Deleting old cache:",
                    cacheName
                  );

                  return caches.delete(
                    cacheName
                  );

                }
              )

          );

        })

    );

    // Take control of all open pages
    self.clients.claim();

  }
);


/* ============================================================
   FETCH
   ============================================================ */

self.addEventListener(
  "fetch",
  (event) => {

    const request =
      event.request;

    const url =
      new URL(request.url);


    /*
       Only handle GET requests.
    */

    if (
      request.method !== "GET"
    ) {

      return;

    }


    /*
       Do not cache Firebase,
       Google APIs, or external services.
    */

    if (

      url.hostname.includes(
        "firebaseio.com"
      )

      ||

      url.hostname.includes(
        "googleapis.com"
      )

      ||

      url.hostname.includes(
        "gstatic.com"
      )

    ) {

      return;

    }


    /*
       Cache first, then network.
    */

    event.respondWith(

      caches
        .match(request)

        .then((cachedResponse) => {

          if (cachedResponse) {

            return cachedResponse;

          }


          return fetch(request)

            .then((networkResponse) => {

              /*
                 Only cache successful responses.
              */

              if (
                networkResponse &&
                networkResponse.status === 200 &&
                networkResponse.type === "basic"
              ) {

                const responseClone =
                  networkResponse.clone();


                caches
                  .open(CACHE_NAME)
                  .then((cache) => {

                    cache.put(
                      request,
                      responseClone
                    );

                  });

              }


              return networkResponse;

            })

            .catch((error) => {

              console.error(
                "Network request failed:",
                error
              );


              /*
                 If offline and no cached response,
                 return a basic offline response.
              */

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

  }
);
