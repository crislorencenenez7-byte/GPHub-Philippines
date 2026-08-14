/* ============================================================
   app.js — Golden Pride Hub
   Rebuilt core UI controller

   Goals:
   - NEVER leave #loading-screen stuck forever.
   - Mobile navigation.
   - Scroll-to-top button.
   - Safe toast/confirm helpers for existing pages.
   - Safe Service Worker registration.
   - No controllerchange reload loop.
   ============================================================ */

(() => {
  "use strict";

  const CONFIG = Object.freeze({
    serviceWorker: "./sw.js",
    swTimeoutMs: 3500
  });

  /* ------------------------------------------------------------
     Loading screen
     The public page must remain usable even if Firebase,
     Firestore, an image, or a network request fails.
     ------------------------------------------------------------ */

  function hideLoadingScreen() {
    const screen = document.getElementById("loading-screen");
    if (!screen) return;

    screen.classList.add("hide");

    window.setTimeout(() => {
      screen.remove();
    }, 500);
  }

  function scheduleLoaderSafety() {
    /* Hard upper bound: no infinite spinner. */
    window.setTimeout(hideLoadingScreen, 1800);
  }

  document.addEventListener("DOMContentLoaded", () => {
    hideLoadingScreen();
    scheduleLoaderSafety();
  });

  window.addEventListener("load", hideLoadingScreen);

  /* ------------------------------------------------------------
     Mobile navigation
     ------------------------------------------------------------ */

  function initNavigation() {
    const toggle = document.querySelector(".nav-toggle");
    const menu = document.querySelector(".nav-menu");

    if (!toggle || !menu) return;

    toggle.addEventListener("click", () => {
      const open = menu.classList.toggle("open");
      toggle.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });

    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        menu.classList.remove("open");
        toggle.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ------------------------------------------------------------
     Scroll to top
     ------------------------------------------------------------ */

  function initScrollTop() {
    const button = document.getElementById("scroll-top");
    if (!button) return;

    const sync = () => {
      button.classList.toggle("visible", window.scrollY > 450);
    };

    window.addEventListener("scroll", sync, { passive: true });

    button.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    });

    sync();
  }

  /* ------------------------------------------------------------
     Gold bubble animation
     Created with CSS spans already present in index.html.
     This helper only adds a little pointer parallax on desktop.
     ------------------------------------------------------------ */

  function initBubbleParallax() {
    const bubbles = document.querySelectorAll(".gold-bubbles span");
    if (!bubbles.length || window.matchMedia("(pointer: coarse)").matches) {
      return;
    }

    let raf = null;
    let mouseX = 0;
    let mouseY = 0;

    window.addEventListener("mousemove", (event) => {
      mouseX = (event.clientX / window.innerWidth) - 0.5;
      mouseY = (event.clientY / window.innerHeight) - 0.5;

      if (raf) return;

      raf = requestAnimationFrame(() => {
        bubbles.forEach((bubble, index) => {
          const strength = 4 + (index % 5);
          bubble.style.setProperty(
            "--mx",
            `${mouseX * strength}px`
          );
          bubble.style.setProperty(
            "--my",
            `${mouseY * strength}px`
          );
        });

        raf = null;
      });
    }, { passive: true });
  }

  /* ------------------------------------------------------------
     Toast helper
     Existing pages can continue calling showToast().
     ------------------------------------------------------------ */

  function showToast(message, type = "info", duration = 3200) {
    let container = document.getElementById("toast-container");

    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    const iconMap = {
      success: "fa-circle-check",
      error: "fa-circle-xmark",
      warning: "fa-triangle-exclamation",
      info: "fa-circle-info"
    };

    const icon = iconMap[type] || iconMap.info;

    toast.innerHTML = `
      <i class="fa-solid ${icon}" aria-hidden="true"></i>
      <span></span>
    `;

    toast.querySelector("span").textContent = String(message);
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("show"));

    window.setTimeout(() => {
      toast.classList.remove("show");
      window.setTimeout(() => toast.remove(), 350);
    }, duration);
  }

  window.showToast = showToast;

  /* ------------------------------------------------------------
     Confirm helper
     Existing auth/admin pages may call confirmDialog().
     ------------------------------------------------------------ */

  function confirmDialog(message = "Are you sure?") {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "confirm-overlay show";

      overlay.innerHTML = `
        <div class="confirm-box glass">
          <p></p>
          <div class="confirm-actions">
            <button type="button" class="btn btn-outline" data-confirm="no">
              Cancel
            </button>
            <button type="button" class="btn btn-primary" data-confirm="yes">
              Confirm
            </button>
          </div>
        </div>
      `;

      overlay.querySelector("p").textContent = String(message);
      document.body.appendChild(overlay);

      const finish = (value) => {
        overlay.remove();
        resolve(value);
      };

      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) finish(false);

        const action = event.target.closest("[data-confirm]");
        if (!action) return;

        finish(action.dataset.confirm === "yes");
      });
    });
  }

  window.confirmDialog = confirmDialog;

  /* ------------------------------------------------------------
     Service Worker
     IMPORTANT:
     Do NOT force window.location.reload() from controllerchange.
     That pattern can cause an infinite reload loop on GitHub Pages.
     ------------------------------------------------------------ */

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.register(
        CONFIG.serviceWorker,
        { scope: "./" }
      );

      console.log(
        "[SW] registered:",
        registration.scope
      );

      /* Ask a waiting worker to activate when the user explicitly
         returns to the page after an update. No reload loop. */
      if (registration.waiting) {
        console.log("[SW] update waiting.");
      }

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;

        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            console.log("[SW] new version installed; refresh when convenient.");
          }
        });
      });

      /* Low-frequency update check. */
      window.setTimeout(() => {
        registration.update().catch(() => {});
      }, 15000);
    } catch (error) {
      console.warn("[SW] registration skipped:", error);
    }
  }

  /* ------------------------------------------------------------
     Initialization
     ------------------------------------------------------------ */

  document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
    initScrollTop();
    initBubbleParallax();

    /* Start SW after the visible UI is already available. */
    window.setTimeout(registerServiceWorker, 250);
  });
})();
