import { isStateCropFile, stateSlug, type CropStat, type StateCropFile } from "../crops/dataset.ts";
import type { CropId } from "../crops/catalog.ts";
import { normDistrict } from "../location/districtMatch.ts";

/**
 * Loads the per-state crop file made by scripts/build-crop-data.ts, if it was uploaded with the site.
 * Server version: public/data/crops/…  Single file: data/crops/… next to index.html.
 */
const BASE: string = process.env.NEXT_PUBLIC_DATA_BASE ?? "/data/";
const memo = new Map<string, Promise<StateCropFile | null>>();
let index: Promise<Set<string> | null> | null = null;

/** File names listed in crops/index.json (one request), so states without a file are never requested. */
function listedFiles(): Promise<Set<string> | null> {
  index ??= fetch(`${BASE}crops/index.json`, { cache: "no-cache" })
    .then((r) => (r.ok ? r.json() : null))
    .then((j: { states?: Array<{ file?: unknown }> } | null) => (Array.isArray(j?.states) ? new Set(j.states.map((s) => String(s.file))) : null))
    .catch(() => null);
  return index;
}

export function loadStateCrops(state: string): Promise<StateCropFile | null> {
  // Browsers never let a page opened from disk (file://) read other files, so don't try.
  if (typeof location !== "undefined" && location.protocol === "file:") return Promise.resolve(null);
  const slug = stateSlug(state);
  if (!memo.has(slug)) {
    memo.set(slug, listedFiles().then((files) => !files?.has(`${slug}.json`) ? null
      : fetch(`${BASE}crops/${slug}.json`, { cache: "no-cache" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => (isStateCropFile(j) ? j : null)))
      .catch(() => null));
  }
  return memo.get(slug)!;
}

export function districtStats(file: StateCropFile, district: string): CropStat[] | null {
  const want = normDistrict(district.replace(/\(.*\)/, ""));
  const alt = /\((.*)\)/.exec(district)?.[1];
  for (const [name, crops] of Object.entries(file.districts)) {
    const n = normDistrict(name);
    if (n === want || (alt && n === normDistrict(alt))) return crops;
  }
  return null;
}

/** Catalog crops grown anywhere in the state, for crop menus when the district is unknown or missing from the file. */
export function stateCropIds(file: StateCropFile): CropId[] {
  const ids = new Set<CropId>();
  for (const crops of Object.values(file.districts)) for (const c of crops) if (c.cropId) ids.add(c.cropId);
  return [...ids];
}
