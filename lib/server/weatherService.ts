import { fail, ok, type ApiResult } from "../api/result.ts";
import { roundCoord } from "../location/validate.ts";
import { buildForecastUrl, parseForecast, WeatherDataError, type WeatherReport } from "../weather/openMeteo.ts";
import { fetchJson } from "./fetchJson.ts";
import { TtlCache } from "./ttlCache.ts";
import type { WeatherConfig } from "./config.ts";

export interface WeatherPayload {
  report: WeatherReport;
  fetchedAt: string; // when our server got it from the provider
  stale: boolean; // true = provider failed and this is the last good copy
  source: { name: string; url: string; attribution: string };
}

export const WEATHER_SOURCE = {
  name: "Open-Meteo",
  url: "https://open-meteo.com/",
  attribution: "Weather data by Open-Meteo.com (CC BY 4.0)",
};

export function createWeatherService(deps: {
  config: WeatherConfig;
  fetchImpl?: typeof fetch;
  now?: () => number;
  cache?: TtlCache<{ report: WeatherReport; fetchedAt: string }>;
}) {
  const now = deps.now ?? (() => Date.now());
  const cache =
    deps.cache ??
    new TtlCache<{ report: WeatherReport; fetchedAt: string }>({
      ttlMs: 30 * 60 * 1000, // forecasts update hourly at most; 30 min keeps load low
      maxStaleMs: 24 * 60 * 60 * 1000,
      maxEntries: 5000,
    });

  return {
    /** `force` skips the fresh cache (used by the Refresh button); a failure still falls back to the last good copy. */
    async get(lat: number, lon: number, opts: { force?: boolean } = {}): Promise<ApiResult<WeatherPayload>> {
      // ~1 km grid: plenty for a forecast model and avoids sending exact farm coordinates.
      const rlat = roundCoord(lat, 2);
      const rlon = roundCoord(lon, 2);
      const key = `${rlat},${rlon}`;
      const hit = cache.get(key, now());
      if (hit?.fresh && !opts.force) return ok({ ...hit.value, stale: false, source: WEATHER_SOURCE });

      const url = buildForecastUrl(rlat, rlon, { base: deps.config.baseUrl, apiKey: deps.config.apiKey });
      const outcome = await fetchJson(url, { timeoutMs: deps.config.timeoutMs, fetchImpl: deps.fetchImpl });

      const fallback = (code: "UPSTREAM_TIMEOUT" | "UPSTREAM_ERROR" | "INVALID_UPSTREAM_DATA", msg: string) =>
        hit ? ok({ ...hit.value, stale: true, source: WEATHER_SOURCE }) : fail(code, msg);

      if (!outcome.ok) {
        const f = outcome.failure;
        if (f.kind === "timeout") return fallback("UPSTREAM_TIMEOUT", "Weather provider timed out");
        if (f.kind === "http" && f.status === 429) {
          return hit ? ok({ ...hit.value, stale: true, source: WEATHER_SOURCE }) : fail("RATE_LIMITED", "Weather provider rate limit", { retryAfterSec: 60 });
        }
        if (f.kind === "invalid-json") return fallback("INVALID_UPSTREAM_DATA", "Weather provider sent invalid JSON");
        return fallback("UPSTREAM_ERROR", f.kind === "http" ? `Weather provider HTTP ${f.status}` : "Weather provider unreachable");
      }

      try {
        const report = parseForecast(outcome.json);
        const value = { report, fetchedAt: new Date(now()).toISOString() };
        cache.set(key, value, now());
        return ok({ ...value, stale: false, source: WEATHER_SOURCE });
      } catch (err) {
        if (err instanceof WeatherDataError) return fallback("INVALID_UPSTREAM_DATA", err.message);
        throw err;
      }
    },
  };
}
