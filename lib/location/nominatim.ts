import type { PlaceCandidate, RankedCandidate } from "./types.ts";
import { buildLabel, isWithinIndiaBounds } from "./validate.ts";
import { normalizeRegionName, findState } from "./states.ts";

export const NOMINATIM_DEFAULT_BASE = "https://nominatim.openstreetmap.org";

export function buildReverseUrl(lat: number, lon: number, base = NOMINATIM_DEFAULT_BASE): string {
  const u = new URL("/reverse", base);
  u.searchParams.set("format", "jsonv2");
  u.searchParams.set("lat", String(lat));
  u.searchParams.set("lon", String(lon));
  u.searchParams.set("zoom", "14"); // village / suburb level
  u.searchParams.set("addressdetails", "1");
  u.searchParams.set("accept-language", "en"); // English names match our state list
  return u.toString();
}

export function buildSearchUrl(query: string, base = NOMINATIM_DEFAULT_BASE): string {
  const u = new URL("/search", base);
  u.searchParams.set("format", "jsonv2");
  u.searchParams.set("q", query);
  u.searchParams.set("countrycodes", "in");
  u.searchParams.set("addressdetails", "1");
  u.searchParams.set("limit", "5");
  u.searchParams.set("accept-language", "en");
  return u.toString();
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
}

/** Pull state / district / place out of a Nominatim `address` object. Indian districts appear under different keys. */
export function parseAddress(address: unknown): {
  state: string | null;
  district: string | null;
  place: string | null;
  postcode: string | null;
  countryCode: string | null;
  districtCandidates: string[];
} {
  const a = (typeof address === "object" && address !== null ? address : {}) as Record<string, unknown>;
  const district = str(a.state_district) ?? str(a.district) ?? str(a.county);
  const districtCandidates = [a.state_district, a.district, a.county, a.city, a.town, a.city_district]
    .map(str).filter((x): x is string => x !== null).map((x) => x.replace(/\s+district$/i, ""));
  return {
    state: str(a.state),
    district: district ? district.replace(/\s+district$/i, "") : null,
    place:
      str(a.village) ?? str(a.town) ?? str(a.city) ?? str(a.hamlet) ?? str(a.suburb) ?? str(a.municipality),
    postcode: str(a.postcode),
    countryCode: str(a.country_code)?.toLowerCase() ?? null,
    districtCandidates: [...new Set(districtCandidates)],
  };
}

function toCandidate(item: unknown): PlaceCandidate | null {
  if (typeof item !== "object" || item === null) return null;
  const r = item as Record<string, unknown>;
  const lat = num(r.lat);
  const lon = num(r.lon);
  if (lat === null || lon === null) return null;
  const addr = parseAddress(r.address);
  const label = buildLabel([addr.place, addr.district, addr.state]) || str(r.display_name)?.slice(0, 120) || "";
  if (!label) return null;
  return { label, lat, lon, ...addr };
}

/** Returns null for Nominatim's `{ "error": "Unable to geocode" }` and malformed data. */
export function parseReverse(json: unknown): PlaceCandidate | null {
  if (typeof json !== "object" || json === null || "error" in json) return null;
  return toCandidate(json);
}

/** Keeps only valid results inside India. */
export function parseSearch(json: unknown): PlaceCandidate[] {
  if (!Array.isArray(json)) return [];
  return json
    .map(toCandidate)
    .filter((c): c is PlaceCandidate => c !== null)
    .filter((c) => (c.countryCode === null || c.countryCode === "in") && isWithinIndiaBounds(c.lat, c.lon));
}

/** Matching-state results first. Others are kept (names differ between sources) but flagged for the user. */
export function rankCandidates(cands: PlaceCandidate[], selectedState: string): RankedCandidate[] {
  const want = normalizeRegionName(findState(selectedState)?.en ?? selectedState);
  const ranked = cands.map((c) => {
    const st = findState(c.state);
    const have = st ? normalizeRegionName(st.en) : c.state ? normalizeRegionName(c.state) : "";
    return { ...c, matchesState: have === want };
  });
  return [...ranked.filter((c) => c.matchesState), ...ranked.filter((c) => !c.matchesState)];
}

export function buildSearchQuery(parts: { place?: string | null; district: string; state: string }): string {
  return buildLabel([parts.place, parts.district, parts.state, "India"]);
}
