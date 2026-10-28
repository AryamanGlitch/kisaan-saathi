/**
 * Village-wise Soil Health Card "nutrient status" data: for each village, how many soil samples
 * fell in each level (e.g. Nitrogen: Low 12, Medium 3, High 0). The national file is over 1 GB,
 * so scripts/build-soil-data.ts turns it into small per-state and per-district files the website
 * loads on demand. Pure functions only.
 */
import type { Rating, SoilParam } from "./shc.ts";
import { CONCERN } from "./shc.ts";

/** Levels of each parameter, in the fixed order used by the compact count arrays. */
export const LEVELS: ReadonlyArray<[SoilParam, readonly Rating[]]> = [
  ["ph", ["acidic", "neutral", "alkaline"]],
  ["ec", ["normal", "saline"]],
  ["oc", ["low", "medium", "high"]],
  ["n", ["low", "medium", "high"]],
  ["p", ["low", "medium", "high"]],
  ["k", ["low", "medium", "high"]],
  ["s", ["deficient", "sufficient"]],
  ["zn", ["deficient", "sufficient"]],
  ["fe", ["deficient", "sufficient"]],
  ["cu", ["deficient", "sufficient"]],
  ["mn", ["deficient", "sufficient"]],
  ["b", ["deficient", "sufficient"]],
];

const OFFSET = new Map<SoilParam, number>();
let width = 0;
for (const [id, lv] of LEVELS) { OFFSET.set(id, width); width += lv.length; }
/** Length of one compact count array (29). */
export const COUNTS_WIDTH = width;

const key = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

const NUTRIENTS: Record<string, SoilParam> = {
  soilph: "ph", ph: "ph", electricalconductivity: "ec", ec: "ec", organiccarbon: "oc", oc: "oc",
  nitrogen: "n", phosphorus: "p", potassium: "k", sulphur: "s", sulfur: "s",
  zinc: "zn", iron: "fe", copper: "cu", manganese: "mn", boron: "b",
};

const LEVEL_NAMES: Record<string, Rating> = {
  acidic: "acidic", neutral: "neutral", alkaline: "alkaline", nonsaline: "normal", normal: "normal", saline: "saline",
  low: "low", medium: "medium", high: "high", deficient: "deficient", sufficient: "sufficient",
};

/** Position in the compact count array for a nutrient name and level as written in the portal data, or null. */
export function slotOf(nutrient: string, level: string): number | null {
  const id = NUTRIENTS[key(nutrient)];
  const rating = LEVEL_NAMES[key(level)];
  if (!id || !rating) return null;
  const i = LEVELS.find(([p]) => p === id)![1].indexOf(rating);
  return i < 0 ? null : OFFSET.get(id)! + i;
}

export interface NutrientColumns {
  year: number;
  state: number;
  district: number;
  districtCode: number | null;
  block: number;
  village: number;
  villageCode: number | null;
  nutrient: number;
  level: number;
  value: number;
}

export function detectNutrientColumns(header: string[]): NutrientColumns | null {
  const h = header.map((x) => x.toLowerCase().replace(/^﻿/, "").trim().replace(/[\s-]+/g, "_"));
  const find = (re: RegExp) => { const i = h.findIndex((x) => re.test(x)); return i >= 0 ? i : null; };
  const c = {
    year: find(/^year$/), state: find(/^state(_name)?$/), district: find(/^district(_name)?$/), districtCode: find(/^district_code$/),
    block: find(/^block(_name)?$/), village: find(/^village(_name)?$/), villageCode: find(/^village_code$/),
    nutrient: find(/^nutrient(_name)?$/), level: find(/^nutrient_level$|^level$/), value: find(/^value$|^count$|^samples?$/),
  };
  const optional = new Set(["districtCode", "villageCode"]);
  if (Object.entries(c).some(([k, v]) => v === null && !optional.has(k))) return null;
  return c as NutrientColumns;
}

export function emptyCounts(): number[] {
  return new Array<number>(COUNTS_WIDTH).fill(0);
}

