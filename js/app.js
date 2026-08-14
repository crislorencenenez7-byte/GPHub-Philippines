/* ============================================================
   app.js — Golden Pride Hub

   Shared utilities:
   - PWA setup
   - Service worker registration
   - PWA update detection
   - Install App button
   - version.json checking
   - Loading screen
   - Toast notifications
   - Mobile navigation
   - Scroll-to-top
   - Confirmation dialogs
   - Helper functions
   ============================================================ */


/* ============================================================
   CONFIG
   ============================================================ */

const GPHUB_BASE_PATH = "/GPHub-Philippines/";

const SERVICE_WORKER_PATH =
  `${GPHUB_BASE_PATH}sw.js`;

const VERSION_CHECK_INTERVAL =
  30000; // 30 seconds


/* ============================================================
   PWA SETUP
   ============================================================ */

let serviceWorkerRegistration = null;

async function setupPWA() {

  if (!("serviceWorker" in navigator)) {

    console.warn(
      "Service Worker is not supported."
    );

    return;

  }

  try {

    serviceWorkerRegistration =
      await navigator.serviceWorker.register(
        SERVICE_WORKER_PATH,
        {
          scope: GPHUB_BASE_PATH,
          updateViaCache: "none"
        }
      );

    console.log(
      "Golden Pride Hub Service Worker registered:",
      serviceWorkerRegistration.scope
    );


    /*
       Ask browser to check for a newer
       service worker.
    */

    await serviceWorkerRegistration.update();


    /*
       When a new service worker is found,
       reload after it takes control.
    */

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => {

        if (
          window.__gphubReloading
        ) {

          return;

        }

        window.__gphubReloading = true;

        window.location.reload();

      }
    );


  } catch (error) {

    console.error(
      "Service Worker registration failed:",
      error
    );

  }

}


if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    setupPWA
  );

} else {

  setupPWA();

}


/* ============================================================
   INSTALL APP
   ============================================================ */

let deferredInstallPrompt = null;


/*
   Check if app is already running
   in standalone / installed mode.
*/

function isAppInstalled() {

  return (
    window.matchMedia(
      "(display-mode: standalone)"
    ).matches ||
    window.navigator.standalone === true
  );

}


/*
   Setup Install button.
*/

function setupInstallButton() {

  const installButton =
    document.getElementById(
      "install-app-btn"
    );


  if (!installButton) {

    return;

  }


  /*
     Hidden until browser says
     installation is available.
  */

  installButton.hidden = true;


  /*
     If already installed,
     don't show the button.
  */

  if (isAppInstalled()) {

    return;

  }


  /*
     Chromium-based browsers fire this
     when the PWA becomes installable.
  */

  window.addEventListener(
    "beforeinstallprompt",
    (event) => {

      console.log(
        "PWA install prompt available."
      );


      event.preventDefault();


      deferredInstallPrompt =
        event;


      installButton.hidden =
        false;

    }
  );


  /*
     Install button click.
  */

  installButton.addEventListener(
    "click",
    async () => {

      if (!deferredInstallPrompt) {

        console.log(
          "Install prompt is not available yet."
        );

        return;

      }


      const promptEvent =
        deferredInstallPrompt;


      /*
         Prompt can only be used once.
      */

      deferredInstallPrompt =
        null;


      try {

        await promptEvent.prompt();


        const result =
          await promptEvent.userChoice;


        console.log(
          "PWA install result:",
          result.outcome
        );


        if (
          result.outcome === "accepted"
        ) {

          installButton.hidden =
            true;

        }

      } catch (error) {

        console.error(
          "PWA install prompt error:",
          error
        );

      }

    }
  );


  /*
     Successful installation.
  */

  window.addEventListener(
    "appinstalled",
    () => {

      console.log(
        "Golden Pride Hub installed."
      );


      deferredInstallPrompt =
        null;


      installButton.hidden =
        true;


      if (
        typeof showToast ===
        "function"
      ) {

        showToast(
          "Golden Pride Hub installed successfully!",
          "success"
        );

      }

    }
  );

}


if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    setupInstallButton
  );

} else {

  setupInstallButton();

}


/* ============================================================
   VERSION CHECK
   ============================================================ */

let currentAppVersion =
  null;

let currentUpdateName =
  null;


