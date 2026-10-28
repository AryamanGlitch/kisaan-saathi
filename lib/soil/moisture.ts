/** Soil moisture & temperature from the Open-Meteo forecast model (estimates, not measurements). */
export const SOIL_VARS = ["soil_temperature_6cm", "soil_moisture_0_to_1cm", "soil_moisture_3_to_9cm", "soil_moisture_9_to_27cm"] as const;

export interface SoilNow {
  time: string;
  temp6cmC: number | null;
  moisture0to1: number | null; // m³ of water per m³ of soil
  moisture3to9: number | null;
  moisture9to27: number | null;
  /** change of 3–9 cm moisture over the next 24 h (model) */
  trend3to9: number | null;
}

export function buildSoilUrl(lat: number, lon: number, base = "https://api.open-meteo.com/v1/forecast"): string {
  const u = new URL(base);
  u.searchParams.set("latitude", String(lat));
  u.searchParams.set("longitude", String(lon));
  u.searchParams.set("hourly", SOIL_VARS.join(","));
  u.searchParams.set("timezone", "Asia/Kolkata");
  u.searchParams.set("forecast_days", "2");
  return u.toString();
}

const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Picks the hour at or just before `nowLocal` ("YYYY-MM-DDTHH:mm", IST). Returns null if the data is unusable. */
export function parseSoil(json: unknown, nowLocal: string): SoilNow | null {
  const h = (json as { hourly?: Record<string, unknown> } | null)?.hourly;
  if (!h || !Array.isArray(h.time) || h.time.length === 0) return null;
  const times = h.time as unknown[];
  if (!times.every((t) => typeof t === "string")) return null;
  const col = (k: string) => (Array.isArray(h[k]) && (h[k] as unknown[]).length === times.length ? (h[k] as unknown[]) : null);
  let idx = -1;
  for (let i = 0; i < times.length; i++) if ((times[i] as string) <= nowLocal) idx = i;
  if (idx < 0) idx = 0;
  const m39 = col("soil_moisture_3_to_9cm");
  const now39 = m39 ? n(m39[idx]) : null;
  const later39 = m39 && idx + 24 < times.length ? n(m39[idx + 24]) : null;
  const out: SoilNow = {
    time: times[idx] as string,
    temp6cmC: col("soil_temperature_6cm") ? n(col("soil_temperature_6cm")![idx]) : null,
    moisture0to1: col("soil_moisture_0_to_1cm") ? n(col("soil_moisture_0_to_1cm")![idx]) : null,
    moisture3to9: now39,
    moisture9to27: col("soil_moisture_9_to_27cm") ? n(col("soil_moisture_9_to_27cm")![idx]) : null,
    trend3to9: now39 !== null && later39 !== null ? Math.round((later39 - now39) * 1000) / 1000 : null,
  };
  return out.temp6cmC === null && out.moisture3to9 === null ? null : out;
}
