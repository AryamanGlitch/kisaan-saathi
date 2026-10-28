"use client";

import { useCallback, useEffect, useState } from "react";
import { getApi, type ClientErrorCode } from "@/lib/client/api";
import { readJson, writeJson } from "@/lib/client/storage";

export type CachedGetState<T> =
  | { status: "idle" }
  | { status: "loading"; cached: T | null }
  | { status: "ready"; data: T; fromCache: false }
  | { status: "error"; code: ClientErrorCode; cached: T | null };

/** GET with a last-good copy on the device (shown, clearly marked, when offline or on failure). */
export function useCachedGet<T>(path: string | null, cacheKey: string) {
  const [state, setState] = useState<CachedGetState<T>>({ status: "idle" });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!path) return setState({ status: "idle" });
    const raw = readJson(cacheKey) as { path?: string; data?: T } | null;
    const cached = raw && raw.path === path && raw.data !== undefined ? raw.data : null;
    setState({ status: "loading", cached });
    const ctrl = new AbortController();
    getApi<T>(path, ctrl.signal)
      .then((r) => {
        if (r.ok) {
          writeJson(cacheKey, { path, data: r.data, savedAt: new Date().toISOString() });
          setState({ status: "ready", data: r.data, fromCache: false });
        } else setState({ status: "error", code: r.code, cached });
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name !== "AbortError") setState({ status: "error", code: "NETWORK", cached });
      });
    return () => ctrl.abort();
  }, [path, cacheKey, nonce]);

  const retry = useCallback(() => setNonce((n) => n + 1), []);
  const data = state.status === "ready" ? state.data : state.status === "loading" || state.status === "error" ? state.cached : null;
  return { state, data, fromCache: state.status !== "ready" && data !== null, retry };
}
