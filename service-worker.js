// GREENLIT Arcade service worker
// Caches the app shell (HTML/CSS/JS) so the game installs to a home screen
// and keeps working offline on previously loaded devices. It never caches
// TMDB API responses — those already have their own cache/offline handling
// in js/v37/data-service.js, and pretending live search works offline would
// be misleading.

const SHELL_VERSION = "38.5";
const SHELL_CACHE = `greenlit-shell-v${SHELL_VERSION}`;

const SHELL_ASSETS = [
  "./",
  "./index.html",
  `./css/app.css?v=${SHELL_VERSION}`,
  `./js/v37/catalog.js?v=${SHELL_VERSION}`,
  `./js/v37/data-service.js?v=${SHELL_VERSION}`,
  `./js/v37/state-core.js?v=${SHELL_VERSION}`,
  `./js/v38/state-core.js?v=${SHELL_VERSION}`,
  `./js/v38/portrait-service.js?v=${SHELL_VERSION}`,
  `./js/v38/decision-ledger.js?v=${SHELL_VERSION}`,
  `./js/app.js?v=${SHELL_VERSION}`,
  `./js/core/screen-registry.js?v=${SHELL_VERSION}`,
  `./js/sim/balance-simulator.js?v=${SHELL_VERSION}`,
  `./js/sim/budget-scope-audit.js?v=${SHELL_VERSION}`,
  "./manifest.webmanifest",
  "./offline.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => {
        // Missing asset (e.g. dev server layout differs) should never block
        // install; the app still works, just without a full offline shell.
      }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("greenlit-shell-") && key !== SHELL_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isShellRequest(url) {
  return (
    SHELL_ASSETS.some((asset) => url.endsWith(asset.replace("./", "/"))) ||
    url.endsWith("/index.html") ||
    url.endsWith("/manifest.webmanifest")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never intercept TMDB/API calls

  // Navigations: try the network first so updates show up immediately,
  // fall back to the cached shell (and then the offline page) when unreachable.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          await caches.open(SHELL_CACHE).then((cache) => cache.put("./index.html", response.clone()));
          return response;
        })
        .catch(
          async () =>
            (await caches.match("./index.html")) ||
            (await caches.match("./offline.html")) ||
            Response.error(),
        ),
    );
    return;
  }

  if (isShellRequest(request.url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then(async (response) => {
            await caches.open(SHELL_CACHE).then((cache) => cache.put(request, response.clone()));
            return response;
          }),
      ),
    );
  }
});
