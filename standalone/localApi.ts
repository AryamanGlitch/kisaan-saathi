/**
 * In-browser replacement for the server API, used only by the single-file build (index.html).
 * Same paths and response shapes as app/api/*, so every page works unchanged.
 * Calls go straight from the browser to Open-Meteo (weather, place search) and Google (Gemini).
 */
import { fail, ok, type ApiErrorCode, type ApiResult } from "../lib/api/result.ts";
import { answer } from "../lib/assistant/service.ts";
import { parseAssistantRequest } from "../lib/assistant/validate.ts";
import { findState } from "../lib/location/states.ts";
import { buildReverseUrl, parseReverse } from "../lib/location/nominatim.ts";
import { searchPlace } from "../lib/location/search.ts";
import { roundCoord } from "../lib/location/validate.ts";
import { createSerialThrottle } from "../lib/server/throttle.ts";
import type { PlaceCandidate } from "../lib/location/types.ts";
import { buildGeocodingUrl, parseGeocoding } from "../lib/location/openMeteoGeocoding.ts";
import { cleanText, parseIndianCoords } from "../lib/location/validate.ts";
import type { SearchResponse } from "../lib/location/types.ts";
import { schemesForState } from "../lib/schemes/data.ts";
import { lastCheckedOk, schemeFreshness } from "../lib/schemes/freshness.ts";
import { getGeminiConfig, getWeatherConfig } from "../lib/server/config.ts";
import { generateJsonWithFallback } from "../lib/assistant/gemini.ts";
import { fetchJson } from "../lib/server/fetchJson.ts";
import { createWeatherService } from "../lib/server/weatherService.ts";
import { createSoilService } from "../lib/server/soilService.ts";
import { SOURCES } from "../lib/sources.ts";
import { utilitiesForState } from "../lib/utilities/data.ts";

export type ClientErrorCode = ApiErrorCode | "NETWORK" | "SERVER";
export type ClientResult<T> = { ok: true; data: T } | { ok: false; code: ClientErrorCode; retryAfterSec?: number };

const weather = createWeatherService({ config: getWeatherConfig({}) });
const soil = createSoilService();
export const GEMINI_KEY_STORAGE = "ks:gemini:v1";

export function readGeminiKey(): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(GEMINI_KEY_STORAGE) ?? "null");
    return typeof v?.apiKey === "string" && v.apiKey ? v.apiKey : null;
  } catch {
    return null;
  }
}

async function searchPlaces(p: URLSearchParams): Promise<ApiResult<SearchResponse>> {
  const state = findState(p.get("state"));
  const district = cleanText(p.get("district"), 60);
  const rawPlace = p.get("place");
  const place = rawPlace && rawPlace.trim() ? cleanText(rawPlace, 60) : null;
  if (!state || !district) return fail("BAD_REQUEST", "state and district required");
  // Open-Meteo only knows towns and villages, so listed districts come from the bundled centre table (lib/location/search.ts).
  return searchPlace({ state: state.en, district, place }, async (kind) => {
    const r = await fetchJson(buildGeocodingUrl(`${kind === "place" ? place : district}, ${state.en}`), { timeoutMs: 10_000 });
    if (!r.ok) {
      if (r.failure.kind === "timeout") return fail("UPSTREAM_TIMEOUT", "Place search timed out");
      if (r.failure.kind === "http" && r.failure.status === 429) return fail("RATE_LIMITED", "Place search busy", { retryAfterSec: 60 });
      return fail("UPSTREAM_ERROR", "Place search failed");
    }
    return ok(parseGeocoding(r.json));
  });
}

/**
 * Area name for a GPS position via OpenStreetMap Nominatim, straight from the browser.
 * Usage policy (operations.osmfoundation.org/policies/nominatim): identify the app (browsers send the site's
 * address as Referer), at most 1 request/second, cache results, attribute OSM. One farmer = one or two lookups.
 * If it fails, the app keeps the GPS position and asks for state and district.
 */
const reverseThrottle = createSerialThrottle({ minIntervalMs: 1100, maxQueue: 3 });
const REV_CACHE = "ks:revcache:v1";

