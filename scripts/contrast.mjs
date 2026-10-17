/* WCAG contrast check for the real token pairs in src/css/tokens.css (AA: 4.5 text, 3 large/UI). */
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const L = (h) => { const [r, g, b] = hex(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const cr = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const mix = (a, b, t) => "#" + hex(a).map((v, i) => Math.round(v * (1 - t) + hex(b)[i] * t).toString(16).padStart(2, "0")).join("");
const themes = {
  light: { bg: "#fef9fc", surface: "#ffffff", tint: "#eff2fb", soft: "#fce7f3", ink: "#0f172a", ink2: "#475569", accent: "#be185d", accent2: "#0369a1", onAccent: "#ffffff" },
  dark: { bg: "#021526", surface: "#022036", tint: "#022943", soft: mix("#021526", "#ec4899", 0.14), ink: "#f1f5f9", ink2: "#b6c3d6", accent: "#f472b6", accent2: "#38bdf8", onAccent: "#021526" },
};
let bad = 0;
for (const [name, t] of Object.entries(themes)) {
  const pairs = [
    ["ink/bg", t.ink, t.bg], ["ink/surface", t.ink, t.surface], ["ink/tint", t.ink, t.tint],
    ["ink2/bg", t.ink2, t.bg], ["ink2/surface", t.ink2, t.surface], ["ink2/tint", t.ink2, t.tint],
    ["accent/bg", t.accent, t.bg], ["accent/surface", t.accent, t.surface], ["accent/tint", t.accent, t.tint], ["accent/soft", t.accent, t.soft],
    ["accent2/bg", t.accent2, t.bg], ["accent2/surface", t.accent2, t.surface],
    ["onAccent/accent (buttons)", t.onAccent, t.accent],
  ];
  for (const [n, f, b] of pairs) {
    const r = cr(f, b); const pass = r >= 4.5;
    if (!pass) bad++;
    console.log(`${pass ? "ok  " : "FAIL"} ${name} ${n} ${r.toFixed(2)}`);
  }
}
process.exit(bad ? 1 : 0);
