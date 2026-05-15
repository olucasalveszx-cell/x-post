"use client";

import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.error("[SW] registro falhou:", err));

    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "xpz_clear_storage") {
        try { localStorage.removeItem("xpz_profile"); } catch {}
        try { localStorage.removeItem("xpz_profiles"); } catch {}
      }
    });
  }, []);

  return null;
}
