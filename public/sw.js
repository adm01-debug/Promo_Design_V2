/*
 * Service Worker de suporte offline (PND-09).
 *
 * Estrategia deliberadamente conservadora: o objetivo e manter o app abrindo e
 * navegavel em conectividade instavel (ambiente fabril), nao servir dados
 * desatualizados como se fossem reais.
 *
 * - Assets com hash no nome (/assets/*): cache-first (imutaveis por build).
 * - Navegacao (documentos): network-first com fallback para o ultimo HTML bom.
 * - Supabase, Edge Functions e qualquer POST/PUT/PATCH/DELETE: nunca cacheados.
 *   Requisicoes mutantes offline falham de proposito e a UI avisa o usuario.
 */

const VERSION = "promo-design-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;

const SHELL_URLS = ["/", "/index.html", "/manifest.json", "/favicon.png"];

// Rotas de API que jamais devem ser cacheadas: servem dados dinamicos.
const NO_CACHE_ORIGINS = [
  "https://fygxlswpkjtjpcefjfty.supabase.co",
  "https://qmwvvvrdufjpgkcorjeb.supabase.co",
  "https://doufsxqlfjyuvxuezpln.supabase.co",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isApiRequest(url) {
  if (NO_CACHE_ORIGINS.includes(url.origin)) return true;
  return (
    url.pathname.startsWith("/functions/v1/") ||
    url.pathname.startsWith("/admin-api/") ||
    url.pathname.startsWith("/auth/v1/") ||
    url.pathname.startsWith("/rest/v1/")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch (_error) {
    return;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  if (isApiRequest(url)) return;

  // Documentos: rede primeiro, cache como rede de seguranca.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put("/index.html", copy));
          }
          return response;
        })
        .catch(() =>
          caches
            .match("/index.html")
            .then((cached) => cached || caches.match("/"))
            .then((cached) => cached || Response.error()),
        ),
    );
    return;
  }

  // Assets com hash: cache-first.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response && response.ok) {
              const copy = response.clone();
              caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Demais GETs estaticos (fontes, imagens): staleness toleravel, cache-first
  // com revalidacao em background.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response && response.ok) {
              const copy = response.clone();
              caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached || Response.error());
        return cached || network;
      }),
    );
  }
});
