(() => {
  "use strict";

  const VERSION = "3.4";
  const UPDATE_URL = "update-1.4/update.json";
  const VERSION_URL = "version.json";

  const $ = id => document.getElementById(id);

  function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
  }

  async function fetchJson(url) {
    const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}ts=${Date.now()}`, {
      cache: "no-store",
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
    return response.json();
  }

  function parseReleaseDate(date, time) {
    if (!date || !time) throw new Error("releaseDate/releaseTime missing");
    const iso = `${date}T${time}:00+08:00`;
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid release date/time: ${iso}`);
    return parsed;
  }

  function renderCountdown(target, update) {
    const diff = target.getTime() - Date.now();

    if (diff <= 0) {
      setText("days", "0");
      setText("hours", "0");
      setText("minutes", "0");
      setText("seconds", "0");
      setText("update-status", `${update.updateName || "Update"} • UPDATE IS NOW LIVE!`);
      return true;
    }

    const total = Math.floor(diff / 1000);
    setText("days", Math.floor(total / 86400));
    setText("hours", Math.floor((total % 86400) / 3600));
    setText("minutes", Math.floor((total % 3600) / 60));
    setText("seconds", total % 60);
    setText("update-status", `Releasing ${update.releaseDate} at ${update.releaseTime} PH`);
    return false;
  }

  async function loadUpdate() {
    try {
      const update = await fetchJson(UPDATE_URL);

      setText("update-name", update.updateName || "Upcoming Update");
      setText("update-description", update.description || `Version ${update.version || VERSION}`);
      setText("update-version", `VERSION ${update.version || VERSION}`);

      const target = parseReleaseDate(update.releaseDate, update.releaseTime);

      if (renderCountdown(target, update)) return;

      const timer = setInterval(() => {
        if (renderCountdown(target, update)) clearInterval(timer);
      }, 1000);
    } catch (error) {
      console.error("Countdown error:", error);
      setText("update-name", "Update schedule unavailable");
      setText("update-description", "The countdown could not read the update schedule.");
      setText("update-version", `VERSION ${VERSION}`);
      setText("update-status", "Check update-1.4/update.json");
      const status = $("update-status");
      if (status) status.classList.add("update-error");
    }
  }

  async function loadReleaseBanner() {
    try {
      const data = await fetchJson(VERSION_URL);
      const version = data.version || VERSION;
      const name = data.updateName || "Latest Release";
      setText("release-banner", `UPDATE ${version} IS LIVE — ${name}`);
    } catch (error) {
      console.warn("Release banner error:", error);
      setText("release-banner", `GOLDEN PRIDE HUB • VERSION ${VERSION}`);
    }
  }

  function setupNav() {
    const toggle = document.querySelector(".nav-toggle");
    const menu = document.querySelector(".nav-menu");
    if (!toggle || !menu) return;
    toggle.addEventListener("click", () => menu.classList.toggle("open"));
  }

  function setupYear() {
    setText("year", new Date().getFullYear());
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    try {
      await navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" });
    } catch (error) {
      console.warn("Service worker registration failed:", error);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupYear();
    setupNav();
    loadReleaseBanner();
    loadUpdate();
    registerServiceWorker();
  });
})();
