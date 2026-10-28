import type { LocationSource, SavedLocation } from "./types.ts";
import { findState } from "./states.ts";

/**
 * Coarse rectangle around India. It also covers parts of neighbouring countries,
 * so it is only a first filter; reverse geocoding checks the actual country.
 */
export const INDIA_BOUNDS = { minLat: 6, maxLat: 38, minLon: 68, maxLon: 98 } as const;

export function isWithinIndiaBounds(lat: number, lon: number): boolean {
  return (
    lat >= INDIA_BOUNDS.minLat &&
    lat <= INDIA_BOUNDS.maxLat &&
    lon >= INDIA_BOUNDS.minLon &&
    lon <= INDIA_BOUNDS.maxLon
  );
}

/** Strict decimal parse: rejects "", "abc", "1e3", "12,5". */
export function parseCoordinate(raw: string | null): number | null {
  if (raw === null) return null;
  const t = raw.trim();
  if (!/^-?\d{1,3}(\.\d{1,10})?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function parseIndianCoords(
  latRaw: string | null,
  lonRaw: string | null,
): { lat: number; lon: number } | null {
  const lat = parseCoordinate(latRaw);
  const lon = parseCoordinate(lonRaw);
  if (lat === null || lon === null) return null;
  return isWithinIndiaBounds(lat, lon) ? { lat, lon } : null;
}

export function roundCoord(n: number, decimals = 3): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

/** Indian PIN: 6 digits, first digit 1–9. */
export function isValidPin(pin: string): boolean {
  return /^[1-9]\d{5}$/.test(pin);
}

/** Trim, collapse whitespace, remove control characters. Returns null when empty or too long. */
export function cleanText(raw: unknown, maxLen = 80): string | null {
  if (typeof raw !== "string") return null;
  const s = raw
    .normalize("NFC")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!s || s.length > maxLen) return null;
  return s;
}

/** "Rampur, Dehradun, Dehradun, Uttarakhand" → "Rampur, Dehradun, Uttarakhand" */
export function buildLabel(parts: Array<string | null | undefined>): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const s = p?.trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out.join(", ");
}

const SOURCES: readonly LocationSource[] = ["gps", "manual-geocoded", "manual-district", "manual-unverified"];

/** Validates data read back from device storage (it may be old, corrupt or edited). */
export function isSavedLocation(x: unknown): x is SavedLocation {
  if (typeof x !== "object" || x === null) return false;
  const r = x as Record<string, unknown>;
  if (r.version !== 1) return false;
  if (typeof r.state !== "string" || !findState(r.state)) return false;
  if (typeof r.district !== "string" || !cleanText(r.district, 80)) return false;
  if (r.place !== null && (typeof r.place !== "string" || !cleanText(r.place, 80))) return false;
  if (r.pin !== null && (typeof r.pin !== "string" || !isValidPin(r.pin))) return false;
  if (typeof r.label !== "string" || r.label.length === 0 || r.label.length > 200) return false;
  if (!SOURCES.includes(r.source as LocationSource)) return false;
  if (typeof r.savedAt !== "string" || Number.isNaN(Date.parse(r.savedAt))) return false;
  if (r.accuracyM !== null && (typeof r.accuracyM !== "number" || !(r.accuracyM >= 0))) return false;

  const hasLat = typeof r.lat === "number";
  const hasLon = typeof r.lon === "number";
  if (hasLat !== hasLon) return false;
  if (hasLat) {
    if (!isWithinIndiaBounds(r.lat as number, r.lon as number)) return false;
    if (r.source === "manual-unverified") return false;
  } else {
    if (r.lat !== null || r.lon !== null) return false;
    if (r.source !== "manual-unverified") return false;
  }
  return true;
}
