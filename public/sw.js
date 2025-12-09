const CACHE_NAME = "darcygraphix-v1";
const urlsToCache = [
  "/",
  "/offline.html",
  "/favicon.ico",
  "/logo192.png",
  "/logo512.png",
];

// Install service worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Cache opened");
      return cache.addAll(urlsToCache);
    }),
  );
});

// Activate service worker
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
});

// Fetch event - offline functionality
self.addEventListener("fetch", (event) => {
  // Skip caching in development
  if (
    event.request.url.includes("localhost") ||
    event.request.url.includes("127.0.0.1")
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return (
        response ||
        fetch(event.request).catch(() => {
          return caches.match("/offline.html");
        })
      );
    }),
  );
});

// iOS-specific PWA installation
self.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  // Store the event so it can be triggered later
  self.deferredPrompt = event;
});

// Listen for messages from the client
self.addEventListener("message", (event) => {
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
