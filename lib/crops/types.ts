import type { SourceId } from "../sources.ts";
import type { CropId } from "./catalog.ts";

export type WaterRegime = "irrigated" | "rainfed";
export type Season = "kharif" | "rabi" | "annual";

/** week 1 starts on day 1, 2 on day 8, 3 on day 15, 4 on day 22 and runs to month end. No week = whole month. */
export interface MonthWeek {
  month: number; // 1-12
  week?: 1 | 2 | 3 | 4;
}

export interface SowingWindow {
  regime: WaterRegime;
  season: Season;
  start: MonthWeek;
  end: MonthWeek;
  /** The window exactly as written in the source, shown to the farmer. */
  sourceText: string;
}

export interface CropRecord {
  cropId: CropId;
  windows: SowingWindow[];
  /** null = the verified source does not state it. Never filled from memory. */
  durationDays: { min: number; max: number } | null;
}

export interface DistrictCropData {
  state: string;
  district: string;
  aliases: string[];
  sourceId: SourceId;
  /** Section number in the source document the windows come from (e.g. "1.12"). */
  sourceSection: string;
  records: CropRecord[];
  kvk: { name: string; phone: string | null; email: string | null; sourceId: SourceId } | null;
}
