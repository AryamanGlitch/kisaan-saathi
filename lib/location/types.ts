export type LocationSource = "gps" | "manual-geocoded" | "manual-unverified";

/** Everything the app stores about a farmer's location — nothing more. Saved on the device only. */
export interface SavedLocation {
  version: 1;
  state: string; // canonical English name from INDIA_STATES
  district: string;
  place: string | null; // village / town
  pin: string | null;
  lat: number | null; // rounded to 3 decimals (~100 m); null when not found on the map
  lon: number | null;
  accuracyM: number | null; // GPS accuracy, when from GPS
  label: string;
  source: LocationSource;
  savedAt: string; // ISO timestamp
}

/** A place returned by the geocoder. */
export interface PlaceCandidate {
  label: string;
  lat: number;
  lon: number;
  state: string | null;
  district: string | null;
  place: string | null;
  postcode: string | null;
  countryCode: string | null;
  /** All district-like names from the map (district, county/tehsil, city) to match against the official list. */
  districtCandidates?: string[];
}

export interface RankedCandidate extends PlaceCandidate {
  matchesState: boolean;
}

export type SearchPrecision = "place" | "district";

export interface SearchResponse {
  candidates: RankedCandidate[];
  precision: SearchPrecision;
}