export function addInto(into: number[], from: readonly number[]): number[] {
  for (let i = 0; i < COUNTS_WIDTH; i++) into[i]! += from[i] ?? 0;
  return into;
}

export function sumCounts(list: ReadonlyArray<readonly number[]>): number[] {
  const out = emptyCounts();
  for (const c of list) addInto(out, c);
  return out;
}

/** Number of samples: the most-tested parameter's total (not every sample is tested for every parameter, so this is a lower bound). */
export function sampleCount(counts: readonly number[]): number {
  return Math.max(...LEVELS.map(([id, lv]) => counts.slice(OFFSET.get(id)!, OFFSET.get(id)! + lv.length).reduce((a, b) => a + b, 0)));
}

export interface NutrientShare {
  id: SoilParam;
  total: number;
  levels: Array<{ rating: Rating; count: number; pct: number }>;
  /** Share of samples in a level that needs attention (low, deficient, acidic, alkaline, saline). */
  concernPct: number;
}

/** Percent of samples in each level, per parameter; parameters with no samples are left out. */
export function shares(counts: readonly number[]): NutrientShare[] {
  const out: NutrientShare[] = [];
  for (const [id, lv] of LEVELS) {
    const o = OFFSET.get(id)!;
    const vals = lv.map((_, i) => counts[o + i] ?? 0);
    const total = vals.reduce((a, b) => a + b, 0);
    if (total === 0) continue;
    const levels = lv.map((rating, i) => ({ rating, count: vals[i]!, pct: Math.round((vals[i]! / total) * 100) }));
    const concern = levels.filter((l) => CONCERN.includes(l.rating)).reduce((a, l) => a + l.count, 0);
    out.push({ id, total, levels, concernPct: Math.round((concern / total) * 100) });
  }
  return out;
}

/* ---------- Files the website loads ---------- */

/** public/data/soil/<state>.json */
export interface SoilStateFile {
  version: 1;
  state: string;
  source: string;
  generatedAt: string;
  years: string[];
  /** `name` as in the data; `app` is the matching name in the app's district list (null when none matched). */
  districts: Array<{ name: string; app: string | null; file: string; samples: number; villages: number; counts: number[] }>;
}

/** public/data/soil/<state>/<district>.json — villages as [block index, village name, counts]. */
export interface SoilDistrictFile {
  version: 1;
  state: string;
  district: string;
  years: string[];
  blocks: string[];
  villages: Array<[number, string, number[]]>;
}

const isCounts = (x: unknown) => Array.isArray(x) && x.length === COUNTS_WIDTH;

export function isSoilStateFile(x: unknown): x is SoilStateFile {
  if (typeof x !== "object" || x === null) return false;
  const r = x as Record<string, unknown>;
  return r.version === 1 && typeof r.state === "string" && typeof r.source === "string" && Array.isArray(r.years) &&
    Array.isArray(r.districts) && r.districts.every((d) => typeof d?.name === "string" && typeof d?.file === "string" && isCounts(d?.counts));
}

export function isSoilDistrictFile(x: unknown): x is SoilDistrictFile {
  if (typeof x !== "object" || x === null) return false;
  const r = x as Record<string, unknown>;
  return r.version === 1 && typeof r.district === "string" && Array.isArray(r.blocks) && Array.isArray(r.villages) &&
    r.villages.every((v) => Array.isArray(v) && typeof v[0] === "number" && typeof v[1] === "string" && isCounts(v[2]));
}

/** Village name as typed or from GPS vs. portal spelling: letters only, lowercase. */
export function normPlace(s: string): string {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z]/g, "");
}

/** Villages whose name matches the farmer's place name (there can be several with the same name). */
export function findVillages(file: SoilDistrictFile, place: string | null | undefined): number[] {
  const want = place ? normPlace(place) : "";
  if (want.length < 3) return [];
  const out: number[] = [];
  file.villages.forEach((v, i) => { if (normPlace(v[1]) === want) out.push(i); });
  return out;
}
