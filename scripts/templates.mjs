/* HTML templates: every page is rendered to static, crawlable HTML for both languages. */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(import.meta.dirname, "..");

export const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ------------------------------------------------------------------ icons */
const lucideCache = {};
function lucideInner(name) {
  if (!lucideCache[name]) {
    const svg = fs.readFileSync(path.join(ROOT, "node_modules/lucide-static/icons", `${name}.svg`), "utf8");
    lucideCache[name] = svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>[\s\S]*$/, "").trim();
  }
  return lucideCache[name];
}
export function icon(name, cls = "") {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${lucideInner(name)}</svg>`;
}
const brandPaths = {};
function brandIcon(id, cls = "") {
  const key = { linkedin: "faLinkedin", facebook: "faFacebook", whatsapp: "faWhatsapp" }[id];
  if (!brandPaths[id]) {
    const mod = require(`@fortawesome/free-brands-svg-icons/${key}`);
    const def = mod.definition || mod[key];
    brandPaths[id] = { w: def.icon[0], h: def.icon[1], d: def.icon[4] };
  }
  const b = brandPaths[id];
  return `<svg class="icon icon--brand ${cls}" viewBox="0 0 ${b.w} ${b.h}" aria-hidden="true" focusable="false"><path d="${b.d}"/></svg>`;
}

/* ------------------------------------------------------------------- i18n */
export function makeT(dict) {
  return (key, vars) => {
    let v = key.split(".").reduce((o, k) => (o == null ? undefined : o[k]), dict);
    if (v === undefined) throw new Error(`Missing i18n key: ${key}`);
    if (typeof v === "string" && vars) v = v.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
    return v;
  };
}

export const route = (lang, page) => {
  const seg = page === "home" ? "" : `${page}/`;
  return lang === "ar" ? `/${seg}` : `/en/${seg}`;
};
const other = (lang) => (lang === "ar" ? "en" : "ar");

/* --------------------------------------------------------------- pictures */
export function picture(ctx, id, { sizes, alt = "", loading = "lazy", priority = false, cls = "", maxW = Infinity }) {
  const im = ctx.images[id];
  const widths = im.widths.filter((w) => w <= maxW);
  const use = widths.length ? widths : [im.widths[0]];
  const set = (ext) => use.map((w) => `/img/${im.slug}-${w}.${im.hash}.${ext} ${w}w`).join(", ");
  const mid = use[Math.min(1, use.length - 1)];
  const w = use[use.length - 1];
  const h = Math.round((w * im.h) / im.w);
  return `<picture><source type="image/avif" srcset="${set("avif")}" sizes="${sizes}"><source type="image/webp" srcset="${set("webp")}" sizes="${sizes}"><img ${cls ? `class="${cls}" ` : ""}src="/img/${im.slug}-${mid}.${im.hash}.jpg" srcset="${set("jpg")}" sizes="${sizes}" width="${w}" height="${h}" alt="${esc(alt)}" ${priority ? 'fetchpriority="high" decoding="async"' : `loading="${loading}" decoding="async"`}></picture>`;
}

/* ----------------------------------------------------------------- layout */
function brandMark() {
  return `<svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><defs><linearGradient id="mk-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#00b4d8"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="#021526"/><path d="M17 49V31a15 15 0 0 1 30 0v18" fill="none" stroke="url(#mk-g)" stroke-width="5" stroke-linecap="round"/><circle cx="32" cy="23" r="4" fill="#fff"/></svg>`;
}

function header(ctx, lang, page, t) {
  const pages = ["home", "about", "gallery", "literature", "contact"];
  const links = pages
    .map(
      (p) =>
        `<li><a class="nav-link" href="${route(lang, p)}"${p === page ? ' aria-current="page"' : ""}>${esc(t(`nav.${p}`))}</a></li>`,
    )
    .join("");
  const o = other(lang);
  const switchHref = route(o, page);
  return `<header class="site-header"><div class="container header-inner">
<a class="brand" href="${route(lang, "home")}" aria-label="${esc(t("nav.homeLink"))}">${brandMark()}<span>${esc(ctx.site.name[lang])}</span></a>
<nav class="nav" id="site-nav" aria-label="${esc(t("nav.label"))}"><ul class="nav-list">${links}</ul></nav>
<div class="header-controls">
<a class="lang-switch" href="${switchHref}" hreflang="${o}" lang="${o}" data-lang-switch="${o}" aria-label="${esc(t("lang.switchLabel"))}">${icon("languages")}<span>${esc(t("lang.name"))}</span></a>
<button class="icon-btn theme-toggle" type="button" data-theme-toggle data-to-dark="${esc(t("theme.toDark"))}" data-to-light="${esc(t("theme.toLight"))}" aria-label="${esc(t("theme.toDark"))}">${icon("moon", "icon-moon")}${icon("sun", "icon-sun")}</button>
<button class="icon-btn menu-toggle" type="button" data-menu-toggle aria-expanded="false" aria-controls="site-nav" data-open-label="${esc(t("nav.menu"))}" data-close-label="${esc(t("nav.closeMenu"))}" aria-label="${esc(t("nav.menu"))}">${icon("menu", "icon-menu")}${icon("x", "icon-close")}</button>
</div></div></header>`;
}

function footer(ctx, lang, t) {
  const pages = ["home", "about", "gallery", "literature", "contact"];
  const nav = pages.map((p) => `<li><a href="${route(lang, p)}">${esc(t(`nav.${p}`))}</a></li>`).join("");
  const links = ctx.site.contact
    .map(
      (c) =>
        `<li><a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${brandIcon(c.id)}<span>${esc(c.label)}</span><span class="visually-hidden"> ${esc(t("common.newTab"))}</span></a></li>`,
    )
    .join("");
  return `<footer class="site-footer"><div class="container">
<div class="footer-grid">
<div><p class="footer-brand">${esc(ctx.site.name[lang])}</p><p class="footer-tagline">${esc(t("footer.tagline"))}</p></div>
<nav aria-label="${esc(t("footer.navTitle"))}"><h2 class="footer-title">${esc(t("footer.navTitle"))}</h2><ul class="footer-list" role="list">${nav}</ul></nav>
<div><h2 class="footer-title">${esc(t("footer.connectTitle"))}</h2><ul class="footer-list" role="list">${links}</ul></div>
</div>
<div class="footer-bottom"><p>${esc(t("footer.rights", { year: "\u0000" })).replace("\u0000", `<span data-year>${ctx.year}</span>`)}</p>
<div class="footer-actions"><button type="button" data-install-open hidden>${icon("download")}<span>${esc(t("footer.install"))}</span></button><a href="#top">${icon("arrow-up-right", "icon-flip")}<span>${esc(t("footer.top"))}</span></a></div></div>
</div></footer>`;
}

function installDialog(t) {
  return `<dialog class="sheet" id="install-dialog" aria-labelledby="install-title"><h2 id="install-title">${esc(t("pwa.installTitle"))}</h2>
<p>${esc(t("pwa.installIntro"))}</p>
<p data-install-installed hidden>${esc(t("pwa.installedNote"))}</p>
<div data-install-steps><h3 class="mono" style="margin-block-start:var(--s-5);font-size:var(--step--1)">${esc(t("pwa.stepsTitle"))}</h3><ul>${t("pwa.steps").map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>
<div class="sheet-actions"><button class="btn btn--primary" type="button" data-install-now hidden>${icon("download")}${esc(t("pwa.installNow"))}</button><button class="btn btn--ghost" type="button" data-dialog-close>${esc(t("pwa.close"))}</button></div></dialog>`;
}

function head(ctx, o) {
  const { lang, page, meta, jsonld = [], noAlt = false, noindex = false } = o;
  const site = ctx.site.siteUrl;
  const t = ctx.t[lang];
  const url = site + route(lang, page);
  const img = `${site}/og/og-${lang}.jpg`;
  const alts = noAlt
    ? ""
    : ["ar", "en"].map((l) => `<link rel="alternate" hreflang="${l}" href="${site + route(l, page)}">`).join("") +
      `<link rel="alternate" hreflang="x-default" href="${site + route("ar", page)}">`;
  const pre = (ctx.assets.preload[lang] || []).map((f) => `<link rel="preload" href="${f}" as="font" type="font/woff2" crossorigin>`).join("");
  const ldBlocks = jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`).join("");
  return `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(meta.title)}</title>
${meta.description ? `<meta name="description" content="${esc(meta.description)}">` : ""}
<meta name="robots" content="${noindex ? "noindex,follow" : "index,follow,max-image-preview:large"}">
${noindex ? "" : `<link rel="canonical" href="${url}">`}${alts}
<meta name="theme-color" content="#fef9fc"><meta name="color-scheme" content="light dark">
<link rel="manifest" href="${lang === "ar" ? "/manifest.webmanifest" : "/en/manifest.webmanifest"}">
<link rel="icon" href="/icons/favicon.svg" type="image/svg+xml"><link rel="icon" href="/icons/favicon-32.png" sizes="32x32" type="image/png"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(ctx.site.name[lang])}"><meta property="og:title" content="${esc(meta.title)}">${meta.description ? `<meta property="og:description" content="${esc(meta.description)}">` : ""}<meta property="og:url" content="${url}"><meta property="og:locale" content="${lang === "ar" ? "ar_AR" : "en_US"}"><meta property="og:locale:alternate" content="${lang === "ar" ? "en_US" : "ar_AR"}">
<meta property="og:image" content="${img}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(ctx.site.name[lang])} — ${esc(t("meta.home.title"))}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(meta.title)}">${meta.description ? `<meta name="twitter:description" content="${esc(meta.description)}">` : ""}<meta name="twitter:image" content="${img}">
${ctx.site.googleSiteVerification ? `<meta name="google-site-verification" content="${esc(ctx.site.googleSiteVerification)}">` : ""}
${pre}<script>${ctx.assets.themeInit}</script>
<link rel="stylesheet" href="${ctx.assets.css}">${ldBlocks}`;
}

