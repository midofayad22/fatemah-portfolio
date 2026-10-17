/* Static site build: fonts → CSS/JS bundles → responsive images → HTML (ar/en) → SEO files → PWA. */
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { build as esbuild, transform } from "esbuild";
import sharp from "sharp";
import { renderSite, makeT, route } from "./templates.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");
const CACHE = path.join(ROOT, ".cache/img");
const read = (p) => fs.readFile(path.join(ROOT, p), "utf8");
const json = async (p) => JSON.parse(await read(p));
const sha = (buf, n = 8) => crypto.createHash("sha1").update(buf).digest("hex").slice(0, n);
const write = async (rel, data) => {
  const p = path.join(DIST, rel);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, data);
};

const IMG_VERSION = "v1"; // bump to force re-encoding
const WIDTHS = [360, 720, 1080];

/* ------------------------------------------------------------------ fonts */
const LATIN = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
const ARABIC = "U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0898-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC";
const FACES = [
  ["FE Display", "cormorant-garamond", "cormorant-garamond-latin-500-normal", "500", "normal", LATIN],
  ["FE Display", "cormorant-garamond", "cormorant-garamond-latin-600-normal", "600", "normal", LATIN],
  ["FE Display", "cormorant-garamond", "cormorant-garamond-latin-500-italic", "500", "italic", LATIN],
  ["FE Display AR", "amiri", "amiri-arabic-400-normal", "400", "normal", ARABIC],
  ["FE Display AR", "amiri", "amiri-arabic-700-normal", "700", "normal", ARABIC],
  ["FE Body", "ibm-plex-sans", "ibm-plex-sans-latin-400-normal", "400", "normal", LATIN],
  ["FE Body", "ibm-plex-sans", "ibm-plex-sans-latin-500-normal", "500", "normal", LATIN],
  ["FE Body", "ibm-plex-sans", "ibm-plex-sans-latin-600-normal", "600", "normal", LATIN],
  ["FE Body", "ibm-plex-sans-arabic", "ibm-plex-sans-arabic-arabic-400-normal", "400", "normal", ARABIC],
  ["FE Body", "ibm-plex-sans-arabic", "ibm-plex-sans-arabic-arabic-500-normal", "500", "normal", ARABIC],
  ["FE Body", "ibm-plex-sans-arabic", "ibm-plex-sans-arabic-arabic-600-normal", "600", "normal", ARABIC],
  ["FE Mono", "ibm-plex-mono", "ibm-plex-mono-latin-400-normal", "400", "normal", LATIN],
  ["FE Mono", "ibm-plex-mono", "ibm-plex-mono-latin-500-normal", "500", "normal", LATIN],
];
const PRELOAD_KEYS = {
  ar: ["ibm-plex-sans-arabic-arabic-400-normal", "amiri-arabic-700-normal"],
  en: ["ibm-plex-sans-latin-400-normal", "cormorant-garamond-latin-600-normal"],
};

async function buildFonts() {
  let css = "";
  const urls = {};
  for (const [family, pkg, file, weight, style, range] of FACES) {
    const buf = await fs.readFile(path.join(ROOT, "node_modules/@fontsource", pkg, "files", `${file}.woff2`));
    const name = `${file}.${sha(buf)}.woff2`;
    await write(`fonts/${name}`, buf);
    urls[file] = `/fonts/${name}`;
    css += `@font-face{font-family:"${family}";font-style:${style};font-weight:${weight};font-display:swap;src:url(/fonts/${name}) format("woff2");unicode-range:${range}}\n`;
  }
  await fs.writeFile(path.join(ROOT, "src/css/_fonts.generated.css"), css);
  return { ar: PRELOAD_KEYS.ar.map((k) => urls[k]), en: PRELOAD_KEYS.en.map((k) => urls[k]) };
}

