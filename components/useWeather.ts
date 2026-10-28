"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SavedLocation } from "@/lib/location/types";
import type { WeatherPayload } from "@/lib/server/weatherService";
import { getApi, type ClientErrorCode } from "@/lib/client/api";
import { readJson, writeJson } from "@/lib/client/storage";
import { isCachedWeather, type CachedWeather } from "@/lib/weather/cache";

const KEY = "ks:weather:v1";

export type WeatherState =
  | { status: "waiting" }
  | { status: "no-location" }
  | { status: "no-coords" }
  | { status: "loading"; cached: CachedWeather | null }
  | { status: "ready"; payload: WeatherPayload }
  | { status: "error"; code: ClientErrorCode; cached: CachedWeather | null };

/** Fetches weather for the saved location; shows the last device copy while loading or when offline. */
export function useWeather(location: SavedLocation | null, locationReady: boolean) {
  const [state, setState] = useState<WeatherState>({ status: "waiting" });
  const [nonce, setNonce] = useState(0);
  const force = useRef(false);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const lat = location?.lat ?? null;
  const lon = location?.lon ?? null;
  const hasLocation = location !== null;

  useEffect(() => {
    if (!locationReady) return;
    if (!hasLocation) return setState({ status: "no-location" });
    if (lat === null || lon === null) return setState({ status: "no-coords" });

    const raw = readJson(KEY);
    const cached = isCachedWeather(raw, lat, lon) ? raw : null;
    setState({ status: "loading", cached });

    const ctrl = new AbortController();
    const forced = force.current;
    force.current = false;
    getApi<WeatherPayload>(`/api/weather?lat=${lat}&lon=${lon}${forced ? "&refresh=1" : ""}`, ctrl.signal)
      .then((r) => {
        if (forced) setRefreshedAt(r.ok ? new Date().toISOString() : null);
        if (r.ok) {
          writeJson(KEY, { lat, lon, savedAt: new Date().toISOString(), payload: r.data } satisfies CachedWeather);
          setState({ status: "ready", payload: r.data });
        } else {
          setState({ status: "error", code: r.code, cached });
        }
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name !== "AbortError") setState({ status: "error", code: "NETWORK", cached });
      });
    return () => ctrl.abort();
  }, [locationReady, hasLocation, lat, lon, nonce]);

  /** Refresh skips caches and always gives visible feedback. */
  const refresh = useCallback(() => {
    force.current = true;
    setRefreshedAt(null);
    setNonce((n) => n + 1);
  }, []);
  return { state, refresh, refreshedAt };
}

/** The payload to display, if any, and whether it came from the device copy. */
export function displayed(state: WeatherState): { payload: WeatherPayload; fromDevice: boolean } | null {
  if (state.status === "ready") return { payload: state.payload, fromDevice: false };
  if ((state.status === "loading" || state.status === "error") && state.cached) return { payload: state.cached.payload, fromDevice: true };
  return null;
}
