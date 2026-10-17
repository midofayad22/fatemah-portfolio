/* PWA: service-worker registration + update prompt, online/offline status, install flow. */

const $ = (s, r = document) => r.querySelector(s);

let strings = {};
try {
  strings = JSON.parse(($("#pwa-strings") || {}).textContent || "{}");
} catch (e) {
  strings = {};
}

/* ------------------------------------------------------------------ toast */
function toast(message, action) {
  const region = $("#toast-region");
  if (!region) return null;
  const el = document.createElement("div");
  el.className = "toast";
  const text = document.createElement("span");
  text.textContent = message;
  el.append(text);

  const remove = () => el.remove();
  if (action) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = action.label;
    btn.addEventListener("click", () => {
      action.run();
      remove();
    });
    el.append(btn);
  }
  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.textContent = strings.dismiss || "OK";
  dismiss.addEventListener("click", remove);
  el.append(dismiss);

  region.append(el);
  if (!action) window.setTimeout(remove, 6000);
  return el;
}

/* --------------------------------------------------------- service worker */
function initServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const secure = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if (!secure) return;

  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        const promptUpdate = (worker) => {
          toast(strings.updateReady || "A new version is available.", {
            label: strings.refresh || "Refresh",
            run: () => worker.postMessage("SKIP_WAITING"),
          });
        };
        // an update was already downloaded while the page was closed
        if (reg.waiting && navigator.serviceWorker.controller) promptUpdate(reg.waiting);

        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) promptUpdate(worker);
          });
        });

        // look for a new deployment whenever the tab becomes visible again
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") reg.update().catch(() => {});
        });
      })
      .catch(() => {
        /* registration failed: the site keeps working online without offline support */
      });
  });
}

/* ------------------------------------------------------- online / offline */
function initConnectivity() {
  let wasOffline = !navigator.onLine;
  if (wasOffline) toast(strings.offline || "You are offline.");
  window.addEventListener("offline", () => {
    wasOffline = true;
    toast(strings.offline || "You are offline.");
  });
  window.addEventListener("online", () => {
    if (wasOffline) toast(strings.online || "You are back online.");
    wasOffline = false;
  });
}

/* ---------------------------------------------------------------- install */
function initInstall() {
  const dialog = $("#install-dialog");
  const openers = Array.from(document.querySelectorAll("[data-install-open]"));
  if (!dialog || !openers.length) return;

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    window.navigator.standalone === true;

  const nowBtn = $("[data-install-now]", dialog);
  const installed = $("[data-install-installed]", dialog);
  const steps = $("[data-install-steps]", dialog);
  let deferred = null;

  if (standalone) {
    openers.forEach((o) => {
      o.hidden = true;
    });
    return;
  }

  openers.forEach((o) => {
    o.hidden = false;
  });

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    if (nowBtn) nowBtn.hidden = false;
  });

  window.addEventListener("appinstalled", () => {
    deferred = null;
    if (nowBtn) nowBtn.hidden = true;
    if (installed) installed.hidden = false;
    if (steps) steps.hidden = true;
    openers.forEach((o) => {
      o.hidden = true;
    });
    if (dialog.open) dialog.close();
  });

  openers.forEach((o) =>
    o.addEventListener("click", () => {
      if (typeof dialog.showModal === "function") dialog.showModal();
    }),
  );

  if (nowBtn) {
    nowBtn.addEventListener("click", async () => {
      if (!deferred) return;
      deferred.prompt();
      try {
        await deferred.userChoice;
      } catch (e) {
        /* ignore */
      }
      deferred = null;
      nowBtn.hidden = true;
      dialog.close();
    });
  }

  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.querySelectorAll("[data-dialog-close]").forEach((b) => b.addEventListener("click", () => dialog.close()));
}

export function initPwa() {
  initServiceWorker();
  initConnectivity();
  initInstall();
}