/* ---------------------------------------------------------------- bundles */
async function buildBundles() {
  const css = await esbuild({
    entryPoints: [path.join(ROOT, "src/css/main.css")],
    bundle: true, minify: true, outdir: path.join(DIST, "css"), entryNames: "[name].[hash]",
    external: ["/fonts/*"], metafile: true, write: true, logLevel: "warning", target: ["chrome100", "safari15", "firefox100"],
  });
  const js = await esbuild({
    entryPoints: { app: path.join(ROOT, "src/js/app.js"), gallery: path.join(ROOT, "src/js/gallery.js") },
    bundle: true, minify: true, format: "esm", outdir: path.join(DIST, "js"), entryNames: "[name].[hash]",
    metafile: true, write: true, logLevel: "warning", target: ["es2020"],
  });
  const pick = (meta, re) => "/" + Object.keys(meta.outputs).find((k) => re.test(k)).replace(/^dist\//, "").replace(/^.*?(css|js)\//, "$1/");
  const themeInit = (await transform(await read("src/js/theme-init.js"), { minify: true })).code.trim();
  return {
    css: pick(css.metafile, /css\/main\..*\.css$/),
    js: pick(js.metafile, /js\/app\..*\.js$/),
    galleryJs: pick(js.metafile, /js\/gallery\..*\.js$/),
    themeInit,
  };
}

/* ----------------------------------------------------------------- images */
async function encode(srcBuf, w, ext) {
  const base = sharp(srcBuf).rotate().resize({ width: w, withoutEnlargement: true });
  if (ext === "avif") return base.avif({ quality: 52, effort: 3 }).toBuffer();
  if (ext === "webp") return base.webp({ quality: 74 }).toBuffer();
  return base.jpeg({ quality: 78, mozjpeg: true, progressive: true }).toBuffer();
}

async function processImage(id, srcRel, slug) {
  const srcBuf = await fs.readFile(path.join(ROOT, "assets", srcRel));
  const hash = sha(Buffer.concat([srcBuf, Buffer.from(IMG_VERSION)]));
  const meta = await sharp(srcBuf).rotate().metadata();
  const w = meta.autoOrient ? meta.autoOrient.width : meta.width;
  const h = meta.autoOrient ? meta.autoOrient.height : meta.height;
  const cands = WIDTHS.filter((x) => x < w);
  const widths = cands.length && w - cands.at(-1) < w * 0.15 ? cands : [...cands, w];
  const stat = await sharp(srcBuf).resize(1, 1).raw().toBuffer();
  const ph = "#" + [...stat.subarray(0, 3)].map((v) => v.toString(16).padStart(2, "0")).join("");
  await fs.mkdir(CACHE, { recursive: true });
  for (const width of widths) {
    for (const ext of ["avif", "webp", "jpg"]) {
      const name = `${slug}-${width}.${hash}.${ext}`;
      const cached = path.join(CACHE, name);
      let buf;
      if (existsSync(cached)) buf = await fs.readFile(cached);
      else {
        buf = await encode(srcBuf, width, ext);
        await fs.writeFile(cached, buf);
      }
      await write(`img/${name}`, buf);
    }
  }
  return { id, slug, hash, widths, w, h, ph };
}

async function buildImages(gallery) {
  const jobs = gallery.items.map((it) => {
    const n = it.id.replace(/\D/g, "").padStart(2, "0");
    return { id: it.id, src: it.src, slug: `fatima-ezz-${it.category}-${n}` };
  });
  jobs.push({ id: "profile", src: gallery.profile.src, slug: "fatima-ezz-profile-illustration" });
  const out = {};
  for (let i = 0; i < jobs.length; i += 4) {
    const res = await Promise.all(jobs.slice(i, i + 4).map((j) => processImage(j.id, j.src, j.slug)));
    res.forEach((r) => (out[r.id] = r));
  }
  return out;
}

/* ------------------------------------------------------------ brand icons */
async function buildIcons() {
  const svg = await fs.readFile(path.join(ROOT, "public/brand/mark.svg"));
  const mk = await fs.readFile(path.join(ROOT, "public/brand/mark-maskable.svg"));
  await write("icons/favicon.svg", svg);
  const png = (b, s) => sharp(b, { density: 384 }).resize(s, s).png({ compressionLevel: 9 }).toBuffer();
  await write("icons/favicon-32.png", await png(svg, 32));
  await write("icons/apple-touch-icon.png", await png(mk, 180));
  await write("icons/icon-192.png", await png(svg, 192));
  await write("icons/icon-512.png", await png(svg, 512));
  await write("icons/icon-maskable-512.png", await png(mk, 512));
}

/* --------------------------------------------------------------------- main */
async function main() {
  const t0 = Date.now();
  await fs.rm(DIST, { recursive: true, force: true });
  await fs.mkdir(DIST, { recursive: true });

  const [site, galleryRaw, literature, ar, en] = await Promise.all([
    json("content/site.json"), json("content/gallery.json"), json("content/literature.json"),
    json("content/i18n/ar.json"), json("content/i18n/en.json"),
  ]);

  const preload = await buildFonts();
  const bundles = await buildBundles();
  const images = await buildImages(galleryRaw);
  await buildIcons();

  const ctx = {
    site, literature, gallery: galleryRaw, images,
    t: { ar: makeT(ar), en: makeT(en) },
    year: new Date().getFullYear(),
    assets: { ...bundles, preload },
    imageUrl: (id, w, ext) => {
      const im = images[id];
      const use = im.widths.includes(w) ? w : im.widths.at(-1);
      return `/img/${im.slug}-${use}.${im.hash}.${ext}`;
    },
  };

  const pages = renderSite(ctx);
  for (const p of pages) await write(p.file, p.html);

  // static public files (og images, etc.) and the untouched original assets
  if (existsSync(path.join(ROOT, "public"))) await fs.cp(path.join(ROOT, "public"), DIST, { recursive: true, filter: (s) => !s.includes(`${path.sep}brand`) });
  await fs.cp(path.join(ROOT, "assets"), path.join(DIST, "assets"), { recursive: true });

  /* manifests */
  const manifest = (lang) => {
    const t = ctx.t[lang];
    const pre = lang === "ar" ? "" : "/en";
    return {
      id: `${pre}/`, name: site.name[lang], short_name: site.name[lang],
      description: t("meta.home.description"), lang, dir: lang === "ar" ? "rtl" : "ltr",
      start_url: `${pre}/?source=pwa`, scope: "/", display: "standalone",
      background_color: "#fef9fc", theme_color: "#021526",
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
      shortcuts: [
        { name: t("nav.gallery"), url: route(lang, "gallery") },
        { name: t("nav.literature"), url: route(lang, "literature") },
      ],
    };
  };
  await write("manifest.webmanifest", JSON.stringify(manifest("ar"), null, 2));
  await write("en/manifest.webmanifest", JSON.stringify(manifest("en"), null, 2));

  /* robots + sitemap */
  await write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${site.siteUrl}/sitemap.xml\n`);
  let lastmod;
  try { lastmod = execSync("git log -1 --format=%cI", { cwd: ROOT }).toString().trim().slice(0, 10); } catch { lastmod = new Date().toISOString().slice(0, 10); }
  const X = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const urls = ["home", "about", "gallery", "literature", "contact"].flatMap((page) =>
    ["ar", "en"].map((lang) => {
      const imgs = page === "gallery"
        ? galleryRaw.items.map((it) => `<image:image><image:loc>${site.siteUrl}${ctx.imageUrl(it.id, 1080, "jpg")}</image:loc><image:caption>${X(it.alt[lang])}</image:caption></image:image>`).join("")
        : "";
      return `<url><loc>${site.siteUrl}${route(lang, page)}</loc><lastmod>${lastmod}</lastmod>${["ar", "en"].map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${site.siteUrl}${route(l, page)}"/>`).join("")}<xhtml:link rel="alternate" hreflang="x-default" href="${site.siteUrl}${route("ar", page)}"/>${imgs}</url>`;
    }),
  );
  await write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urls.join("")}</urlset>\n`);

  /* service worker: version = hash of everything shipped (so every deployment invalidates old caches) */
  const files = [];
  const walk = async (d) => {
    for (const e of await fs.readdir(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (!p.includes(`${path.sep}assets${path.sep}`)) files.push(p);
    }
  };
  await walk(DIST);
  const h = crypto.createHash("sha1");
  for (const f of files.sort()) { h.update(path.relative(DIST, f)); h.update(await fs.readFile(f)); }
  const version = h.digest("hex").slice(0, 10);
  const precache = ["/", "/en/", "/offline/", bundles.css, bundles.js, "/icons/favicon.svg", "/icons/icon-192.png", "/manifest.webmanifest", "/en/manifest.webmanifest"];
  const sw = (await read("src/sw.js")).replace("__VERSION__", version).replace("__PRECACHE__", JSON.stringify(precache));
  await write("sw.js", sw);

  const total = (await Promise.all(files.map((f) => fs.stat(f)))).reduce((a, s) => a + s.size, 0);
  console.log(`build ok in ${((Date.now() - t0) / 1000).toFixed(1)}s — ${pages.length} pages, ${Object.keys(images).length} images, sw ${version}, ${(total / 1048576).toFixed(1)} MB (excl. /assets)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
