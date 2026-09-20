/* Solaris Merit Neiva · service worker
   Guarda la app y el banco para que funcionen sin internet. */
const CACHE = "solaris-merit-neiva-v4";
const BASICOS = [
  "./", "./index.html", "./banco-preguntas.xlsx", "./manifest.webmanifest",
  "./assets/logo.svg", "./assets/logo-192.png", "./assets/logo-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASICOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const esBanco = url.pathname.endsWith("banco-preguntas.xlsx");

  // El banco: primero la red, para tomar preguntas nuevas; si no hay, la copia guardada.
  if (esBanco) {
    e.respondWith(
      fetch(req).then(r => {
        const copia = r.clone();
        caches.open(CACHE).then(c => c.put(req, copia));
        return r;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Todo lo demás: primero la copia guardada, y se actualiza por detrás.
  e.respondWith(
    caches.match(req).then(guardado => {
      const red = fetch(req).then(r => {
        if (r && r.status === 200 && (url.origin === location.origin || url.hostname.includes("gstatic") || url.hostname.includes("googleapis") || url.hostname.includes("cdnjs"))) {
          const copia = r.clone();
          caches.open(CACHE).then(c => c.put(req, copia));
        }
        return r;
      }).catch(() => guardado);
      return guardado || red;
    })
  );
});
