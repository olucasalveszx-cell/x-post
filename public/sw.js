self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    self.clients.claim().then(() =>
      self.clients.matchAll({ includeUncontrolled: true }).then((clients) =>
        clients.forEach((c) => c.postMessage({ type: "xpz_clear_storage" }))
      )
    )
  );
});
