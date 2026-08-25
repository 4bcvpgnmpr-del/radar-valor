const CACHE_NAME = "radar-valor-v1";
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
  // Solo cacheamos el shell de la app; las llamadas a las APIs (odds, football, IA)
  // siempre van a la red, nunca a caché, para no servir cuotas ni datos viejos.
  const url = event.request.url;
  if (url.includes("api.the-odds-api.com") || url.includes("api-sports.io") || url.includes("api.anthropic.com") || url.includes("thesportsdb.com")) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