function shell(ctx, o, body, { minimal = false, extraScripts = "" } = {}) {
  const { lang, page } = o;
  const t = ctx.t[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const pwa = JSON.stringify({
    updateReady: t("pwa.updateReady"),
    refresh: t("pwa.refresh"),
    dismiss: t("pwa.dismiss"),
    offline: t("pwa.offline"),
    online: t("pwa.online"),
  }).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="${lang}" dir="${dir}"><head>${head(ctx, o)}</head>
<body id="top"><a class="skip-link" href="#main">${esc(t("nav.skip"))}</a>
${header(ctx, lang, page, t)}
<main id="main" tabindex="-1">${body}</main>
${footer(ctx, lang, t)}
${installDialog(t)}
<div class="toast-region" id="toast-region" role="status" aria-live="polite"></div>
<script type="application/json" id="pwa-strings">${pwa}</script>
<script type="module" src="${ctx.assets.js}"></script>${extraScripts}
</body></html>`;
}

/* ---------------------------------------------------------------- helpers */
const reveal = (i = 0) => `reveal" style="--d:${i * 70}ms`;
const verseBlock = (v) =>
  `<div class="hemistichs" lang="ar" dir="rtl">${v.hemistichs.map((h) => `<p>${esc(h)}</p>`).join("")}</div>`;
const visual = ctx => ctx;

function personLd(ctx, lang) {
  const site = ctx.site.siteUrl;
  return {
    "@type": "Person",
    "@id": `${site}/#person`,
    name: ctx.site.name[lang],
    alternateName: [ctx.site.name.ar, ctx.site.name.en, "Fatemah Ezz"].filter((v, i, a) => v !== ctx.site.name[lang] && a.indexOf(v) === i),
    url: site + route(lang, "home"),
    image: `${site}/img/${ctx.images.profile.slug}-${ctx.images.profile.widths.at(-1)}.${ctx.images.profile.hash}.jpg`,
    description: ctx.t[lang]("meta.home.description"),
    affiliation: { "@type": "CollegeOrUniversity", name: lang === "ar" ? "جامعة طنطا" : "Tanta University" },
    knowsAbout: ["Cyber Security", "Embedded Systems", "Internet of Things", "C++", "Python", "Photography", "Arabic poetry"],
    sameAs: ctx.site.sameAs,
  };
}
const crumbs = (ctx, lang, page) => {
  const t = ctx.t[lang];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t("nav.home"), item: ctx.site.siteUrl + route(lang, "home") },
      { "@type": "ListItem", position: 2, name: t(`nav.${page}`), item: ctx.site.siteUrl + route(lang, page) },
    ],
  };
};

