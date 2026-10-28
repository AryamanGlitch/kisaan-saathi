import type { Advisory } from "../weather/advisories.ts";
import { normalizeRegionName } from "../location/states.ts";
import { addDays } from "../time.ts";
import type { CropId } from "./catalog.ts";
import type { CropRecord, DistrictCropData, MonthWeek, SowingWindow, WaterRegime } from "./types.ts";

/**
 * Structured crop suggestions from verified sowing windows. No AI here: every suggestion
 * traces back to a source window. Gemini may later explain these results, not change them.
 */

const CUM = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const DIM = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const YEAR = 365;

function monthIndex(m: number): number {
  if (!Number.isInteger(m) || m < 1 || m > 12) throw new RangeError(`bad month ${m}`);
  return m - 1;
}

export function startOrdinal(mw: MonthWeek): number {
  const i = monthIndex(mw.month);
  return (CUM[i] ?? 0) + (mw.week ? (mw.week - 1) * 7 + 1 : 1);
}

export function endOrdinal(mw: MonthWeek): number {
  const i = monthIndex(mw.month);
  const last = DIM[i] ?? 30;
  const day = mw.week ? (mw.week === 4 ? last : mw.week * 7) : last;
  return (CUM[i] ?? 0) + day;
}

/** Day of year on a fixed 365-day calendar (29 Feb counts as 28 Feb). */
export function ordinalOf(isoDate: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) throw new RangeError(`bad date ${isoDate}`);
  const month = Number(m[2]);
  const i = monthIndex(month);
  const day = Math.min(Number(m[3]), DIM[i] ?? 31);
  if (day < 1) throw new RangeError(`bad date ${isoDate}`);
  return (CUM[i] ?? 0) + day;
}

export type WindowPosition =
  | { status: "open"; daysLeft: number }
  | { status: "upcoming"; daysUntil: number };

/** Where `x` sits relative to a window (windows may wrap past 31 Dec). */
export function windowPosition(w: SowingWindow, x: number): WindowPosition {
  const s = startOrdinal(w.start);
  const e = endOrdinal(w.end);
  const wraps = e < s;
  const inside = wraps ? x >= s || x <= e : x >= s && x <= e;
  if (inside) {
    const daysLeft = wraps && x >= s ? YEAR - x + e : e - x;
    return { status: "open", daysLeft };
  }
  const daysUntil = x < s ? s - x : YEAR - x + s;
  return { status: "upcoming", daysUntil };
}

export const SOON_DAYS = 21;

export interface RecommendInput {
  state: string;
  district: string;
  sowingDate: string; // YYYY-MM-DD
  water: WaterRegime;
  previousCrop: CropId | null;
}

export interface CropSuggestion {
  cropId: CropId;
  window: SowingWindow;
  /** Farmer has irrigation, but the source only lists this crop for rainfed fields. */
  usesRainfedWindow: boolean;
  timing: { status: "open"; daysLeft: number } | { status: "soon"; daysUntil: number };
  sameAsPrevious: boolean;
  forecastRisks: Advisory[];
  durationDays: CropRecord["durationDays"];
}

export interface NotNow {
  cropId: CropId;
  reason: "window-closed" | "needs-irrigation";
  nextOpensInDays: number | null;
  window: SowingWindow;
}

export type RecommendResult =
  | { kind: "no-data" }
  | {
      kind: "ok";
      data: Pick<DistrictCropData, "state" | "district" | "sourceId" | "sourceSection" | "kvk">;
      suggestions: CropSuggestion[];
      notNow: NotNow[];
    };

export function findDistrictData(state: string, district: string, all: DistrictCropData[]): DistrictCropData | null {
  const st = normalizeRegionName(state);
  const d = normalizeRegionName(district);
  if (!d) return null;
  return (
    all.find(
      (x) => normalizeRegionName(x.state) === st && (normalizeRegionName(x.district) === d || x.aliases.some((a) => normalizeRegionName(a) === d)),
    ) ?? null
  );
}

function pickWindow(rec: CropRecord, water: WaterRegime): { window: SowingWindow; usesRainfedWindow: boolean } | null {
  const own = rec.windows.find((w) => w.regime === water);
  if (own) return { window: own, usesRainfedWindow: false };
  if (water === "irrigated") {
    const rainfed = rec.windows.find((w) => w.regime === "rainfed");
    if (rainfed) return { window: rainfed, usesRainfedWindow: true };
  }
  return null;
}

/** Forecast advisories falling on the sowing date or the 2 days after it. */
function risksAround(sowingDate: string, advisories: Advisory[]): Advisory[] {
  const last = addDays(sowingDate, 2);
  return advisories.filter((a) => a.date >= sowingDate && a.date <= last);
}

export function recommendCrops(input: RecommendInput, all: DistrictCropData[], advisories: Advisory[] = []): RecommendResult {
  const data = findDistrictData(input.state, input.district, all);
  if (!data) return { kind: "no-data" };
  const x = ordinalOf(input.sowingDate);
  const suggestions: CropSuggestion[] = [];
  const notNow: NotNow[] = [];

  for (const rec of data.records) {
    const picked = pickWindow(rec, input.water);
    if (!picked) {
      const w = rec.windows[0];
      if (w) notNow.push({ cropId: rec.cropId, reason: "needs-irrigation", nextOpensInDays: null, window: w });
      continue;
    }
    const pos = windowPosition(picked.window, x);
    const base = {
      cropId: rec.cropId,
      window: picked.window,
      usesRainfedWindow: picked.usesRainfedWindow,
      sameAsPrevious: input.previousCrop === rec.cropId,
      forecastRisks: risksAround(input.sowingDate, advisories),
      durationDays: rec.durationDays,
    };
    if (pos.status === "open") suggestions.push({ ...base, timing: { status: "open", daysLeft: pos.daysLeft } });
    else if (pos.daysUntil <= SOON_DAYS) suggestions.push({ ...base, timing: { status: "soon", daysUntil: pos.daysUntil } });
    else notNow.push({ cropId: rec.cropId, reason: "window-closed", nextOpensInDays: pos.daysUntil, window: picked.window });
  }

  // Open windows first (closing soonest first: most urgent), then upcoming (opening soonest first).
  suggestions.sort((a, b) => {
    if (a.timing.status !== b.timing.status) return a.timing.status === "open" ? -1 : 1;
    if (a.timing.status === "open" && b.timing.status === "open") return a.timing.daysLeft - b.timing.daysLeft;
    if (a.timing.status === "soon" && b.timing.status === "soon") return a.timing.daysUntil - b.timing.daysUntil;
    return 0;
  });
  notNow.sort((a, b) => (a.nextOpensInDays ?? 999) - (b.nextOpensInDays ?? 999));

  const { state, district, sourceId, sourceSection, kvk } = data;
  return { kind: "ok", data: { state, district, sourceId, sourceSection, kvk }, suggestions, notNow };
}

/** Crops whose sowing window (any regime) includes the date — for the dashboard. */
export function cropsSowableOn(state: string, district: string, isoDate: string, all: DistrictCropData[]): Array<{ cropId: CropId; window: SowingWindow }> {
  const data = findDistrictData(state, district, all);
  if (!data) return [];
  const x = ordinalOf(isoDate);
  const out: Array<{ cropId: CropId; window: SowingWindow }> = [];
  for (const rec of data.records) {
    for (const w of rec.windows) {
      if (windowPosition(w, x).status === "open") out.push({ cropId: rec.cropId, window: w });
    }
  }
  return out;
}
