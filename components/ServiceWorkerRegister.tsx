"use client";

import { useEffect } from "react";

/** Registers the offline service worker in production builds only (it would cache dev bundles). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline support is optional; the app works without it */
    });
  }, []);
  return null;
}
