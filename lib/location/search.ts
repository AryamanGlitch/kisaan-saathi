import { ok, type ApiResult } from "../api/result.ts";
import { DISTRICT_COORDS } from "./districtCoords.ts";
import { matchDistrict } from "./districtMatch.ts";
import { rankCandidates } from "./nominatim.ts";
import { findState } from "./states.ts";
import type { PlaceCandidate, PlaceLookup, RankedCandidate, SearchResponse } from "./types.ts";
import { buildLabel } from "./validate.ts";

/** The centre of a listed district (or a spelling that matches one), from the bundled table. No network. */
export function districtCentre(state: string, district: string): RankedCandidate | null {
  const st = findState(state);
  const listed = st ? matchDistrict(st.en, [district]) : null;
  const p = st && listed ? DISTRICT_COORDS[st.en]?.[listed] : undefined;
  if (!st || !listed || !p) return null;
  return {
    label: buildLabel([listed, st.en]), lat: p[0], lon: p[1], state: st.en, district: listed, place: null,
    postcode: null, countryCode: "in", districtCandidates: [listed], matchesState: true,
  };
}

function km(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const x = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(x));
}

/**
 * Finds a place for the location form:
 * 1. the typed village, if the map knows it (results in the chosen state and nearest the district first,
 *    with the district centre offered last as a safe choice);
 * 2. otherwise the district centre from the bundled table, so every listed district always works;
 * 3. otherwise (district typed under "not listed") a live search for the district name.
 */
export async function searchPlace(
  input: { state: string; district: string; place: string | null },
  lookup: (kind: "place" | "district") => Promise<ApiResult<PlaceCandidate[]>>,
): Promise<ApiResult<SearchResponse>> {
  const centre = districtCentre(input.state, input.district);
  // Says why we fell back, so the farmer isn't told their village doesn't exist when the map service was down.
  let placeLookup: PlaceLookup = null;
  if (input.place) {
    const r = await lookup("place");
    if (r.ok && r.data.length > 0) {
      let ranked = rankCandidates(r.data, input.state);
      if (centre) {
        const near = (c: RankedCandidate) => (c.matchesState ? 0 : 1e6) + km(c, centre);
        ranked = [...ranked].sort((a, b) => near(a) - near(b)).concat(centre);
      }
      return ok({ candidates: ranked, precision: "place", placeLookup: "found" });
    }
    if (!r.ok && !centre) return r;
    placeLookup = r.ok ? "not-found" : "unavailable";
  }
  if (centre) return ok({ candidates: [centre], precision: "district", placeLookup });
  const r = await lookup("district");
  if (!r.ok) return r;
  return ok({ candidates: rankCandidates(r.data, input.state), precision: "district", placeLookup });
}
