/* Gallery: filtering, deep links, lightbox (keyboard, swipe, history, focus management). */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const doc = document.documentElement;
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isRtl = () => doc.getAttribute("dir") === "rtl";

const root = $("[data-gallery]");
if (root) init(root);

function init(root) {
  const strings = JSON.parse($("#gallery-strings").textContent);
  const grid = $(".masonry", root);
  const status = $(".gallery-status", root);
  const empty = $(".gallery-empty", root);
  const chips = $$(".chip", root);
  const items = $$(".work", grid).map((li, index) => ({
    li,
    index,
    id: li.dataset.id,
    cat: li.dataset.cat,
    slug: li.dataset.slug,
    widths: li.dataset.widths.split(",").map(Number),
    hash: li.dataset.hash,
    w: Number(li.dataset.w),
    h: Number(li.dataset.h),
    alt: li.querySelector("img").getAttribute("alt") || "",
    link: li.querySelector("a"),
  }));
  const total = items.length;
  const byId = new Map(items.map((i) => [i.id, i]));
  const catNames = strings.categories;

  const fmt = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : ""));

  /* ----------------------------------------------------------- filtering */
  let activeCat = "all";
  const visible = () => items.filter((i) => !i.li.hidden);

  function updateUrl(extra) {
    const p = new URLSearchParams();
    if (activeCat !== "all") p.set("cat", activeCat);
    if (extra) p.set("work", extra);
    const qs = p.toString();
    return location.pathname + (qs ? "?" + qs : "");
  }

  function applyFilter(cat, { animate = true, updateHistory = true } = {}) {
    if (cat !== "all" && !catNames[cat]) cat = "all";
    activeCat = cat;

    const run = () => {
      items.forEach((i) => {
        i.li.hidden = cat !== "all" && i.cat !== cat;
      });
      const shown = visible();
      shown.forEach((i, n) => i.li.style.setProperty("--i", String(Math.min(n, 14))));
      chips.forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.filter === cat)));
      status.textContent = fmt(strings.count, { n: shown.length, total });
      empty.hidden = shown.length !== 0;
      grid.hidden = shown.length === 0;
      if (animate && !reduceMotion()) {
        grid.classList.remove("is-switching");
        grid.classList.add("is-entering");
        window.setTimeout(() => grid.classList.remove("is-entering"), 900);
      } else {
        grid.classList.remove("is-switching");
      }
    };

    if (animate && !reduceMotion()) {
      grid.classList.add("is-switching");
      window.setTimeout(run, 150);
    } else {
      run();
    }
    if (updateHistory) history.replaceState(history.state, "", updateUrl());
  }

  chips.forEach((chip) => chip.addEventListener("click", () => applyFilter(chip.dataset.filter)));

  /* -------------------------------------------------------- broken images */
  items.forEach((i) => {
    const img = i.li.querySelector("img");
    const mark = () => i.li.classList.add("is-broken");
    img.addEventListener("error", mark);
    if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) mark();
  });

  /* ------------------------------------------------------------ lightbox */
  const dlg = $("#lightbox");
  const figure = $(".lb-figure", dlg);
  const counter = $(".lb-counter", dlg);
  const prevBtn = $('[data-lb="prev"]', dlg);
  const nextBtn = $('[data-lb="next"]', dlg);
  const closeBtn = $('[data-lb="close"]', dlg);
  const infoBtn = $('[data-lb="info"]', dlg);
  const infoPanel = $("#lb-info", dlg);
  const infoCat = $(".lb-cat", dlg);
  const infoAlt = $(".lb-alt", dlg);
  const infoText = $(".lb-btn-text", infoBtn);
  const stage = $(".lb-stage", dlg);

  let list = [];
  let pos = 0;
  let pushed = false;
  const keep = []; // references to preloading pictures so they are not garbage-collected mid-load

  function srcset(item, ext) {
    return item.widths.map((w) => `/img/${item.slug}-${w}.${item.hash}.${ext} ${w}w`).join(", ");
  }

  function buildPicture(item) {
    const pic = document.createElement("picture");
    const sizes = "(min-width: 900px) 80vw, 100vw";
    [["avif", "image/avif"], ["webp", "image/webp"]].forEach(([ext, type]) => {
      const s = document.createElement("source");
      s.type = type;
      s.srcset = srcset(item, ext);
      s.sizes = sizes;
      pic.append(s);
    });
    const img = document.createElement("img");
    img.srcset = srcset(item, "jpg");
    img.sizes = sizes;
    const mid = item.widths[Math.min(1, item.widths.length - 1)];
    img.src = `/img/${item.slug}-${mid}.${item.hash}.jpg`;
    img.width = item.w;
    img.height = item.h;
    img.alt = item.alt;
    img.decoding = "async";
    pic.append(img);
    return pic;
  }

  function render(dir) {
    const item = list[pos];
    const pic = buildPicture(item);
    const img = pic.querySelector("img");
    figure.classList.remove("is-error");
    const old = figure.querySelector("picture");
    if (old) old.replaceWith(pic);
    else figure.prepend(pic);
    img.addEventListener("error", () => figure.classList.add("is-error"));
    if (dir) figure.dataset.dir = dir;
    else delete figure.dataset.dir;
    counter.textContent = fmt(strings.counter, { n: pos + 1, total: list.length });
    prevBtn.hidden = nextBtn.hidden = list.length < 2;
    infoCat.textContent = catNames[item.cat] || "";
    infoAlt.textContent = item.alt;
    // warm the neighbours
    [list[(pos + 1) % list.length], list[(pos - 1 + list.length) % list.length]].forEach((n) => {
      if (!n || n === item) return;
      const p = buildPicture(n);
      keep.push(p);
      if (keep.length > 6) keep.shift();
    });
  }

  function open(id, { push = true } = {}) {
    list = visible();
    let idx = list.findIndex((i) => i.id === id);
    if (idx < 0) {
      applyFilter("all", { animate: false, updateHistory: false });
      list = visible();
      idx = list.findIndex((i) => i.id === id);
    }
    if (idx < 0) return;
    pos = idx;
    render(null);
    if (!dlg.open) {
      dlg.showModal();
      doc.classList.add("has-modal");
      closeBtn.focus({ preventScroll: true });
    }
    if (push) {
      history.pushState({ lb: id }, "", updateUrl(id));
      pushed = true;
    } else {
      history.replaceState(history.state, "", updateUrl(id));
    }
  }

  function go(step) {
    if (list.length < 2) return;
    pos = (pos + step + list.length) % list.length;
    render(step > 0 ? "next" : "prev");
    history.replaceState(history.state, "", updateUrl(list[pos].id));
  }

  function finishClose() {
    const current = list[pos];
    dlg.classList.remove("is-closing");
    if (dlg.open) dlg.close();
    doc.classList.remove("has-modal");
    infoPanel.hidden = true;
    infoBtn.setAttribute("aria-expanded", "false");
    infoText.textContent = strings.info;
    if (current) {
      current.link.focus({ preventScroll: true });
      current.link.scrollIntoView({ block: "nearest", behavior: "auto" });
    }
  }

  function close() {
    if (!dlg.open) return;
    if (pushed) {
      // Back pops our history entry; the popstate handler finishes closing
      pushed = false;
      history.back();
      return;
    }
    history.replaceState(history.state, "", updateUrl());
    animateClose();
  }

  function animateClose() {
    if (reduceMotion()) {
      finishClose();
      return;
    }
    dlg.classList.add("is-closing");
    window.setTimeout(finishClose, 160);
  }

  window.addEventListener("popstate", (e) => {
    const lbId = e.state && e.state.lb;
    if (lbId && byId.has(lbId)) {
      if (!dlg.open) open(lbId, { push: false });
      else {
        pos = Math.max(0, list.findIndex((i) => i.id === lbId));
        render(null);
      }
    } else if (dlg.open) {
      pushed = false;
      animateClose();
    }
  });

  // Escape / native cancel: route through our close so history stays consistent
  dlg.addEventListener("cancel", (e) => {
    e.preventDefault();
    close();
  });

  dlg.addEventListener("close", () => doc.classList.remove("has-modal"));

  closeBtn.addEventListener("click", close);
  prevBtn.addEventListener("click", () => go(-1));
  nextBtn.addEventListener("click", () => go(1));

  infoBtn.addEventListener("click", () => {
    const show = infoPanel.hidden;
    infoPanel.hidden = !show;
    infoBtn.setAttribute("aria-expanded", String(show));
    infoText.textContent = show ? strings.hideInfo : strings.info;
  });

  // click on the dark area around the image closes the viewer
  stage.addEventListener("click", (e) => {
    if (e.target === stage || e.target === figure) close();
  });

  dlg.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      // the previous button sits at the inline-start edge: left in LTR, right in RTL
      const towardsStart = e.key === (isRtl() ? "ArrowRight" : "ArrowLeft");
      go(towardsStart ? -1 : 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      go(-pos);
    } else if (e.key === "End") {
      e.preventDefault();
      go(list.length - 1 - pos);
    }
  });

  // swipe (pointer events; vertical pan + pinch stay native via touch-action)
  let sx = 0;
  let sy = 0;
  let tracking = false;
  stage.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    tracking = true;
    sx = e.clientX;
    sy = e.clientY;
  });
  stage.addEventListener("pointercancel", () => {
    tracking = false;
  });
  stage.addEventListener("pointerup", (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    // content follows the finger: swiping towards the start edge reveals the next image
    // in LTR (swipe left) and the next image in RTL is revealed by swiping right
    const next = isRtl() ? dx > 0 : dx < 0;
    go(next ? 1 : -1);
  });

  // open from tiles (links keep working without JS: they point at the full image)
  items.forEach((i) => {
    i.link.addEventListener("click", (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      open(i.id);
    });
  });

  /* -------------------------------------------------------------- start */
  const params = new URLSearchParams(location.search);
  const startCat = params.get("cat");
  const startWork = params.get("work");
  applyFilter(startCat && catNames[startCat] ? startCat : "all", { animate: false, updateHistory: false });
  grid.classList.add("is-entering");
  window.setTimeout(() => grid.classList.remove("is-entering"), 1000);
  if (startWork && byId.has(startWork)) open(startWork, { push: false });
}
