/**
 * public/sw.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Sertch Service Worker — Cache-first PWA shell, Network-first API/data.
 *
 * Strategy matrix:
 *   /                 → App Shell  (Cache-first, stale-while-revalidate)
 *   /_next/static/**  → Static     (Cache-first, immutable — hashed filenames)
 *   /api/**           → Network-first with 5 s timeout → stale cache fallback
 *   /icons/**         → Cache-first (long TTL)
 *   other GET         → Network-first → cache fallback
 *
 * No build step required — plain ES2019 compatible with all modern browsers.
 */

const CACHE_VERSION   = "v1";
const SHELL_CACHE     = `sertch-shell-${CACHE_VERSION}`;
const STATIC_CACHE    = `sertch-static-${CACHE_VERSION}`;
const API_CACHE       = `sertch-api-${CACHE_VERSION}`;
const KNOWN_CACHES    = [SHELL_CACHE, STATIC_CACHE, API_CACHE];

/** URLs pre-cached on install (app shell) */
const SHELL_URLS = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

const API_NETWORK_TIMEOUT_MS = 5000;

// ── Install ───────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // addAll fails silently on assets that 404 — acceptable during dev
      cache.addAll(SHELL_URLS).catch(() => {})
    ).then(() => self.skipWaiting())
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !KNOWN_CACHES.includes(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  const path = url.pathname;

  // ── /_next/static/** — immutable static assets ──────────────────────────
  if (path.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // ── /api/** — network-first with stale fallback ─────────────────────────
  if (path.startsWith("/api/")) {
    event.respondWith(networkFirstWithTimeout(request, API_CACHE, API_NETWORK_TIMEOUT_MS));
    return;
  }

  // ── /icons/** — cache-first (long-lived) ────────────────────────────────
  if (path.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // ── HTML pages — stale-while-revalidate ─────────────────────────────────
  if (request.headers.get("Accept")?.includes("text/html")) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
    return;
  }

  // ── Everything else — network-first ─────────────────────────────────────
  event.respondWith(networkFirstWithTimeout(request, SHELL_CACHE, 4000));
});

// ── Strategy helpers ──────────────────────────────────────────────────────────

/**
 * Cache-first: serve from cache; if miss, fetch, cache, and return.
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

/**
 * Network-first with timeout: try network; if slow/offline, serve cache;
 * falls back to /offline page for HTML requests.
 */
async function networkFirstWithTimeout(request, cacheName, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);

    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    clearTimeout(timer);
    const cached = await caches.match(request);
    if (cached) return cached;

    // HTML fallback
    if (request.headers.get("Accept")?.includes("text/html")) {
      const offline = await caches.match("/offline");
      if (offline) return offline;
    }

    return new Response("Offline — no cached version available.", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

/**
 * Stale-while-revalidate: serve cache immediately, update in background.
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached ?? (await fetchPromise) ?? new Response("Offline", { status: 503 });
}

// ── Background sync stub (for deferred submissions) ───────────────────────────

self.addEventListener("sync", (event) => {
  if (event.tag === "submit-price") {
    event.waitUntil(flushPendingSubmissions());
  }
});

async function flushPendingSubmissions() {
  // IndexedDB read + POST to /api/submissions would live here.
  // Implementation left as a progressive enhancement.
  console.log("[SW] Background sync: submit-price");
}

// ── Push notifications stub ───────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Sertch", {
      body:    data.body ?? "Price drop alert!",
      icon:    "/icons/icon-192.png",
      badge:   "/icons/icon-96.png",
      tag:     data.tag ?? "sertch-alert",
      data:    { url: data.url ?? "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(clients.openWindow(url));
});
