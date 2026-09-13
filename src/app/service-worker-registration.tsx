"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    // Registered after load so it never competes with the page's own
    // first-paint work for the network/CPU.
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // A failed registration just means no offline shell — the app
        // still works normally over the network.
      });
    });
  }, []);

  return null;
}
