import { fail, ok, type ApiResult } from "../api/result.ts";
import { roundCoord } from "../location/validate.ts";
import { buildSoilUrl, parseSoil, type SoilNow } from "../soil/moisture.ts";
import { nowInIndiaLocal } from "../time.ts";
import { fetchJson } from "./fetchJson.ts";
import { TtlCache } from "./ttlCache.ts";

export interface SoilPayload {
  soil: SoilNow;
  fetchedAt: string;
  stale: boolean;
}

/** Soil moisture/temperature (Open-Meteo model). Same caching and honesty rules as weather. */
export function createSoilService(deps: { baseUrl?: string; fetchImpl?: typeof fetch; now?: () => number } = {}) {
  const now = deps.now ?? (() => Date.now());
  const cache = new TtlCache<{ json: unknown; fetchedAt: string }>({ ttlMs: 60 * 60 * 1000, maxStaleMs: 24 * 3600 * 1000, maxEntries: 2000 });
  return {
    async get(lat: number, lon: number): Promise<ApiResult<SoilPayload>> {
      const la = roundCoord(lat, 2), lo = roundCoord(lon, 2);
      const key = `${la},${lo}`;
      const hit = cache.get(key, now());
      const local = nowInIndiaLocal(new Date(now()));
      const from = (v: { json: unknown; fetchedAt: string }, stale: boolean): ApiResult<SoilPayload> => {
        const soil = parseSoil(v.json, local);
        return soil ? ok({ soil, fetchedAt: v.fetchedAt, stale }) : fail("INVALID_UPSTREAM_DATA", "Soil data missing in provider response");
      };
      if (hit?.fresh) return from(hit.value, false);
      const r = await fetchJson(buildSoilUrl(la, lo, deps.baseUrl), { timeoutMs: 8000, fetchImpl: deps.fetchImpl });
      if (!r.ok) {
        if (hit) return from(hit.value, true);
        return r.failure.kind === "timeout" ? fail("UPSTREAM_TIMEOUT", "Soil data timed out") : fail("UPSTREAM_ERROR", "Soil data unavailable");
      }
      const v = { json: r.json, fetchedAt: new Date(now()).toISOString() };
      const res = from(v, false);
      if (res.ok) cache.set(key, v, now());
      return res;
    },
  };
}
