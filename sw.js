const CACHE_NAME = "radar-valor-v2";
const ASSETS = ["./", "./index.html", "./manifest.json", "./icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Las llamadas a las APIs siempre van a la red (nunca datos viejos).
  const url = event.request.url;
  if (url.includes("api.the-odds-api.com") || url.includes("api-sports.io") || url.includes("api.anthropic.com") || url.includes("thesportsdb.com") || url.includes("openligadb")) {
    return;
  }
  if (event.request.method !== "GET") return;
  // Primero la red (versión nueva); la caché solo sirve si no hay conexión.
  event.respondWith(
    fetch(event.request)
      .then((res) => { const copy = res.clone(); caches.open(CACHE_NAME).then((c) => c.put(event.request, copy)).catch(() => {}); return res; })
      .catch(() => caches.match(event.request))
  );
});
