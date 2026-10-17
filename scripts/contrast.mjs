/* WCAG contrast check. Reads the real tokens from src/css/tokens.css so the check can never drift
   from the design (AA: 4.5 for text). Every colour used for text is a plain hex token. */
import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(path.join(import.meta.dirname, "../src/css/tokens.css"), "utf8");
const block = (re) => {
  const m = css.match(re);
  if (!m) throw new Error(`token block not found: ${re}`);
  return Object.fromEntries([...m[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((x) => [x[1], x[2]]));
};
const themes = {
  light: block(/:root,\s*:root\[data-theme="light"\]\s*\{([\s\S]*?)\n\}/),
  dark: block(/:root\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/),
};

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const L = (h) => {
  const [r, g, b] = hex(h).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const cr = (a, b) => {
  const x = L(a), y = L(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

let bad = 0;
for (const [name, t] of Object.entries(themes)) {
  const backgrounds = ["bg", "surface", "bg-tint", "bg-blush"];
  const pairs = [];
  for (const fg of ["ink", "ink-2", "accent", "accent-2", "accent-3"]) for (const bg of backgrounds) pairs.push([fg, bg]);
  pairs.push(["accent", "accent-soft"], ["ink", "accent-soft"], ["on-accent", "accent"]);
  for (const [f, b] of pairs) {
    if (!t[f] || !t[b]) throw new Error(`missing token ${f} or ${b} in ${name}`);
    const r = cr(t[f], t[b]);
    const pass = r >= 4.5;
    if (!pass) bad++;
    console.log(`${pass ? "ok  " : "FAIL"} ${name} ${f}/${b} ${r.toFixed(2)}`);
  }
}
process.exit(bad ? 1 : 0);