/* ------------------------------------------------------------------ pages */
function homePage(ctx, lang) {
  const t = ctx.t[lang];
  const nameParts = ctx.site.name[lang].split(" ");
  const first = nameParts.slice(0, -1).join(" ");
  const last = nameParts.at(-1);
  const total = ctx.gallery.items.length;
  const counts = Object.fromEntries(ctx.gallery.categories.map((c) => [c.id, ctx.gallery.items.filter((i) => i.category === c.id).length]));
  const traces = `<svg class="hero-traces" viewBox="0 0 1200 700" preserveAspectRatio="xMaxYMid slice" aria-hidden="true" focusable="false"><defs><linearGradient id="trace-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1200" y2="700"><stop offset="0" stop-color="#00b4d8"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs>
<path pathLength="1" d="M-10 560H260L320 500H610L660 450H1210"/><path pathLength="1" d="M-10 610H180L230 660H520"/><path pathLength="1" d="M700 -10V120L760 180H1210"/><path pathLength="1" d="M900 -10V60L940 100H1210"/>
<circle cx="320" cy="500" r="5"/><circle cx="660" cy="450" r="5"/><circle cx="760" cy="180" r="5"/><circle cx="520" cy="660" r="5"/></svg>`;

  const interests = ctx.site.interests
    .map((id, i) => {
      const latin = { cyber: "Cyber Security", embedded: "Embedded Systems", iot: "Hardware & IoT", programming: "C++ / Python", art: "Digital Art & Poetry" }[id];
      return `<li class="index-item ${reveal(i)}"><span class="index-num mono">${String(i + 1).padStart(2, "0")}</span><h3>${esc(t(`interests.${id}.name`))}${lang === "ar" ? `<span class="index-latin mono" lang="en" dir="ltr">${esc(latin)}</span>` : ""}</h3><p class="index-desc">${esc(t(`interests.${id}.desc`))}</p></li>`;
    })
    .join("");

  const cols = ctx.gallery.categories
    .map((c, i) => {
      const id = ctx.site.showcase[c.id];
      const big = i === 0;
      return `<a class="collection fade-img ${reveal(i)}" href="${route(lang, "gallery")}?cat=${c.id}">${picture(ctx, id, { sizes: big ? "(min-width: 860px) 58vw, 100vw" : "(min-width: 860px) 40vw, 100vw", maxW: big ? 1080 : 1080 })}<span class="collection-body"><span><span class="mono">${esc(t("home.works", { n: counts[c.id] }))}</span><h3>${esc(t(`gallery.categories.${c.id}.name`))}</h3></span><span class="arrow">${icon("arrow-right", "icon-flip")}</span></span></a>`;
    })
    .join("");

  const v = ctx.literature.verses[0];
  const body = `
<section class="hero"><div class="hero-bg">${traces}</div><div class="container hero-grid">
<div class="hero-copy intro">
<p class="eyebrow">${esc(t("home.eyebrow"))}</p>
<h1 class="hero-title">${esc(first)} <em>${esc(last)}</em></h1>
<p class="hero-lede">${esc(t("home.lede"))}</p>
<div class="hero-actions"><a class="btn btn--primary" href="${route(lang, "gallery")}">${esc(t("home.ctaGallery"))}${icon("arrow-right", "icon-flip icon-nudge")}</a><a class="btn btn--ghost" href="${route(lang, "about")}">${esc(t("home.ctaAbout"))}</a><a class="text-link" href="${route(lang, "contact")}">${esc(t("home.ctaContact"))}</a></div>
<p class="hero-status">${esc(t("home.status"))}</p>
</div>
<div class="hero-art"><div class="arch"><div class="arch-img fade-img">${picture(ctx, "profile", { sizes: "(min-width: 900px) 26rem, 80vw", alt: ctx.gallery.profile.alt[lang], priority: true })}</div></div></div>
</div></section>

<section class="section" aria-labelledby="interests-h"><div class="container">
<div class="section-head ${reveal()}"><div><p class="eyebrow">${esc(t("home.eyebrow"))}</p><h2 id="interests-h">${esc(t("home.interestsTitle"))}</h2></div></div>
<ul class="index" role="list">${interests}</ul></div></section>

<section class="section section--tint" aria-labelledby="coll-h"><div class="container">
<div class="section-head ${reveal()}"><div><p class="eyebrow">${esc(t("home.collectionsEyebrow"))}</p><h2 id="coll-h">${esc(t("home.collectionsTitle"))}</h2></div><div><p>${esc(t("home.collectionsText", { total }))}</p><a class="text-link" href="${route(lang, "gallery")}" style="margin-block-start:var(--s-3)">${esc(t("home.collectionsCta"))}${icon("arrow-right", "icon-flip icon-nudge")}</a></div></div>
<div class="collections">${cols}</div></div></section>

<section class="section" aria-labelledby="lit-h"><div class="container verse-feature ${reveal()}">
<p class="eyebrow">${esc(t("home.literatureEyebrow"))}</p>
<h2 class="visually-hidden" id="lit-h">${esc(t("home.literatureTitle"))}</h2>
<blockquote class="verse">${verseBlock(v)}</blockquote>
<p class="verse-meta"><strong>${esc(v.poet[lang])}</strong> — ${esc(v.note[lang])}</p>
${lang === "en" ? `<p class="verse-meta"><em>${esc(v.translation)}</em></p>` : ""}
<a class="text-link" href="${route(lang, "literature")}">${esc(t("home.literatureCta"))}${icon("arrow-right", "icon-flip icon-nudge")}</a></div></section>

<section class="section section--tint" aria-labelledby="about-h"><div class="container"><div class="split ${reveal()}" style="border:0;padding:0">
<div class="split-label"><p class="eyebrow">${esc(t("home.aboutEyebrow"))}</p><h2 id="about-h" style="margin-block-start:var(--s-4)">${esc(t("home.aboutTitle"))}</h2></div>
<div class="split-body"><p>${esc(t("home.aboutText"))}</p><div class="link-row"><a class="text-link" href="${route(lang, "about")}">${esc(t("home.aboutCta"))}${icon("arrow-right", "icon-flip icon-nudge")}</a></div></div></div></div></section>

<section class="section" aria-labelledby="contact-h"><div class="container contact-band ${reveal()}">
<div><h2 id="contact-h">${esc(t("home.contactTitle"))}</h2><p>${esc(t("home.contactText"))}</p></div>
<div class="contact-links">${ctx.site.contact.map((c) => `<a class="btn btn--ghost" href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${brandIcon(c.id)}<span>${esc(c.label)}</span><span class="visually-hidden"> ${esc(t("common.newTab"))}</span></a>`).join("")}</div></div></section>`;

  const site = ctx.site.siteUrl;
  const ld = [
    { "@context": "https://schema.org", "@type": "WebSite", "@id": `${site}/#website`, url: site + route(lang, "home"), name: ctx.site.name[lang], inLanguage: lang, publisher: { "@id": `${site}/#person` } },
    { "@context": "https://schema.org", ...personLd(ctx, lang) },
  ];
  return shell(ctx, { lang, page: "home", meta: t("meta.home"), jsonld: ld }, body);
}

