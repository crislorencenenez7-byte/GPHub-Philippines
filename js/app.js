/* ============================================================
   app.js — Golden Pride Hub
   Shared utilities used across every page:
   - PWA setup
   - Install App prompt
   - Loading screen
   - Toast notifications
   - Mobile navigation toggle
   - Scroll-to-top button
   - Confirmation dialogs
   - Simple helper functions
   ============================================================ */


/* ============================================================
   PWA SETUP
   ============================================================ */

(function setupPWA() {

  // Inject manifest link if not already present
  if (!document.querySelector('link[rel="manifest"]')) {

    const link = document.createElement("link");

    link.rel = "manifest";
    link.href = "manifest.json";

    document.head.appendChild(link);
  }


  // Inject theme-color meta tag
  if (!document.querySelector('meta[name="theme-color"]')) {

    const meta = document.createElement("meta");

    meta.name = "theme-color";
    meta.content = "#ffd700";

    document.head.appendChild(meta);
  }


  // Register Service Worker
  if ("serviceWorker" in navigator) {

    window.addEventListener("load", () => {

      navigator.serviceWorker.register(
        "/GPHub-Philippines/sw.js",
        {
          scope: "/GPHub-Philippines/"
        }
      )

      .then((registration) => {

        console.log(
          "Golden Pride Hub Service Worker registered:",
          registration.scope
        );

      })

      .catch((error) => {

        console.error(
          "Service Worker registration failed:",
          error
        );

      });

    });

  }

})();


/* ============================================================
   INSTALL APP
   ============================================================ */

let deferredPrompt = null;


/*
   Get Install button after DOM is ready.
*/
function setupInstallButton() {

  const installBtn =
    document.getElementById("install-app-btn");


  // If this page doesn't contain the button,
  // simply do nothing.
  if (!installBtn) {

    console.log(
      "Install button not found on this page."
    );

    return;
  }


  // Hide button by default
  installBtn.hidden = true;


  /*
     Chrome / Edge / Android
     fires this when the website is installable.
  */
  window.addEventListener(
    "beforeinstallprompt",
    (event) => {

      console.log(
        "PWA install prompt available."
      );


      // Prevent automatic browser prompt
      event.preventDefault();


      // Save event for later
      deferredPrompt = event;


      // Show our custom Install App button
      installBtn.hidden = false;

    }
  );


  /*
     User clicks Install App
  */
  installBtn.addEventListener(
    "click",
    async () => {

      // No install prompt available
      if (!deferredPrompt) {

        console.log(
          "Install prompt is not available."
        );

        return;
      }


      // Show browser's native install prompt
      deferredPrompt.prompt();


      try {

        const result =
          await deferredPrompt.userChoice;


        console.log(
          "Install result:",
          result.outcome
        );

      } catch (error) {

        console.error(
          "Install prompt error:",
          error
        );

      }


      // Prompt can only be used once
      deferredPrompt = null;


      // Hide our button
      installBtn.hidden = true;

    }
  );


  /*
     Fired after successful installation.
  */
  window.addEventListener(
    "appinstalled",
    () => {

      console.log(
        "Golden Pride Hub installed successfully."
      );


      deferredPrompt = null;


      installBtn.hidden = true;


      // Optional notification
      if (typeof showToast === "function") {

        showToast(
          "Golden Pride Hub installed successfully!",
          "success"
        );

      }

    }
  );

}


/*
   Setup install button after HTML is loaded.
*/
if (document.readyState === "loading") {

  document.addEventListener(
    "DOMContentLoaded",
    setupInstallButton
  );

} else {

  setupInstallButton();

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


    if (!loader) return;


    setTimeout(() => {

      loader.classList.add("hide");


      setTimeout(
        () => {

          loader.style.display = "none";

        },
        400
      );

    }, 400);

  }
);


/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */

/**
 * Shows a toast notification.
 *
 * @param {string} message
 * @param {"success"|"error"|"info"|"warning"} type
 */

function showToast(
  message,
  type = "info"
) {

  let container =
    document.getElementById(
      "toast-container"
    );


  // Create container if missing
  if (!container) {

    container =
      document.createElement("div");

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
    document.createElement("div");


  toast.className =
    `toast toast-${type}`;


  /*
     Use textContent for user-controlled
     message instead of directly trusting HTML.
  */
  const icon =
    document.createElement("i");

  icon.className =
    `fa-solid ${
      icons[type] || icons.info
    }`;


  const text =
    document.createElement("span");

  text.textContent = message;


  toast.appendChild(icon);
  toast.appendChild(text);


  container.appendChild(toast);


  requestAnimationFrame(() => {

    toast.classList.add("show");

  });


  setTimeout(() => {

    toast.classList.remove("show");


    setTimeout(
      () => toast.remove(),
      300
    );

  }, 3500);

}


/* ============================================================
   CONFIRMATION DIALOG
   ============================================================ */

/**
 * Returns a Promise<boolean>
 * resolved according to user choice.
 *
 * @param {string} message
 */

function confirmDialog(
  message = "Are you sure?"
) {

  return new Promise(
    (resolve) => {

      const overlay =
        document.createElement("div");


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


      // Safely insert message
      overlay.querySelector("p")
        .textContent = message;


      document.body.appendChild(
        overlay
      );


      requestAnimationFrame(() => {

        overlay.classList.add(
          "show"
        );

      });


      const close = (
        result
      ) => {

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
            event.target === overlay
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
        () => {

          navMenu.classList.toggle(
            "open"
          );


          navToggle.classList.toggle(
            "active"
          );

        }
      );

    }


    /*
       Sidebar
    */

    const sidebarToggle =
      document.querySelector(
        ".sidebar-toggle"
      );


    const sidebar =
      document.querySelector(
        ".sidebar"
      );


    if (
      sidebarToggle &&
      sidebar
    ) {

      sidebarToggle.addEventListener(
        "click",
        () => {

          sidebar.classList.toggle(
            "open"
          );

        }
      );

    }

  }
);


/* ============================================================
   SCROLL TO TOP
   ============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const btn =
      document.getElementById(
        "scroll-top"
      );


    if (!btn) return;


    window.addEventListener(
      "scroll",
      () => {

        btn.classList.toggle(
          "visible",
          window.scrollY > 400
        );

      }
    );


    btn.addEventListener(
      "click",
      () => {

        window.scrollTo({

          top: 0,

          behavior: "smooth"

        });

      }
    );

  }
);


/* ============================================================
   HELPERS
   ============================================================ */


/*
   Escape user-generated text before
   inserting into innerHTML.
*/

function sanitize(
  str = ""
) {

  const div =
    document.createElement(
      "div"
    );


  div.textContent = str;


  return div.innerHTML;

}


/*
   Format Firestore Timestamp
   or JavaScript Date.
*/

function formatDate(
  timestamp
) {

  if (!timestamp) return "";


  const date =
    timestamp.toDate
      ? timestamp.toDate()
      : new Date(timestamp);


  return date.toLocaleDateString(
    "en-PH",
    {

      year: "numeric",

      month: "long",

      day: "numeric"

    }
  );

}


/*
   Debounce helper
*/

function debounce(
  fn,
  delay = 300
) {

  let timer;


  return (
    ...args
  ) => {

    clearTimeout(timer);


    timer =
      setTimeout(
        () => fn(...args),
        delay
      );

  };

}


/*
   Get initials from full name.
*/

function getInitials(
  name = ""
) {

  return name

    .trim()

    .split(/\s+/)

    .filter(Boolean)

    .map(
      (n) => n[0]
    )

    .join("")

    .substring(0, 2)

    .toUpperCase();

}
