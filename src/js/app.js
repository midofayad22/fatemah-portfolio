import { initPwa } from "./pwa.js";

const doc = document.documentElement;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const safeGet = (k) => {
  try {
    return localStorage.getItem(k);
  } catch (e) {
    return null;
  }
};
const safeSet = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch (e) {
    /* storage unavailable (private mode): the choice simply won't persist */
  }
};

/* ------------------------------------------------------------------ theme */
function applyTheme(theme, persist) {
  doc.setAttribute("data-theme", theme);
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#021526" : "#fef9fc");
  $$("[data-theme-toggle]").forEach((btn) => {
    btn.setAttribute("aria-label", theme === "dark" ? btn.dataset.toLight : btn.dataset.toDark);
  });
  if (persist) safeSet("fe-theme", theme);
}

function initTheme() {
  applyTheme(doc.getAttribute("data-theme") || "light", false);
  $$("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = doc.getAttribute("data-theme") === "dark" ? "light" : "dark";
      if (!reduceMotion()) {
        doc.classList.add("theme-anim");
        window.setTimeout(() => doc.classList.remove("theme-anim"), 400);
      }
      applyTheme(next, true);
    });
  });
  // follow the system until the visitor makes an explicit choice
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = (e) => {
    const stored = safeGet("fe-theme");
    if (stored !== "light" && stored !== "dark") applyTheme(e.matches ? "dark" : "light", false);
  };
  if (mq.addEventListener) mq.addEventListener("change", onChange);
}

/* ------------------------------------------------------------ mobile menu */
function initMenu() {
  const btn = $("[data-menu-toggle]");
  const nav = $("#site-nav");
  if (!btn || !nav) return;

  const set = (open) => {
    nav.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? btn.dataset.closeLabel : btn.dataset.openLabel);
  };

  btn.addEventListener("click", () => set(btn.getAttribute("aria-expanded") !== "true"));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && btn.getAttribute("aria-expanded") === "true") {
      set(false);
      btn.focus();
    }
  });

  document.addEventListener("click", (e) => {
    if (btn.getAttribute("aria-expanded") !== "true") return;
    if (!nav.contains(e.target) && !btn.contains(e.target)) set(false);
  });

  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) set(false);
  });

  window.matchMedia("(min-width: 861px)").addEventListener("change", (e) => {
    if (e.matches) set(false);
  });
}

/* --------------------------------------------------------- scroll reveals */
function initReveal() {
  const els = $$(".reveal");
  if (!els.length) return;
  if (!("IntersectionObserver" in window) || reduceMotion()) {
    els.forEach((el) => el.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -6% 0px", threshold: 0.08 },
  );
  els.forEach((el) => io.observe(el));
}

/* --------------------------------------------------------------- language */
function initLanguage() {
  const links = $$("[data-lang-switch]");
  links.forEach((a) => {
    const base = a.getAttribute("href");
    a.addEventListener("click", () => {
      // carry over the current filter / opened image and the scroll position
      a.setAttribute("href", base + location.search + location.hash);
      safeSet("fe-lang", a.dataset.langSwitch);
      try {
        sessionStorage.setItem("fe-scroll", JSON.stringify({ y: window.scrollY, path: base }));
      } catch (e) {
        /* ignore */
      }
    });
  });

  try {
    const raw = sessionStorage.getItem("fe-scroll");
    if (raw) {
      sessionStorage.removeItem("fe-scroll");
      const saved = JSON.parse(raw);
      if (saved && saved.path === location.pathname && saved.y > 0) {
        window.scrollTo(0, saved.y);
      }
    }
  } catch (e) {
    /* ignore */
  }
}

/* ------------------------------------------------------- image fade-in */
function initImages() {
  $$(".fade-img").forEach((box) => {
    const img = $("img", box);
    if (!img) return;
    const done = () => box.classList.add("is-loaded");
    if (img.complete && img.naturalWidth > 0) done();
    else {
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
      window.setTimeout(done, 8000); // never leave a permanent shimmer
    }
  });
}

/* ----------------------------------------------------------------- misc */
function initMisc() {
  const year = String(new Date().getFullYear());
  $$("[data-year]").forEach((el) => {
    el.textContent = year;
  });
}

initTheme();
initMenu();
initReveal();
initImages();
initLanguage();
initMisc();
initPwa();
