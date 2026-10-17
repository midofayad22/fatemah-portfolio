/* End-to-end checks against ./dist (run `npm run build` first). */
import { chromium } from "playwright-core";
import fs from "node:fs";
import { serve } from "./serve.mjs";

const PORT = 4321, BASE = `http://localhost:${PORT}`;
const server = await serve(PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("FAIL", m); } else console.log("ok  ", m); };
const PAGES = ["", "about/", "gallery/", "literature/", "contact/"];

/* 1. every page: status, console, overflow, headings, alt, links, jsonld, hreflang */
const seen = new Set();
for (const lang of ["ar", "en"]) for (const pg of PAGES) for (const [w, h, theme] of [[320, 700, "dark"], [768, 900, "light"], [1440, 900, "light"]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme });
  const p = await ctx.newPage();
  const errs = [];
  p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  p.on("pageerror", (e) => errs.push(e.message));
  p.on("requestfailed", (r) => errs.push("reqfail " + r.url()));
  const path = (lang === "en" ? "/en/" : "/") + pg;
  const res = await p.goto(BASE + path, { waitUntil: "networkidle" });
  const tag = `${path} ${w}px ${theme}`;
  ok(res.status() === 200, `${tag} → 200`);
  ok(errs.length === 0, `${tag} no console/network errors ${errs.join("|")}`);
  const info = await p.evaluate(() => ({
    over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    h1: document.querySelectorAll("h1").length,
    lang: document.documentElement.lang, dir: document.documentElement.dir,
    noAlt: [...document.images].filter((i) => !i.hasAttribute("alt")).length,
    theme: document.documentElement.dataset.theme,
  }));
  ok(info.over <= 0, `${tag} no horizontal overflow (${info.over})`);
  ok(info.h1 === 1, `${tag} exactly one h1`);
  ok(info.dir === (lang === "ar" ? "rtl" : "ltr") && info.lang === lang, `${tag} lang/dir`);
  ok(info.noAlt === 0, `${tag} all images have alt attr`);
  ok(info.theme === theme, `${tag} system theme honoured`);
  if (w === 1440 && theme === "light") {
    const links = await p.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")).filter((h) => h.startsWith("/") && !h.startsWith("//")));
    links.forEach((l) => seen.add(l.split("#")[0].split("?")[0]));
    const ld = await p.$$eval('script[type="application/ld+json"]', (s) => s.map((x) => x.textContent));
    ok(ld.length > 0 && ld.every((t) => { try { JSON.parse(t); return true; } catch { return false; } }), `${tag} JSON-LD parses (${ld.length})`);
    const alt = await p.$$eval('link[rel=alternate][hreflang]', (l) => l.map((x) => x.hreflang));
    ok(["ar", "en", "x-default"].every((x) => alt.includes(x)), `${tag} hreflang set`);
    ok(await p.$eval('link[rel=canonical]', (l) => l.href.startsWith("https://")), `${tag} canonical`);
  }
  await ctx.close();
}
for (const l of seen) { const r = await fetch(BASE + l); ok(r.status === 200, `link ${l} resolves`); }

