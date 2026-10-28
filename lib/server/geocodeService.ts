import { fail, ok, type ApiResult } from "../api/result.ts";
import {
  buildReverseUrl,
  buildSearchQuery,
  buildSearchUrl,
  parseReverse,
  parseSearch,
} from "../location/nominatim.ts";
import { searchPlace } from "../location/search.ts";
import type { PlaceCandidate, SearchResponse } from "../location/types.ts";
import { roundCoord } from "../location/validate.ts";
import { fetchJson } from "./fetchJson.ts";
import { createSerialThrottle, ThrottleBusyError, type Scheduler } from "./throttle.ts";
import { TtlCache } from "./ttlCache.ts";
import type { GeocodeConfig } from "./config.ts";

export function createGeocodeService(deps: {
  config: GeocodeConfig | null;
  fetchImpl?: typeof fetch;
  schedule?: Scheduler;
  now?: () => number;
}) {
  const now = deps.now ?? (() => Date.now());
  // Public Nominatim: max 1 request/second across ALL users of the app.
  const schedule = deps.schedule ?? createSerialThrottle({ minIntervalMs: 1100, maxQueue: 8 });
  const cache = new TtlCache<unknown>({ ttlMs: 7 * 24 * 3600 * 1000, maxStaleMs: 7 * 24 * 3600 * 1000, maxEntries: 5000 });

  async function getJson(url: string, cfg: GeocodeConfig): Promise<ApiResult<unknown>> {
    const hit = cache.get(url, now());
    if (hit) return ok(hit.value);
    let outcome;
    try {
      outcome = await schedule(() =>
        fetchJson(url, { timeoutMs: cfg.timeoutMs, headers: { "User-Agent": cfg.userAgent }, fetchImpl: deps.fetchImpl }),
      );
    } catch (err) {
      if (err instanceof ThrottleBusyError) return fail("RATE_LIMITED", "Map lookup is busy", { retryAfterSec: 10 });
      throw err;
    }
    if (!outcome.ok) {
      const f = outcome.failure;
      if (f.kind === "timeout") return fail("UPSTREAM_TIMEOUT", "Map service timed out");
      if (f.kind === "http" && (f.status === 429 || f.status === 403)) {
        return fail("RATE_LIMITED", `Map service refused request (HTTP ${f.status})`, { retryAfterSec: 60 });
      }
      if (f.kind === "invalid-json") return fail("INVALID_UPSTREAM_DATA", "Map service sent invalid JSON");
      return fail("UPSTREAM_ERROR", f.kind === "http" ? `Map service HTTP ${f.status}` : "Map service unreachable");
    }
    cache.set(url, outcome.json, now());
    return ok(outcome.json);
  }

  const notConfigured = () =>
    fail("NOT_CONFIGURED", "Set NOMINATIM_USER_AGENT (with a real contact) to enable place lookup");

  return {
    async reverse(lat: number, lon: number): Promise<ApiResult<PlaceCandidate>> {
      const cfg = deps.config;
      if (!cfg) return notConfigured();
      const r = await getJson(buildReverseUrl(roundCoord(lat, 3), roundCoord(lon, 3), cfg.baseUrl), cfg);
      if (!r.ok) return r;
      const cand = parseReverse(r.data);
      if (!cand) return fail("NOT_FOUND", "No place found at these coordinates");
      if (cand.countryCode !== null && cand.countryCode !== "in") return fail("OUTSIDE_INDIA", "Coordinates are outside India");
      return ok(cand);
    },

    /** Village first; otherwise the district centre (bundled, no network), and says so. See lib/location/search.ts. */
    async search(input: { state: string; district: string; place: string | null }): Promise<ApiResult<SearchResponse>> {
      const cfg = deps.config;
      return searchPlace(input, async (kind) => {
        if (!cfg) return notConfigured();
        const q = kind === "place" ? buildSearchQuery(input) : buildSearchQuery({ district: input.district, state: input.state });
        const r = await getJson(buildSearchUrl(q, cfg.baseUrl), cfg);
        return r.ok ? ok(parseSearch(r.data)) : r;
      });
    },
  };
}
