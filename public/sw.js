// No-op service worker — previous version cleared caches and unregistered,
// causing an infinite reload loop. This version does nothing.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});