/* 2. gallery behaviour */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(BASE + "/en/gallery/", { waitUntil: "networkidle" });
  const vis = () => p.$$eval(".work:not([hidden])", (x) => x.length);
  ok((await vis()) === 68, "gallery shows all 68 works");
  for (const [cat, n] of [["photography", 45], ["gardening", 10], ["culture", 13]]) {
    await p.click(`[data-filter=${cat}]`); await p.waitForTimeout(400);
    ok((await vis()) === n, `filter ${cat} → ${n}`);
    ok(new URL(p.url()).searchParams.get("cat") === cat, `url reflects ${cat}`);
  }
  await p.click("[data-filter=all]"); await p.waitForTimeout(400);
  const lazy = await p.$$eval(".work img[loading=lazy]", (x) => x.length);
  ok(lazy >= 60, `below-fold tiles lazy (${lazy})`);
  const loaded = await p.$$eval(".work img", (x) => x.filter((i) => i.complete && i.naturalWidth > 0).length);
  ok(loaded < 68, `not all images downloaded up-front (${loaded}/68)`);
  await p.click("[data-filter=culture]"); await p.waitForTimeout(400);
  await p.click(".work:not([hidden]) a >> nth=0");
  await p.waitForSelector("#lightbox[open]");
  ok(await p.evaluate(() => document.documentElement.classList.contains("has-modal") && getComputedStyle(document.documentElement).overflow === "hidden"), "lightbox locks background scroll");
  ok((await p.textContent(".lb-counter")).trim() === "1 / 13", "lightbox counter 1 / 13");
  await p.keyboard.press("ArrowRight"); ok((await p.textContent(".lb-counter")).trim() === "2 / 13", "ArrowRight → next (LTR)");
  await p.keyboard.press("ArrowLeft"); await p.keyboard.press("ArrowLeft"); ok((await p.textContent(".lb-counter")).trim() === "13 / 13", "ArrowLeft wraps to last");
  ok(new URL(p.url()).searchParams.get("work") === "c13", "deep link ?work= updates");
  await p.click('[data-lb=info]'); ok(await p.isVisible("#lb-info"), "details panel opens");
  await p.keyboard.press("Escape"); await p.waitForTimeout(400);
  ok(!(await p.$("#lightbox[open]")), "Escape closes lightbox");
  ok(await p.evaluate(() => document.activeElement.closest(".work")?.dataset.id === "c13"), "focus returns to opened tile");
  await p.goto(BASE + "/en/gallery/?cat=culture&work=c8", { waitUntil: "networkidle" });
  ok(!!(await p.$("#lightbox[open]")) && (await p.textContent(".lb-counter")).trim() === "8 / 13", "deep link opens work c8");
  await ctx.close();
  // RTL arrows
  const c2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const q = await c2.newPage();
  await q.goto(BASE + "/gallery/?work=a1", { waitUntil: "networkidle" });
  await q.keyboard.press("ArrowLeft");
  ok((await q.textContent(".lb-counter")).trim().startsWith("2 /"), "RTL: ArrowLeft → next");
  await c2.close();
}

/* 3. theme + language persistence, menu, reduced motion, SW */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, colorScheme: "light" });
  const p = await ctx.newPage();
  await p.goto(BASE + "/", { waitUntil: "networkidle" });
  await p.click("[data-theme-toggle]");
  ok((await p.getAttribute("html", "data-theme")) === "dark", "theme toggles to dark");
  await p.reload({ waitUntil: "networkidle" });
  ok((await p.getAttribute("html", "data-theme")) === "dark", "theme persists after reload");
  await p.click("[data-menu-toggle]");
  ok((await p.getAttribute("[data-menu-toggle]", "aria-expanded")) === "true" && await p.isVisible("#site-nav"), "mobile menu opens");
  await p.keyboard.press("Escape"); ok(!(await p.isVisible("#site-nav")), "Escape closes mobile menu");
  await p.click("[data-lang-switch]"); await p.waitForURL("**/en/");
  ok((await p.getAttribute("html", "lang")) === "en", "language switches to English route");
  await p.goto(BASE + "/about/", { waitUntil: "networkidle" });
  await p.waitForURL("**/en/about/");
  ok(true, "stored language redirects Arabic URL → /en/about/");
  const sw = await p.evaluate(async () => { const r = await navigator.serviceWorker.ready; return r.active && r.active.state; });
  ok(sw === "activated", "service worker active");
  await p.context().setOffline(true);
  await p.goto(BASE + "/en/", { waitUntil: "domcontentloaded" });
  ok((await p.title()).includes("Fatima"), "precached page loads offline");
  await p.goto(BASE + "/en/contact/", { waitUntil: "domcontentloaded" }).catch(() => {});
  ok((await p.textContent("body")).length > 20, "uncached page shows offline fallback");
  await ctx.close();
  const rm = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });
  const r = await rm.newPage(); await r.goto(BASE + "/", { waitUntil: "networkidle" });
  ok(await r.$$eval(".reveal", (e) => e.every((x) => getComputedStyle(x).opacity === "1")), "reduced motion: reveals visible immediately");
  await rm.close();
}

/* 4. static files */
for (const f of ["/robots.txt", "/sitemap.xml", "/manifest.webmanifest", "/en/manifest.webmanifest", "/sw.js", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-maskable-512.png", "/404.html", "/offline/"]) {
  ok((await fetch(BASE + f)).status === 200, `static ${f}`);
}
const man = await (await fetch(BASE + "/manifest.webmanifest")).json();
ok(man.display === "standalone" && man.icons.length >= 3 && man.start_url && man.name, "manifest valid fields");
ok((await fetch(BASE + "/no-such-page/")).status === 404, "unknown route → 404");
const sm = await (await fetch(BASE + "/sitemap.xml")).text();
ok((sm.match(/<url>/g) || []).length === 10, "sitemap has 10 canonical URLs");

await browser.close(); server.close();
console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
process.exit(fails ? 1 : 0);
