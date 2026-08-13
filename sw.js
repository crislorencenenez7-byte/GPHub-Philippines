/* ============================================================
   sw.js — Golden Pride Hub Service Worker
   Enables PWA installability and basic offline caching of the
   app shell (static files). Firebase calls always go to network.
   ============================================================ */

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

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Never cache Firebase/Google API requests — always go live
  if (event.request.url.includes("firebaseio.com") ||
      event.request.url.includes("googleapis.com") ||
      event.request.url.includes("gstatic.com")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
