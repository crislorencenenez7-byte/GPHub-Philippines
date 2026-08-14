/* ============================================================
   sw.js — Golden Pride Hub
   PWA Service Worker
   Automatic version.json cache updates
   ============================================================ */

const BASE_PATH = "/GPHub-Philippines/";
const VERSION_URL = `${BASE_PATH}version.json`;

const FALLBACK_VERSION = "2.5";
const CACHE_PREFIX = "golden-pride-hub-";

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

  `${BASE_PATH}manifest.json`,
  VERSION_URL
];


/* ============================================================
   HELPERS
   ============================================================ */

async function getCurrentVersion() {

  try {

    const response = await fetch(
      `${VERSION_URL}?sw=${Date.now()}`,
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        `version.json returned ${response.status}`
      );
    }

    const data = await response.json();

    if (!data.version) {
      throw new Error(
        "version.json has no version field"
      );
    }

    return String(data.version);

  } catch (error) {

    console.error(
      "[SW] Version check failed:",
      error
    );

    return FALLBACK_VERSION;

  }

}


function cacheName(version) {
  return `${CACHE_PREFIX}v${version}`;
}


/* ============================================================
   INSTALL
   ============================================================ */

self.addEventListener("install", (event) => {

  event.waitUntil(

    getCurrentVersion()

      .then(async (version) => {

        const name = cacheName(version);

        console.log(
          "[SW] Installing cache:",
          name
        );

        const cache =
          await caches.open(name);

        /*
         * Cache the application shell.
         */
        await cache.addAll(APP_SHELL);

        console.log(
          "[SW] App shell cached:",
          name
        );

        /*
         * Activate immediately.
         */
        await self.skipWaiting();

      })

      .catch((error) => {

        console.error(
          "[SW] Installation failed:",
          error
        );

      })

  );

});


/* ============================================================
   ACTIVATE
   ============================================================ */

self.addEventListener("activate", (event) => {

  event.waitUntil(

    getCurrentVersion()

      .then(async (version) => {

        const currentCache =
          cacheName(version);

        const cacheNames =
          await caches.keys();

        await Promise.all(

          cacheNames
            .filter(
              (name) =>
                name.startsWith(CACHE_PREFIX) &&
                name !== currentCache
            )
            .map((oldCache) => {

              console.log(
                "[SW] Removing old cache:",
                oldCache
              );

              return caches.delete(oldCache);

            })

        );

        await self.clients.claim();

        console.log(
          "[SW] Activated:",
          currentCache
        );

      })

      .catch(async (error) => {

        console.error(
          "[SW] Activation error:",
          error
        );

        await self.clients.claim();

      })

  );

});


/* ============================================================
   VERSION CHECK
   ============================================================ */

async function checkForVersionUpdate() {

  try {

    const newVersion =
      await getCurrentVersion();

    const allCaches =
      await caches.keys();

    const versionCaches =
      allCaches.filter(
        (name) =>
          name.startsWith(CACHE_PREFIX)
      );

    /*
     * Find the cache that contains the current
     * version.json.
     */
    let currentVersion = null;

    for (const cacheNameValue of versionCaches) {

      const cache =
        await caches.open(cacheNameValue);

      const response =
        await cache.match(VERSION_URL);

      if (response) {

        try {

          const data =
            await response.json();

          if (data.version) {
            currentVersion =
              String(data.version);
            break;
          }

        } catch {
          // Ignore invalid cached version.json
        }

      }

    }

    /*
     * If there is no old version yet,
     * nothing needs to be updated.
     */
    if (!currentVersion) {

      return;

    }

    /*
     * No update.
     */
    if (currentVersion === newVersion) {

      return;

    }

    console.log(
      `[SW] New version detected: ${currentVersion} → ${newVersion}`
    );

    const newCacheName =
      cacheName(newVersion);

    /*
     * Create a completely new cache.
     */
    const newCache =
      await caches.open(newCacheName);

    await newCache.addAll(APP_SHELL);

    console.log(
      "[SW] New version cached:",
      newCacheName
    );

    /*
     * Remove older version caches.
     */
    const updatedCaches =
      await caches.keys();

    await Promise.all(

      updatedCaches
        .filter(
          (name) =>
            name.startsWith(CACHE_PREFIX) &&
            name !== newCacheName
        )
        .map((oldCache) => {

          console.log(
            "[SW] Deleting old cache:",
            oldCache
          );

          return caches.delete(oldCache);

        })

    );

    /*
     * Tell every open page that a new version
     * is ready.
     */
    const clients =
      await self.clients.matchAll({
        type: "window"
      });

    for (const client of clients) {

      client.postMessage({
        type: "NEW_VERSION",
        version: newVersion
      });

    }

  } catch (error) {

    console.error(
      "[SW] Automatic update failed:",
      error
    );

  }

}


/* ============================================================
   PERIODIC VERSION CHECK
   ============================================================ */

const VERSION_CHECK_INTERVAL = 5 * 60 * 1000;


/*
 * The Service Worker can remain alive only while
 * handling events, so this interval is mainly useful
 * while the worker is active.
 */
setInterval(
  checkForVersionUpdate,
  VERSION_CHECK_INTERVAL
);


/* ============================================================
   MESSAGE
   ============================================================ */

self.addEventListener("message", (event) => {

  if (!event.data) {
    return;
  }

  if (
    event.data.type === "SKIP_WAITING"
  ) {

    self.skipWaiting();

    return;

  }

  if (
    event.data.type === "CHECK_VERSION"
  ) {

    event.waitUntil(
      checkForVersionUpdate()
    );

  }

});


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
   * Ignore external services.
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
   * version.json must ALWAYS come from network.
   */
  if (
    url.pathname ===
    new URL(VERSION_URL, self.location.origin).pathname
  ) {

    event.respondWith(

      fetch(request, {
        cache: "no-store"
      })

    );

    return;

  }


  const isHTML =
    request.mode === "navigate" ||
    request.destination === "document" ||
    request.headers
      .get("accept")
      ?.includes("text/html");


  /*
   * HTML = NETWORK FIRST
   */
  if (isHTML) {

    event.respondWith(

      fetch(request, {
        cache: "no-store"
      })

        .then((networkResponse) => {

          if (
            networkResponse &&
            networkResponse.ok
          ) {

            const clone =
              networkResponse.clone();

            getCurrentVersion()
              .then((version) =>
                caches.open(
                  cacheName(version)
                )
              )
              .then((cache) =>
                cache.put(
                  request,
                  clone
                )
              )
              .catch(console.error);

          }

          return networkResponse;

        })

        .catch(() =>
          caches.match(request)
        )

    );

    return;

  }


  /*
   * Static files = CACHE FIRST
   * with network fallback.
   */
  event.respondWith(

    caches.match(request)

      .then((cachedResponse) => {

        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)

          .then((networkResponse) => {

            if (
              networkResponse &&
              networkResponse.ok &&
              networkResponse.type === "basic"
            ) {

              const clone =
                networkResponse.clone();

              getCurrentVersion()
                .then((version) =>
                  caches.open(
                    cacheName(version)
                  )
                )
                .then((cache) =>
                  cache.put(
                    request,
                    clone
                  )
                )
                .catch(console.error);

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
