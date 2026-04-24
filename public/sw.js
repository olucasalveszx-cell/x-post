const CACHE = "xpost-v1";

// Páginas e assets que ficam disponíveis offline
const PRECACHE = ["/", "/editor", "/queue"];

// ── Install: pré-cacheia rotas principais ──────────────────────────────────
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

// ── Activate: limpa caches antigos ────────────────────────────────────────
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch: Network-first, fallback para cache ─────────────────────────────
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Nunca intercepta chamadas de API ou extensões de browser
  if (e.request.method !== "GET") return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.protocol === "chrome-extension:") return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Só cacheia respostas válidas do mesmo domínio
        if (res.ok && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then((cached) => {
          if (cached) return cached;
          // Fallback para o editor se a página não estiver em cache
          if (e.request.destination === "document") {
            return caches.match("/editor");
          }
        })
      )
  );
});
