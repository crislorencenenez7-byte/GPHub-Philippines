(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  function hideLoader() {
    const loader = $("loading-screen");
    if (loader) {
      loader.classList.add("hide");
      setTimeout(() => loader.remove(), 500);
    }
  }

  // Never allow a network/Firebase problem to leave the loader forever.
  window.addEventListener("load", hideLoader);
  setTimeout(hideLoader, 2500);

  $("year").textContent = new Date().getFullYear();

  // Mobile navigation
  const toggle = $("nav-toggle");
  const menu = $("nav-menu");

  function closeMenu() {
    if (!menu || !toggle) return;
    menu.classList.remove("open");
    toggle.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  }

  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      const open = !menu.classList.contains("open");
      menu.classList.toggle("open", open);
      toggle.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("menu-open", open);
    });

    menu.querySelectorAll("a").forEach(a => a.addEventListener("click", closeMenu));
    window.addEventListener("resize", () => {
      if (window.innerWidth > 900) closeMenu();
    });
  }

  // Release banner
  async function loadRelease() {
    const target = $("release-text");
    try {
      const res = await fetch("version.json?ts=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error("version.json " + res.status);
      const data = await res.json();
      target.textContent = data.updateName
        ? `${data.updateName}${data.version ? " • Version " + data.version : ""}`
        : "Golden Pride Hub";
    } catch {
      target.textContent = "Golden Pride Hub";
    }
  }

  // Countdown — deliberately uses the update-1.4 BRANCH, not a folder
  // in the published main branch.
  const UPDATE_URL =
    "https://raw.githubusercontent.com/crislorencenenez7-byte/GPHub-Philippines/update-1.4/update.json";

  let releaseMs = null;
  let updateData = null;

  const pad = n => String(Math.max(0, n)).padStart(2, "0");

  function renderCountdown() {
    if (!Number.isFinite(releaseMs)) return;

    const diff = releaseMs - Date.now();
    const card = $("update-card");

    if (diff <= 0) {
      $("days").textContent = "00";
      $("hours").textContent = "00";
      $("minutes").textContent = "00";
      $("seconds").textContent = "00";
      $("update-status").textContent =
        `${updateData?.updateName || "Update"} is now live.`;
      card?.classList.add("update-live");
      return;
    }

    card?.classList.remove("update-live");

    const total = Math.floor(diff / 1000);
    $("days").textContent = pad(Math.floor(total / 86400));
    $("hours").textContent = pad(Math.floor((total % 86400) / 3600));
    $("minutes").textContent = pad(Math.floor((total % 3600) / 60));
    $("seconds").textContent = pad(total % 60);

    $("update-status").textContent =
      `Releasing ${updateData.releaseDate} at ${updateData.releaseTime} PH`;
  }

  async function loadUpdate() {
    try {
      const res = await fetch(UPDATE_URL + "?ts=" + Date.now(), {
        cache: "no-store"
      });
      if (!res.ok) throw new Error("update.json " + res.status);

      const data = await res.json();

      if (!data.releaseDate || !data.releaseTime) {
        throw new Error("Missing releaseDate/releaseTime");
      }

      const releaseString =
        `${data.releaseDate}T${data.releaseTime}:00+08:00`;
      const parsed = new Date(releaseString).getTime();

      if (!Number.isFinite(parsed)) {
        throw new Error("Invalid release date/time");
      }

      updateData = data;
      releaseMs = parsed;

      $("update-title").textContent =
        data.updateName || "Scheduled Update";
      $("update-description").textContent =
        data.version ? `Version ${data.version}` : "Upcoming release";
      $("update-version").textContent =
        data.version ? `UPDATE ${data.version}` : "UPDATE";

      renderCountdown();
    } catch (err) {
      console.error("Countdown load failed:", err);
      $("update-title").textContent = "Release schedule unavailable";
      $("update-description").textContent =
        "The countdown source could not be reached.";
      $("update-status").textContent =
        "Check the update-1.4 branch and update.json.";
    }
  }

  loadRelease();
  loadUpdate();

  // Refresh the JSON occasionally so editing the schedule is reflected.
  setInterval(loadUpdate, 30000);
  setInterval(renderCountdown, 1000);

  // Scroll-to-top
  const top = $("scroll-top");
  window.addEventListener("scroll", () => {
    top?.classList.toggle("show", window.scrollY > 500);
  }, { passive: true });
  top?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  // Service worker: register only; no forced reload loop.
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(err =>
        console.warn("Service worker registration failed:", err)
      );
    });
  }
})();
