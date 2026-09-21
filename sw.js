/* Solaris Merit Neiva · service worker
   Estrategia tomada del simulador del Invima:
   · Todo lo propio del sitio (la app, el banco, el manifiesto, los íconos): RED PRIMERO.
     Si hay internet, siempre se sirve la versión publicada y se guarda una copia;
     si no hay, se usa la copia. Así los cambios se ven en la primera apertura.
   · Fuentes y librerías externas: CACHÉ PRIMERO, porque pesan y casi nunca cambian.
   El número de versión ya no es necesario para actualizar el contenido; solo sirve
   para limpiar cachés antiguas cuando cambie la lista de archivos básicos. */
const CACHE = "solaris-merit-neiva-v33";
const BASICOS = [
  "./", "./index.html", "./banco-preguntas.xlsx", "./manifest.webmanifest",
  "./assets/logo.svg", "./assets/logo-192.png", "./assets/logo-512.png"
];
const EXTERNOS = ["fonts.googleapis.com", "fonts.gstatic.com", "cdnjs.cloudflare.com"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(BASICOS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())   // si falta un archivo, la instalación no se bloquea
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Externos: caché primero, red de respaldo
  if (EXTERNOS.some(h => url.hostname.includes(h))) {
    e.respondWith(
      caches.match(req).then(g => g || fetch(req).then(r => {
        if (r && r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
        return r;
      }))
    );
    return;
  }

  // Propios: red primero, caché de respaldo
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).then(r => {
        if (r && r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
        return r;
      }).catch(() =>
        caches.match(req, { ignoreSearch: true })
          .then(g => g || (req.mode === "navigate" ? caches.match("./index.html") : undefined))
      )
    );
  }
});
