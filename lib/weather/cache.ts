import type { WeatherPayload } from "../server/weatherService.ts";

/** One last-good weather copy per device, tied to the coordinates it was fetched for. */
export interface CachedWeather {
  lat: number;
  lon: number;
  savedAt: string;
  payload: WeatherPayload;
}

export function isCachedWeather(x: unknown, lat: number, lon: number): x is CachedWeather {
  if (typeof x !== "object" || x === null) return false;
  const c = x as Record<string, unknown>;
  if (c.lat !== lat || c.lon !== lon || typeof c.savedAt !== "string") return false;
  const p = c.payload as Record<string, unknown> | null;
  if (typeof p !== "object" || p === null || typeof p.fetchedAt !== "string") return false;
  const r = p.report as Record<string, unknown> | null;
  if (typeof r !== "object" || r === null || !Array.isArray(r.daily)) return false;
  const cur = r.current as Record<string, unknown> | null;
  return typeof cur === "object" && cur !== null && typeof cur.temperatureC === "number";
}
