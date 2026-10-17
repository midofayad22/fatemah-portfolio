/* One-off generator for the social-sharing images (run: node scripts/make-og.mjs; outputs are committed). */
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "..");
const f = (p) => "file://" + path.join(ROOT, "node_modules/@fontsource", p);
const profile = "file://" + path.join(ROOT, "assets/profile.jpg");
const page = (lang) => {
  const ar = lang === "ar";
  return `<!doctype html><html lang="${lang}" dir="${ar ? "rtl" : "ltr"}"><meta charset="utf-8"><style>
@font-face{font-family:D;src:url(${f("cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff2")});font-weight:600}
@font-face{font-family:D;src:url(${f("cormorant-garamond/files/cormorant-garamond-latin-500-italic.woff2")});font-weight:500;font-style:italic}
@font-face{font-family:A;src:url(${f("amiri/files/amiri-arabic-700-normal.woff2")});font-weight:700}
@font-face{font-family:B;src:url(${f("ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff2")});font-weight:500}
@font-face{font-family:BA;src:url(${f("ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-500-normal.woff2")});font-weight:500}
*{box-sizing:border-box;margin:0}
html,body{margin:0;overflow:hidden;width:1200px;height:630px}
.c{width:1200px;height:630px;background:#021526;color:#f1f5f9;position:relative;overflow:hidden;display:flex;align-items:center;gap:70px;padding:0 90px;font-family:B,BA,sans-serif}
.g1{position:absolute;width:700px;height:700px;left:-200px;top:-260px;background:radial-gradient(closest-side,rgba(0,180,216,.35),transparent)}
.g2{position:absolute;width:700px;height:700px;right:-160px;bottom:-300px;background:radial-gradient(closest-side,rgba(236,72,153,.35),transparent)}
.t{position:relative;flex:1;min-width:0}
.k{font-size:24px;letter-spacing:${ar ? 0 : ".14em"};color:#f472b6;margin-bottom:26px;${ar ? "" : "text-transform:uppercase"}}
h1{font-family:${ar ? "A" : "D"};font-weight:${ar ? 700 : 600};font-size:${ar ? 150 : 128}px;line-height:${ar ? 1.2 : 1};}
h1 em{font-style:${ar ? "normal" : "italic"};color:#f472b6;font-weight:${ar ? 700 : 500}}
p{margin-top:28px;font-size:30px;line-height:1.55;color:#b6c3d6;max-width:560px}
.bar{height:5px;width:140px;margin-top:34px;background:linear-gradient(135deg,#00b4d8,#ec4899)}
.a{position:relative;width:330px;height:370px;flex:none;border-radius:200px 200px 0 0;background:linear-gradient(135deg,#00b4d8,#ec4899);}
.a i{position:absolute;inset:0;transform:translate(${ar ? "-" : ""}18px,18px);border-radius:inherit;background:linear-gradient(135deg,#00b4d8,#ec4899)}
.a b{position:absolute;inset:0;border-radius:inherit;background:#fff url(${profile}) 42% 50%/cover}
</style><body><div class="c"><div class="g1"></div><div class="g2"></div>
<div class="t"><div class="k">${ar ? "هندسة الحاسب · جامعة طنطا" : "Computer Engineering · Tanta University"}</div>
<h1>${ar ? "فاطمة <em>عز</em>" : "Fatima <em>Ezz</em>"}</h1><div class="bar"></div>
<p>${ar ? "الأمن السيبراني · الأنظمة المدمجة · إنترنت الأشياء · الفن والشعر" : "Cybersecurity · Embedded Systems · IoT · Art &amp; Poetry"}</p></div>
<div class="a"><i></i><b></b></div></div></body></html>`;
};
const b = await chromium.launch({ executablePath: process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
fs.mkdirSync(path.join(ROOT, "public/og"), { recursive: true });
for (const lang of ["ar", "en"]) {
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  const tmp = path.join(ROOT, `.cache/og-${lang}.html`);
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  fs.writeFileSync(tmp, page(lang));
  await p.goto("file://" + tmp); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(ROOT, `public/og/og-${lang}.jpg`), type: "jpeg", quality: 86 });
}
await b.close();
