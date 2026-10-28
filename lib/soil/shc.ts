/**
 * The 12 Soil Health Card parameters and their critical limits, exactly as published by
 * ICAR-Indian Institute of Soil Science (Harit Dhara 4(1), 2021, Table 1) — source id "iiss-shc-limits".
 * Methods behind these limits: pH & EC (1:2), N (alkaline KMnO4), P (Olsen), K (1N NH4OAc),
 * S (CaCl2), Zn/Cu/Fe/Mn (DTPA), B (hot water).
 */
export type SoilParam = "ph" | "ec" | "oc" | "n" | "p" | "k" | "s" | "zn" | "fe" | "cu" | "mn" | "b";
export type Rating = "acidic" | "neutral" | "alkaline" | "normal" | "saline" | "low" | "medium" | "high" | "deficient" | "sufficient";

export interface ParamDef {
  id: SoilParam;
  en: string;
  hi: string;
  unit: string;
  /** plausible input range, to catch typing mistakes */
  min: number;
  max: number;
  rate: (v: number) => Rating;
}

const three = (lo: number, hi: number) => (v: number): Rating => (v < lo ? "low" : v <= hi ? "medium" : "high");
const micro = (limit: number) => (v: number): Rating => (v < limit ? "deficient" : "sufficient");

export const SOIL_PARAMS: ParamDef[] = [
  { id: "ph", en: "pH", hi: "pH", unit: "", min: 0, max: 14, rate: (v) => (v < 6.5 ? "acidic" : v <= 7.0 ? "neutral" : "alkaline") },
  { id: "ec", en: "EC (salts)", hi: "EC (लवण)", unit: "dS/m", min: 0, max: 50, rate: (v) => (v > 4.0 ? "saline" : "normal") },
  { id: "oc", en: "Organic carbon", hi: "जैविक कार्बन", unit: "%", min: 0, max: 20, rate: three(0.5, 0.75) },
  { id: "n", en: "Nitrogen (N)", hi: "नाइट्रोजन (N)", unit: "kg/ha", min: 0, max: 3000, rate: three(280, 560) },
  { id: "p", en: "Phosphorus (P)", hi: "फ़ॉस्फ़ोरस (P)", unit: "kg/ha", min: 0, max: 1000, rate: three(10, 25) },
  { id: "k", en: "Potassium (K)", hi: "पोटाश (K)", unit: "kg/ha", min: 0, max: 5000, rate: three(120, 280) },
  { id: "s", en: "Sulphur (S)", hi: "सल्फ़र (S)", unit: "mg/kg", min: 0, max: 1000, rate: micro(10) },
  { id: "zn", en: "Zinc (Zn)", hi: "ज़िंक (Zn)", unit: "mg/kg", min: 0, max: 500, rate: micro(0.6) },
  { id: "fe", en: "Iron (Fe)", hi: "आयरन (Fe)", unit: "mg/kg", min: 0, max: 1000, rate: micro(4.5) },
  { id: "cu", en: "Copper (Cu)", hi: "कॉपर (Cu)", unit: "mg/kg", min: 0, max: 500, rate: micro(0.2) },
  { id: "mn", en: "Manganese (Mn)", hi: "मैंगनीज़ (Mn)", unit: "mg/kg", min: 0, max: 1000, rate: micro(2.0) },
  { id: "b", en: "Boron (B)", hi: "बोरॉन (B)", unit: "mg/kg", min: 0, max: 100, rate: micro(0.5) },
];

export const PARAM_BY_ID = Object.fromEntries(SOIL_PARAMS.map((p) => [p.id, p])) as Record<SoilParam, ParamDef>;

export type SoilValues = Partial<Record<SoilParam, number>>;

export interface SoilCard {
  version: 1;
  values: SoilValues;
  testDate: string | null; // YYYY-MM-DD from the card
  savedAt: string;
}

/** Strict number parse for typed card values ("7.8" ok, "7,8" ok, "abc" no). */
export function parseSoilNumber(raw: string): number | null {
  const t = raw.trim().replace(",", ".");
  if (!/^\d{1,5}(\.\d{1,4})?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function validValue(id: SoilParam, v: number): boolean {
  const d = PARAM_BY_ID[id];
  return v >= d.min && v <= d.max;
}

export function rateAll(values: SoilValues): Array<{ id: SoilParam; value: number; rating: Rating }> {
  return SOIL_PARAMS.flatMap((d) => {
    const v = values[d.id];
    return v === undefined ? [] : [{ id: d.id, value: v, rating: d.rate(v) }];
  });
}

/** Ratings that usually need attention (shown first, highlighted). */
export const CONCERN: Rating[] = ["acidic", "alkaline", "saline", "low", "deficient"];

export function isSoilCard(x: unknown): x is SoilCard {
  if (typeof x !== "object" || x === null) return false;
  const r = x as Record<string, unknown>;
  if (r.version !== 1 || typeof r.savedAt !== "string") return false;
  if (r.testDate !== null && (typeof r.testDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(r.testDate))) return false;
  if (typeof r.values !== "object" || r.values === null) return false;
  for (const [k, v] of Object.entries(r.values as Record<string, unknown>)) {
    if (!(k in PARAM_BY_ID) || typeof v !== "number" || !validValue(k as SoilParam, v)) return false;
  }
  return true;
}
