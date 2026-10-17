/* Minimal static server for ./dist that mimics Vercel (cleanUrls + trailing slash + 404.html). */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
const DIST = path.resolve(import.meta.dirname, "../dist");
const PORT = Number(process.env.PORT || 4173);
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".woff2": "font/woff2", ".xml": "application/xml", ".txt": "text/plain" };
export function serve(port = PORT) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    let p = path.join(DIST, decodeURIComponent(url.pathname));
    if (!p.startsWith(DIST)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
      if (!url.pathname.endsWith("/")) { res.writeHead(308, { Location: url.pathname + "/" + url.search }); return res.end(); }
      p = path.join(p, "index.html");
    }
    let status = 200;
    if (!fs.existsSync(p)) { p = path.join(DIST, "404.html"); status = 404; }
    const ext = path.extname(p);
    const headers = { "Content-Type": TYPES[ext] || "application/octet-stream" };
    if (/\/(css|js|fonts|img)\//.test(url.pathname)) headers["Cache-Control"] = "public, max-age=31536000, immutable";
    else if (url.pathname === "/sw.js") headers["Cache-Control"] = "no-cache";
    const gz = /\.(html|css|js|json|svg|xml|txt|webmanifest)$/.test(ext) && /gzip/.test(req.headers["accept-encoding"] || "");
    if (gz) headers["Content-Encoding"] = "gzip";
    res.writeHead(status, headers);
    const stream = fs.createReadStream(p);
    (gz ? stream.pipe(zlib.createGzip()) : stream).pipe(res);
  });
  return new Promise((r) => server.listen(port, () => r(server)));
}
if (import.meta.url === `file://${process.argv[1]}`) serve().then(() => console.log(`http://localhost:${PORT}`));
