import { stateSlug } from "../crops/dataset.ts";
import { normDistrict } from "../location/districtMatch.ts";
import { isSoilDistrictFile, isSoilStateFile, type SoilDistrictFile, type SoilStateFile } from "../soil/nutrientStatus.ts";

/**
 * Loads the village-wise soil test files made by scripts/build-soil-data.ts.
 * Server version: public/data/soil/…  Single file: data/soil/… next to index.html.
 */
const BASE: string = process.env.NEXT_PUBLIC_DATA_BASE ?? "/data/";
const memo = new Map<string, Promise<unknown>>();

function getJson(path: string): Promise<unknown> {
  // Browsers never let a page opened from disk (file://) read other files, so don't try.
  if (typeof location !== "undefined" && location.protocol === "file:") return Promise.resolve(null);
  if (!memo.has(path)) {
    memo.set(path, fetch(`${BASE}soil/${path}`, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null));
  }
  return memo.get(path)!;
}

export async function loadSoilState(state: string): Promise<SoilStateFile | null> {
  // index.json lists the states that have data, so states without a file are never requested.
  const index = (await getJson("index.json")) as { states?: Array<{ file?: unknown }> } | null;
  const file = `${stateSlug(state)}.json`;
  if (!Array.isArray(index?.states) || !index.states.some((s) => s.file === file)) return null;
  const j = await getJson(file);
  return isSoilStateFile(j) ? j : null;
}

export async function loadSoilDistrict(file: string): Promise<SoilDistrictFile | null> {
  const j = await getJson(file);
  return isSoilDistrictFile(j) ? j : null;
}

/** The state file's entry for the farmer's district (matched by the app's name first, then by spelling). */
export function findSoilDistrict(file: SoilStateFile, district: string): SoilStateFile["districts"][number] | null {
  const exact = file.districts.find((d) => d.app === district);
  if (exact) return exact;
  const want = normDistrict(district.replace(/\(.*\)/, ""));
  const alt = /\((.*)\)/.exec(district)?.[1];
  return file.districts.find((d) => {
    const n = normDistrict(d.name);
    return n === want || (alt !== undefined && n === normDistrict(alt));
  }) ?? null;
}