async function reverseInBrowser(p: URLSearchParams): Promise<ApiResult<PlaceCandidate>> {
  const c = parseIndianCoords(p.get("lat"), p.get("lon"));
  if (!c) return fail("BAD_REQUEST", "bad coordinates");
  const key = `${roundCoord(c.lat, 3)},${roundCoord(c.lon, 3)}`;
  let cache: Record<string, PlaceCandidate> = {};
  try {
    cache = JSON.parse(localStorage.getItem(REV_CACHE) ?? "{}") ?? {};
  } catch {
    cache = {};
  }
  const hit = cache[key];
  if (hit) return ok(hit);
  let r;
  try {
    r = await reverseThrottle(() => fetchJson(buildReverseUrl(roundCoord(c.lat, 3), roundCoord(c.lon, 3)), { timeoutMs: 10_000 }));
  } catch {
    return fail("RATE_LIMITED", "Busy");
  }
  if (!r.ok) return fail(r.failure.kind === "timeout" ? "UPSTREAM_TIMEOUT" : "UPSTREAM_ERROR", "Area lookup failed");
  const cand = parseReverse(r.json);
  if (!cand) return fail("NOT_FOUND", "No area name for this position");
  if (cand.countryCode !== null && cand.countryCode !== "in") return fail("OUTSIDE_INDIA", "Outside India");
  try {
    const keys = Object.keys(cache);
    if (keys.length > 50) delete cache[keys[0]!];
    cache[key] = cand;
    localStorage.setItem(REV_CACHE, JSON.stringify(cache));
  } catch {
    /* caching is optional */
  }
  return ok(cand);
}

async function route(method: string, path: string, body: unknown): Promise<ApiResult<unknown>> {
  const url = new URL(path, "https://local.invalid");
  const p = url.searchParams;
  switch (`${method} ${url.pathname}`) {
    case "GET /api/weather": {
      const c = parseIndianCoords(p.get("lat"), p.get("lon"));
      return c ? weather.get(c.lat, c.lon, { force: p.get("refresh") === "1" }) : fail("BAD_REQUEST", "bad coordinates");
    }
    case "GET /api/soil": {
      const c = parseIndianCoords(p.get("lat"), p.get("lon"));
      return c ? soil.get(c.lat, c.lon) : fail("BAD_REQUEST", "bad coordinates");
    }
    case "GET /api/location/reverse":
      return reverseInBrowser(p);
    case "GET /api/location/search":
      return searchPlaces(p);
    case "GET /api/schemes": {
      const raw = p.get("state");
      const state = raw ? findState(raw) : null;
      const now = Date.now();
      const schemes = schemesForState(state?.en ?? null).map((s) => ({
        ...s, freshness: schemeFreshness(s, null, now), lastCheckedOk: lastCheckedOk(s, null), sources: s.sourceIds.map((id) => SOURCES[id]),
      }));
      return ok({ schemes, monitoring: { persistent: false, error: false }, stateCovered: state?.en ?? null });
    }
    case "GET /api/utilities": {
      const state = findState(p.get("state"));
      if (!state) return fail("BAD_REQUEST", "Unknown state");
      return ok({ utilities: utilitiesForState(state.en).map((u) => ({ ...u, source: SOURCES[u.sourceId], live: null, liveAvailable: false, liveError: false })) });
    }
    case "POST /api/assistant": {
      const req = parseAssistantRequest(body);
      if (!req) return fail("BAD_REQUEST", "Invalid request");
      const key = readGeminiKey();
      return answer(req, {
        config: key ? getGeminiConfig({ GEMINI_API_KEY: key }) : null,
        async getWeather(lat, lon) {
          const r = await weather.get(lat, lon);
          return r.ok ? { report: r.data.report, fetchedAt: r.data.fetchedAt } : null;
        },
      });
    }
    default:
      return fail("NOT_FOUND", "No such route");
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<ClientResult<T>> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return { ok: false, code: "NETWORK" };
  try {
    const r = (await route(method, path, body)) as ApiResult<T>;
    return r.ok ? { ok: true, data: r.data } : { ok: false, code: r.error.code, retryAfterSec: r.error.retryAfterSec };
  } catch {
    return { ok: false, code: "SERVER" };
  }
}

// Same signatures as lib/client/api.ts; the signal is accepted but not used here.
export const getApi = <T,>(path: string, _signal?: AbortSignal) => call<T>("GET", path); // eslint-disable-line @typescript-eslint/no-unused-vars
export const postApi = <T,>(path: string, body: unknown, _signal?: AbortSignal) => call<T>("POST", path, body); // eslint-disable-line @typescript-eslint/no-unused-vars

/** One tiny request to Google to confirm a key works. Only runs when the user saves or re-tests a key. */
export async function testGeminiKey(key: string): Promise<{ ok: true; model: string } | { ok: false; code: ClientErrorCode }> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return { ok: false, code: "NETWORK" };
  const cfg = getGeminiConfig({ GEMINI_API_KEY: key });
  if (!cfg) return { ok: false, code: "BAD_REQUEST" };
  try {
    const { result, model } = await generateJsonWithFallback(
      { ...cfg, timeoutMs: 20_000 },
      "This is a connection test. Reply with kind out_of_scope and empty values for every other field.",
      [{ role: "user", parts: [{ text: "Connection test." }] }],
    );
    return result.ok ? { ok: true, model } : { ok: false, code: result.error.code };
  } catch {
    return { ok: false, code: "SERVER" };
  }
}
