/**
 * Browser geolocation with clear failure reasons and one automatic retry.
 * No library or key is needed: phones provide position through the browser's Geolocation API.
 */
export type GeoBlocker = "unsupported" | "insecure" | "embedded" | null;
export type GeoFailure = "denied" | "unavailable" | "timeout" | "insecure" | "embedded" | "unsupported";
export type GeoResult = { ok: true; lat: number; lon: number; accuracyM: number } | { ok: false; reason: GeoFailure };

/** Reasons the browser will refuse before even asking the user. */
export function geoBlocker(): GeoBlocker {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) return "unsupported";
  if (typeof window !== "undefined" && window.isSecureContext === false) return "insecure";
  try {
    if (window.self !== window.top) return "embedded";
  } catch {
    return "embedded";
  }
  return null;
}

export async function geoPermission(): Promise<"granted" | "denied" | "prompt" | "unknown"> {
  try {
    const st = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
    return st ? (st.state as "granted" | "denied" | "prompt") : "unknown";
  } catch {
    return "unknown";
  }
}

function once(highAccuracy: boolean): Promise<GeoResult> {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ ok: true, lat: pos.coords.latitude, lon: pos.coords.longitude, accuracyM: Math.round(pos.coords.accuracy) }),
      (err) => resolve({ ok: false, reason: err.code === err.PERMISSION_DENIED ? "denied" : err.code === err.TIMEOUT ? "timeout" : "unavailable" }),
      { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 25_000 : 12_000, maximumAge: highAccuracy ? 0 : 5 * 60 * 1000 },
    );
  });
}

/**
 * Quick network-based fix first; if that times out or is unavailable (common indoors),
 * try once more with GPS (high accuracy) and a longer wait. `onRetry` lets the UI say "still searching".
 */
export async function getPosition(onRetry?: () => void): Promise<GeoResult> {
  const blocked = geoBlocker();
  if (blocked) return { ok: false, reason: blocked };
  const first = await once(false);
  if (first.ok || first.reason === "denied") return first;
  onRetry?.();
  return once(true);
}
