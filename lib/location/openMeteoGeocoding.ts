import type { PlaceCandidate } from "./types.ts";
import { buildLabel, isWithinIndiaBounds } from "./validate.ts";

/** Open-Meteo geocoding: free, no key, browser-friendly (CORS). Docs: https://open-meteo.com/en/docs/geocoding-api */
export const OPEN_METEO_GEOCODING = "https://geocoding-api.open-meteo.com/v1/search";

/** `name` may carry an admin1 qualifier ("Rampur, Uttarakhand"); results are limited to India. */
export function buildGeocodingUrl(name: string, base = OPEN_METEO_GEOCODING): string {
  const u = new URL(base);
  u.searchParams.set("name", name);
  u.searchParams.set("count", "10");
  u.searchParams.set("language", "en");
  u.searchParams.set("format", "json");
  u.searchParams.set("countryCode", "IN");
  return u.toString();
}

const s = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export function parseGeocoding(json: unknown): PlaceCandidate[] {
  const results = (json as { results?: unknown } | null)?.results;
  if (!Array.isArray(results)) return [];
  const out: PlaceCandidate[] = [];
  for (const r of results) {
    if (typeof r !== "object" || r === null) continue;
    const x = r as Record<string, unknown>;
    const lat = typeof x.latitude === "number" ? x.latitude : NaN;
    const lon = typeof x.longitude === "number" ? x.longitude : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !isWithinIndiaBounds(lat, lon)) continue;
    if (s(x.country_code) && s(x.country_code)!.toUpperCase() !== "IN") continue;
    const place = s(x.name);
    const district = s(x.admin2);
    const state = s(x.admin1);
    const postcodes = Array.isArray(x.postcodes) ? x.postcodes.filter((p): p is string => typeof p === "string") : [];
    out.push({ label: buildLabel([place, district, state]), lat, lon, state, district, place, postcode: postcodes[0] ?? null, countryCode: "in",
      districtCandidates: [s(x.admin2), s(x.admin3), place].filter((v): v is string => v !== null) });
  }
  return out;
}
