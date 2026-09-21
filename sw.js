// Network first, cache as the offline fallback. Bump VERSION to drop old caches.
const VERSION = "tatkal-v3";
const SHELL = ["./", "index.html", "css/style.css", "assets/icon.svg", "manifest.webmanifest",
  "js/main.js", "js/util.js", "js/data.js", "js/gen.js", "js/score.js", "js/captcha.js",
  "js/chaos.js", "js/sound.js", "js/board.js", "js/config.js", "js/share.js", "js/quick.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match("index.html")))
  );
});