async function checkForNewVersion() {

  try {

    const response =
      await fetch(
        `${GPHUB_BASE_PATH}version.json?ts=${Date.now()}`,
        {
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );

    }


    const data =
      await response.json();


    if (!data.version) {

      console.warn(
        "version.json does not contain a version."
      );

      return;

    }


    /*
       First successful check.
    */

    if (
      currentAppVersion === null
    ) {

      currentAppVersion =
        data.version;

      currentUpdateName =
        data.updateName || "";

      console.log(
        "Current GPHub version:",
        currentAppVersion
      );

      return;

    }


    /*
       New version detected.
    */

    if (
      data.version !==
      currentAppVersion
    ) {

      console.log(
        `New version detected: ${currentAppVersion} → ${data.version}`
      );


      /*
         Tell service worker to clear
         its old runtime caches.
      */

      if (
        navigator.serviceWorker &&
        navigator.serviceWorker.controller
      ) {

        navigator.serviceWorker.controller.postMessage(
          {
            type:
              "CLEAR_APP_CACHE"
          }
        );

      }


      /*
         Ask service worker registration
         to check immediately.
      */

      if (
        serviceWorkerRegistration
      ) {

        try {

          await serviceWorkerRegistration.update();

        } catch (error) {

          console.warn(
            "Service worker update check failed:",
            error
          );

        }

      }


      /*
         Reload after a short delay
         so the new version can take over.
      */

      setTimeout(() => {

        window.location.reload();

      }, 500);

    }

  } catch (error) {

    console.warn(
      "Version check failed:",
      error
    );

  }

}


function startVersionChecker() {

  checkForNewVersion();


  setInterval(
    checkForNewVersion,
    VERSION_CHECK_INTERVAL
  );

}


if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    startVersionChecker
  );

} else {

  startVersionChecker();

}


/* ============================================================
   LOADING SCREEN
   ============================================================ */

window.addEventListener(
  "load",
  () => {

    const loader =
      document.getElementById(
        "loading-screen"
      );


    if (!loader) {

      return;

    }


    setTimeout(() => {

      loader.classList.add(
        "hide"
      );


      setTimeout(() => {

        loader.style.display =
          "none";

      }, 400);

    }, 400);

  }
);


/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */

function showToast(
  message,
  type = "info"
) {

  let container =
    document.getElementById(
      "toast-container"
    );


  if (!container) {

    container =
      document.createElement(
        "div"
      );

    container.id =
      "toast-container";

    document.body.appendChild(
      container
    );

  }


  const icons = {

    success:
      "fa-circle-check",

    error:
      "fa-circle-xmark",

    info:
      "fa-circle-info",

    warning:
      "fa-triangle-exclamation"

  };


  const toast =
    document.createElement(
      "div"
    );


  toast.className =
    `toast toast-${type}`;


  const icon =
    document.createElement(
      "i"
    );

  icon.className =
    `fa-solid ${
      icons[type] || icons.info
    }`;


  const text =
    document.createElement(
      "span"
    );

  text.textContent =
    message;


  toast.appendChild(icon);
  toast.appendChild(text);

  container.appendChild(
    toast
  );


  requestAnimationFrame(() => {

    toast.classList.add(
      "show"
    );

  });


  setTimeout(() => {

    toast.classList.remove(
      "show"
    );


    setTimeout(
      () => toast.remove(),
      300
    );

  }, 3500);

}


/* ============================================================
   CONFIRMATION DIALOG
   ============================================================ */

function confirmDialog(
  message = "Are you sure?"
) {

  return new Promise(
    (resolve) => {

      const overlay =
        document.createElement(
          "div"
        );


      overlay.className =
        "confirm-overlay";


      overlay.innerHTML = `
        <div class="confirm-box glass">

          <p></p>

          <div class="confirm-actions">

            <button
              class="btn btn-outline"
              id="confirm-cancel">
              Cancel
            </button>

            <button
              class="btn btn-primary"
              id="confirm-ok">
              Confirm
            </button>

          </div>

        </div>
      `;


      overlay.querySelector(
        "p"
      ).textContent =
        message;


      document.body.appendChild(
        overlay
      );


      requestAnimationFrame(() => {

        overlay.classList.add(
          "show"
        );

      });


      const close =
        (result) => {

          overlay.classList.remove(
            "show"
          );


          setTimeout(
            () => overlay.remove(),
            250
          );


          resolve(result);

        };


      overlay
        .querySelector(
          "#confirm-ok"
        )
        .addEventListener(
          "click",
          () => close(true)
        );


      overlay
        .querySelector(
          "#confirm-cancel"
        )
        .addEventListener(
          "click",
          () => close(false)
        );


      overlay.addEventListener(
        "click",
        (event) => {

          if (
            event.target ===
            overlay
          ) {

            close(false);

          }

        }
      );

    }
  );

}


/* ============================================================
   MOBILE NAVIGATION
   ============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const navToggle =
      document.querySelector(
        ".nav-toggle"
      );


    const navMenu =
      document.querySelector(
        ".nav-menu"
      );


    if (
      navToggle &&
      navMenu
    ) {

      navToggle.addEventListener(
        "click",
