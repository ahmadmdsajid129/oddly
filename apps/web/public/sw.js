/**
 * @file sw.js
 * @package @oddly/web
 *
 * Oddly Service Worker (P10.01, P10.03, P10.04).
 * Provides offline caching, network fallbacks to /offline, and handles Web Push notifications.
 */

const CACHE_NAME = "oddly-v1-static";
const PRECACHE_ASSETS = ["/", "/offline", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("[SW] Precache partial error (ignored in dev):", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Navigation requests: Network-first with /offline fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match("/offline").then((res) => res || fetch(event.request));
      })
    );
    return;
  }

  // Static assets: Cache-first / Stale-While-Revalidate
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/_next/static/") || url.pathname.match(/\.(png|jpg|svg|css|woff2)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        });
      })
    );
  }
});

// ---------------------------------------------------------------------------
// Web Push Notifications Handler (P10.03, P10.04)
// ---------------------------------------------------------------------------
self.addEventListener("push", (event) => {
  let data = {
    title: "Oddly",
    body: "Today's five are waiting. Find your stranger twin.",
    url: "/",
    tag: "oddly-daily",
  };

  if (event.data) {
    try {
      data = Object.assign(data, event.data.json());
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "oddly-notification",
    data: {
      url: data.url || "/",
    },
    vibrate: [20, 40, 20],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  const channel = event.notification.data?.channel || "drop_live";

  // Track notification open telemetry (P10.09)
  try {
    fetch("/v1/push/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, event: "opened" }),
    }).catch(() => {});
  } catch {
    // ignore
  }

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
