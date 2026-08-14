/* ============================================================
   PWA SETUP + AUTOMATIC UPDATE HANDLING
   ============================================================ */

(function setupPWA() {

  /*
   * Manifest
   */
  if (!document.querySelector('link[rel="manifest"]')) {

    const link =
      document.createElement("link");

    link.rel = "manifest";
    link.href = "manifest.json";

    document.head.appendChild(link);

  }


  /*
   * Theme color
   */
  if (!document.querySelector('meta[name="theme-color"]')) {

    const meta =
      document.createElement("meta");

    meta.name = "theme-color";
    meta.content = "#ffd700";

    document.head.appendChild(meta);

  }


  /*
   * Service Worker
   */
  if (!("serviceWorker" in navigator)) {
    return;
  }


  window.addEventListener("load", async () => {

    try {

      const registration =
        await navigator.serviceWorker.register(
          "/GPHub-Philippines/sw.js",
          {
            scope: "/GPHub-Philippines/"
          }
        );


      console.log(
        "[PWA] Service Worker registered:",
        registration.scope
      );


      /*
       * Ask browser to check whether sw.js itself
       * has changed.
       */
      await registration.update();


      /*
       * If a new worker is already waiting,
       * activate it immediately.
       */
      if (registration.waiting) {

        console.log(
          "[PWA] Waiting Service Worker found."
        );

        registration.waiting.postMessage({
          type: "SKIP_WAITING"
        });

      }


      /*
       * Detect a new Service Worker.
       */
      registration.addEventListener(
        "updatefound",
        () => {

          const newWorker =
            registration.installing;

          if (!newWorker) {
            return;
          }


          newWorker.addEventListener(
            "statechange",
            () => {

              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {

                console.log(
                  "[PWA] New Service Worker installed."
                );

                newWorker.postMessage({
                  type: "SKIP_WAITING"
                });

              }

            }
          );

        }
      );


    } catch (error) {

      console.error(
        "[PWA] Service Worker registration failed:",
        error
      );

    }

  });


  /*
   * Listen for messages from sw.js.
   */
  navigator.serviceWorker.addEventListener(
    "message",
    (event) => {

      if (!event.data) {
        return;
      }


      if (
        event.data.type === "NEW_VERSION"
      ) {

        console.log(
          "[PWA] New version available:",
          event.data.version
        );


        /*
         * Prevent multiple reloads.
         */
        if (
          window.__goldenPrideReloading
        ) {
          return;
        }


        window.__goldenPrideReloading =
          true;


        /*
         * Reload after the new cache
         * has been prepared.
         */
        window.location.reload();

      }

    }
  );


  /*
   * When a new Service Worker takes control,
   * reload once.
   */
  let refreshing = false;

  navigator.serviceWorker.addEventListener(
    "controllerchange",
    () => {

      if (refreshing) {
        return;
      }

      refreshing = true;

      console.log(
        "[PWA] New Service Worker active. Reloading..."
      );

      window.location.reload();

    }
  );


  /*
   * Ask SW to check version whenever the page
   * becomes visible again.
   */
  document.addEventListener(
    "visibilitychange",
    () => {

      if (
        document.visibilityState === "visible" &&
        navigator.serviceWorker.controller
      ) {

        navigator.serviceWorker.controller.postMessage({
          type: "CHECK_VERSION"
        });

      }

    }
  );

})();


/* ============================================================
   OPTIONAL: CHECK VERSION WHEN PAGE LOADS
   ============================================================ */

window.addEventListener(
  "load",
  () => {

    setTimeout(() => {

      if (
        navigator.serviceWorker &&
        navigator.serviceWorker.controller
      ) {

        navigator.serviceWorker.controller.postMessage({
          type: "CHECK_VERSION"
        });

      }

    }, 2000);

  }
);