function aboutPage(ctx, lang) {
  const t = ctx.t[lang];
  const facts = t("about.facts").map((f) => `<div class="fact"><dt class="mono">${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join("");
  const tech = t("about.technical").map((x) => `<li><h3>${esc(x.name)}</h3><p>${esc(x.desc)}</p></li>`).join("");
  const mosaic = ctx.gallery.categories
    .map((c) => `<a class="fade-img" href="${route(lang, "gallery")}?cat=${c.id}" aria-label="${esc(t(`gallery.categories.${c.id}.name`))}">${picture(ctx, ctx.site.showcase[c.id], { sizes: "(min-width: 860px) 18vw, 30vw", maxW: 720 })}</a>`)
    .join("");
  const body = `
<section class="container page-head"><p class="eyebrow">${esc(t("about.eyebrow"))}</p><h1>${esc(t("about.title"))}</h1><p class="lede">${esc(t("about.lede"))}</p></section>
<section class="container" aria-labelledby="facts-h"><h2 class="visually-hidden" id="facts-h">${esc(t("about.factsTitle"))}</h2><dl class="facts">${facts}</dl></section>
<div class="container">
<section class="split ${reveal()}" aria-labelledby="acad-h"><div class="split-label"><h2 id="acad-h">${esc(t("about.academicTitle"))}</h2></div><div class="split-body"><p>${esc(t("about.academicText"))}</p></div></section>
<section class="split ${reveal()}" aria-labelledby="tech-h"><div class="split-label"><h2 id="tech-h">${esc(t("about.technicalTitle"))}</h2></div><div class="split-body"><p>${esc(t("about.technicalLede"))}</p><ol class="tech-list" role="list">${tech}</ol></div></section>
<section class="split ${reveal()}" aria-labelledby="creative-h"><div class="split-label"><h2 id="creative-h">${esc(t("about.creativeTitle"))}</h2></div><div class="split-body"><p>${esc(t("about.creativeText"))}</p><div class="mosaic">${mosaic}</div><div class="link-row"><a class="text-link" href="${route(lang, "gallery")}">${esc(t("about.creativeGallery"))}${icon("arrow-right", "icon-flip icon-nudge")}</a><a class="text-link" href="${route(lang, "literature")}">${esc(t("about.creativeLiterature"))}${icon("arrow-right", "icon-flip icon-nudge")}</a></div></div></section>
</div>
<section class="pullquote container ${reveal()}"><p>${esc(t("about.principle"))}</p></section>`;
  const site = ctx.site.siteUrl;
  const ld = [
    { "@context": "https://schema.org", "@type": "ProfilePage", url: site + route(lang, "about"), name: t("meta.about.title"), inLanguage: lang, mainEntity: personLd(ctx, lang) },
    crumbs(ctx, lang, "about"),
  ];
  return shell(ctx, { lang, page: "about", meta: t("meta.about"), jsonld: ld }, body);
}

function galleryPage(ctx, lang) {
  const t = ctx.t[lang];
  const items = ctx.gallery.items;
  const total = items.length;
  const meta = { title: t("meta.gallery.title"), description: t("meta.gallery.description", { total }) };
  const catCount = (id) => items.filter((i) => i.category === id).length;
  const chips = [`<button class="chip" type="button" data-filter="all" aria-pressed="true">${esc(t("gallery.all"))}<span class="chip-count">${total}</span></button>`]
    .concat(ctx.gallery.categories.map((c) => `<button class="chip" type="button" data-filter="${c.id}" aria-pressed="false">${esc(t(`gallery.categories.${c.id}.name`))}<span class="chip-count">${catCount(c.id)}</span></button>`))
    .join("");
  const tiles = items
    .map((it, n) => {
      const im = ctx.images[it.id];
      const eager = n < 6;
      return `<li class="work" data-id="${it.id}" data-cat="${it.category}" data-slug="${im.slug}" data-widths="${im.widths.join(",")}" data-w="${im.w}" data-h="${im.h}" data-hash="${im.hash}" style="--ar:${im.w}/${im.h};--ph:${im.ph}"><a class="fade-img" href="/assets/${it.src}" aria-haspopup="dialog">${picture(ctx, it.id, { sizes: "(min-width: 1040px) 23vw, (min-width: 640px) 32vw, 48vw", alt: it.alt[lang], loading: eager ? "eager" : "lazy", maxW: 720 })}<span class="expand" aria-hidden="true">${icon("maximize-2")}</span></a><div class="broken" aria-hidden="true">${icon("image-off")}<span>${esc(t("gallery.loadError"))}</span></div></li>`;
    })
    .join("");
  const strings = JSON.stringify({
    count: t("gallery.count"),
    counter: t("lightbox.counter"),
    info: t("lightbox.info"),
    hideInfo: t("lightbox.hideInfo"),
    categories: Object.fromEntries(ctx.gallery.categories.map((c) => [c.id, t(`gallery.categories.${c.id}.name`)])),
  }).replace(/</g, "\\u003c");
  const body = `
<section class="container page-head"><p class="eyebrow">${esc(t("gallery.eyebrow"))}</p><h1>${esc(t("gallery.title"))}</h1><p class="lede">${esc(t("gallery.lede"))}</p></section>
<div data-gallery>
<div class="gallery-bar"><div class="container gallery-bar-inner"><div class="filters" role="group" aria-label="${esc(t("gallery.filterLabel"))}">${chips}</div><p class="gallery-status" role="status" aria-live="polite">${esc(t("gallery.count", { n: total, total }))}</p></div></div>
<div class="container gallery-main"><ul class="masonry" role="list">${tiles}</ul><p class="gallery-empty" hidden>${esc(t("gallery.empty"))}</p></div>
<dialog class="lightbox" id="lightbox" aria-label="${esc(t("lightbox.label"))}">
<div class="lb-bar"><span class="lb-counter" aria-live="polite"></span><div class="lb-tools"><button class="lb-btn" type="button" data-lb="info" aria-expanded="false" aria-controls="lb-info">${icon("info")}<span class="lb-btn-text">${esc(t("lightbox.info"))}</span></button><button class="lb-btn" type="button" data-lb="close" aria-label="${esc(t("lightbox.close"))}">${icon("x")}<span>${esc(t("lightbox.close"))}</span></button></div></div>
<div class="lb-stage"><button class="lb-btn lb-nav" type="button" data-lb="prev" data-dir="prev" aria-label="${esc(t("lightbox.prev"))}">${icon("chevron-left", "icon-flip")}</button><figure class="lb-figure"><div class="lb-error" role="alert">${icon("image-off")}<p>${esc(t("lightbox.error"))}</p></div></figure><button class="lb-btn lb-nav" type="button" data-lb="next" data-dir="next" aria-label="${esc(t("lightbox.next"))}">${icon("chevron-right", "icon-flip")}</button></div>
<div class="lb-foot"><div class="lb-info" id="lb-info" hidden><span class="mono lb-cat"></span><p class="lb-alt"></p></div></div>
</dialog></div>
<script type="application/json" id="gallery-strings">${strings}</script>`;
  const site = ctx.site.siteUrl;
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "ImageGallery",
      url: site + route(lang, "gallery"),
      name: meta.title,
      description: meta.description,
      inLanguage: lang,
      image: items.map((it) => ({ "@type": "ImageObject", contentUrl: site + ctx.imageUrl(it.id, 1080, "jpg"), caption: it.alt[lang] })),
    },
    crumbs(ctx, lang, "gallery"),
  ];
  return shell(ctx, { lang, page: "gallery", meta, jsonld: ld }, body, { extraScripts: `<script type="module" src="${ctx.assets.galleryJs}"></script>` });
}

function literaturePage(ctx, lang) {
  const t = ctx.t[lang];
  const poems = ctx.literature.verses
    .map(
      (v, i) => `<li class="poem ${reveal()}"><div class="poem-meta"><span class="mono">${String(i + 1).padStart(2, "0")}</span><h2>${esc(v.poet[lang])}</h2><p>${esc(v.note[lang])}</p></div><div class="poem-text"><blockquote>${verseBlock(v)}</blockquote>${lang === "en" ? `<p class="rendering"><span class="mono">${esc(t("literature.rendering"))}</span>${esc(v.translation)}</p>` : ""}</div></li>`,
    )
    .join("");
  const body = `
<section class="container page-head"><p class="eyebrow">${esc(t("literature.eyebrow"))}</p><h1>${esc(t("literature.title"))}</h1><p class="lede">${esc(t("literature.lede"))}</p></section>
<div class="container"><ol class="poem-list" role="list">${poems}</ol></div>`;
  return shell(ctx, { lang, page: "literature", meta: t("meta.literature"), jsonld: [crumbs(ctx, lang, "literature")] }, body);
}

function contactPage(ctx, lang) {
  const t = ctx.t[lang];
  const ch = ctx.site.contact
    .map(
      (c) => `<li><a class="channel ${reveal()}" href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${brandIcon(c.id)}<span><h2>${esc(t(`contact.channels.${c.id}.title`))}</h2><p>${esc(t(`contact.channels.${c.id}.desc`))}</p></span><span class="go">${esc(t("common.open"))}${icon("arrow-up-right", "icon-flip")}<span class="visually-hidden"> ${esc(t("common.newTab"))}</span></span></a></li>`,
    )
    .join("");
  const body = `
<section class="container page-head"><p class="eyebrow">${esc(t("contact.eyebrow"))}</p><h1>${esc(t("contact.title"))}</h1><p class="lede">${esc(t("contact.lede"))}</p></section>
<div class="container"><ul class="channels" role="list">${ch}</ul></div>`;
  return shell(ctx, { lang, page: "contact", meta: t("meta.contact"), jsonld: [crumbs(ctx, lang, "contact")] }, body);
}

/* ------------------------------------------- bilingual utility pages (404, offline) */
function utilityPage(ctx, kind) {
  const home = (l) => route(l, "home");
  const block = (lang) => {
    const t = ctx.t[lang];
    const k = kind === "404" ? "notFound" : "offline";
    const cta = kind === "404"
      ? `<a class="btn btn--primary" href="${home(lang)}">${esc(t("notFound.home"))}</a>`
      : `<button class="btn btn--primary" type="button" onclick="location.reload()">${esc(t("offline.retry"))}</button>`;
    return `<div class="notice" lang="${lang}" dir="${lang === "ar" ? "rtl" : "ltr"}"><h1>${esc(t(`${k}.title`))}</h1><p>${esc(t(`${k}.text`))}</p>${cta}</div>`;
  };
  const meta = { title: `${ctx.t.ar(kind === "404" ? "meta.notFound.title" : "meta.offline.title")} · ${ctx.t.en(kind === "404" ? "meta.notFound.title" : "meta.offline.title")}` };
  const o = { lang: "ar", page: "home", meta, noAlt: true, noindex: true };
  const t = ctx.t.ar;
  const dir = "rtl";
  const pwa = JSON.stringify({ dismiss: t("pwa.dismiss"), offline: t("pwa.offline"), online: t("pwa.online"), updateReady: t("pwa.updateReady"), refresh: t("pwa.refresh") });
  return `<!doctype html>
<html lang="ar" dir="${dir}"><head>${head(ctx, o)}</head>
<body id="top"><header class="site-header"><div class="container header-inner"><a class="brand" href="/" aria-label="${esc(t("nav.homeLink"))}">${brandMark()}<span>${esc(ctx.site.name.ar)}</span></a><div class="header-controls"><button class="icon-btn theme-toggle" type="button" data-theme-toggle data-to-dark="${esc(t("theme.toDark"))}" data-to-light="${esc(t("theme.toLight"))}" aria-label="${esc(t("theme.toDark"))}">${icon("moon", "icon-moon")}${icon("sun", "icon-sun")}</button></div></div></header>
<main id="main" tabindex="-1" class="container">${block("ar")}${block("en")}</main>
<div class="toast-region" id="toast-region" role="status" aria-live="polite"></div>
<script type="application/json" id="pwa-strings">${pwa.replace(/</g, "\\u003c")}</script>
<script type="module" src="${ctx.assets.js}"></script></body></html>`;
}

export function renderSite(ctx) {
  const out = [];
  for (const lang of ["ar", "en"]) {
    const dir = lang === "ar" ? "" : "en/";
    out.push({ file: `${dir}index.html`, html: homePage(ctx, lang) });
    out.push({ file: `${dir}about/index.html`, html: aboutPage(ctx, lang) });
    out.push({ file: `${dir}gallery/index.html`, html: galleryPage(ctx, lang) });
    out.push({ file: `${dir}literature/index.html`, html: literaturePage(ctx, lang) });
    out.push({ file: `${dir}contact/index.html`, html: contactPage(ctx, lang) });
  }
  out.push({ file: "404.html", html: utilityPage(ctx, "404") });
  out.push({ file: "offline/index.html", html: utilityPage(ctx, "offline") });
  return out;
}
