import { PARAM_BY_ID, SOIL_PARAMS, type Rating, type SoilParam } from "./shc.ts";

/**
 * Reads village-wise Soil Health Card test data (CSV) that the user downloads, e.g. from the
 * Soil Health Card portal reports or compilations of it, and summarises tests near the farm.
 * Column names differ between sources, so they are matched by keywords.
 */

export function parseCsv(text: string, maxRows = 200_000): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const t = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (quoted) {
      if (c === '"') {
        if (t[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
      if (rows.length > maxRows) break;
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); if (row.some((x) => x.trim() !== "")) rows.push(row); }
  return rows;
}

const PARAM_PATTERNS: Array<[SoilParam, RegExp]> = [
  ["ph", /^ph\b|^ph$|\bph\b/],
  ["ec", /electrical|^ec\b|^ec$/],
  ["oc", /organic.?carbon|^oc\b|^oc$/],
  ["n", /nitrogen|^n\b(?!ame)|^n$/],
  ["p", /phosph|^p\b|^p$/],
  ["k", /potass|^k\b|^k$/],
  ["s", /sulph|sulfur|^s\b|^s$/],
  ["zn", /zinc|^zn\b|^zn$/],
  ["fe", /iron|^fe\b|^fe$/],
  ["cu", /copper|^cu\b|^cu$/],
  ["mn", /mangan|^mn\b|^mn$/],
  ["b", /boron|^b\b|^b$/],
];

export interface ColumnMap {
  lat: number | null;
  lon: number | null;
  village: number | null;
  district: number | null;
  year: number | null;
  params: Partial<Record<SoilParam, number>>;
}

export function detectColumns(header: string[]): ColumnMap {
  const h = header.map((x) => x.trim().toLowerCase().replace(/[\s-]+/g, "_"));
  const find = (re: RegExp, not?: RegExp) => {
    const i = h.findIndex((x) => re.test(x) && !(not && not.test(x)));
    return i >= 0 ? i : null;
  };
  const params: ColumnMap["params"] = {};
  for (const [id, re] of PARAM_PATTERNS) {
    const i = h.findIndex((x, idx) => re.test(x.replace(/_/g, " ")) && !Object.values(params).includes(idx) && !/id$|code|name|village|district|state|year/.test(x));
    if (i >= 0) params[id] = i;
  }
  return {
    lat: find(/^lat(itude)?$|^lat_/),
    lon: find(/^(lon|lng|long|longitude)$|^lon_|^lng_/),
    village: find(/village/, /code|id$/),
    district: find(/district/, /code|lgd_code|id$/),
    year: find(/year/),
    params,
  };
}

function km(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const dLat = r(bLat - aLat);
  const dLon = r(bLon - aLon);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(x));
}

export function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2;
}

export interface AreaSummary {
  version: 1;
  fileName: string;
  loadedAt: string;
  match: { kind: "radius"; km: number } | { kind: "village"; name: string } | { kind: "district"; name: string };
  samples: number;
  years: string[];
  params: Array<{ id: SoilParam; median: number; n: number; rating: Rating; lowShare: number }>;
}

export type AreaResult = { ok: true; summary: AreaSummary } | { ok: false; reason: "no-header" | "no-soil-columns" | "no-nearby" };

const RADII = [5, 10, 25];
const MIN_SAMPLES = 5;

export function summariseArea(
  text: string,
  fileName: string,
  farm: { lat: number | null; lon: number | null; place: string | null; district: string },
  now: Date = new Date(),
): AreaResult {
  const rows = parseCsv(text);
  const header = rows[0];
  if (!header || rows.length < 2) return { ok: false, reason: "no-header" };
  const cols = detectColumns(header);
  if (Object.keys(cols.params).length === 0) return { ok: false, reason: "no-soil-columns" };
  const data = rows.slice(1);
  const num = (r: string[], i: number | null) => (i === null ? NaN : Number((r[i] ?? "").trim()));
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z\u0900-\u097f]/g, "");

  let chosen: string[][] = [];
  let match: AreaSummary["match"] | null = null;
  if (farm.lat !== null && farm.lon !== null && cols.lat !== null && cols.lon !== null) {
    for (const r of RADII) {
      const near = data.filter((row) => {
        const la = num(row, cols.lat), lo = num(row, cols.lon);
        return Number.isFinite(la) && Number.isFinite(lo) && km(farm.lat!, farm.lon!, la, lo) <= r;
      });
      if (near.length >= MIN_SAMPLES || (r === RADII[RADII.length - 1] && near.length > 0)) {
        chosen = near;
        match = { kind: "radius", km: r };
        break;
      }
    }
  }
  if (!match && farm.place && cols.village !== null) {
    const v = norm(farm.place);
    const rowsV = data.filter((row) => norm(row[cols.village!] ?? "") === v);
    if (rowsV.length) { chosen = rowsV; match = { kind: "village", name: farm.place }; }
  }
  if (!match && cols.district !== null) {
    const d = norm(farm.district);
    const rowsD = data.filter((row) => norm(row[cols.district!] ?? "") === d);
    if (rowsD.length) { chosen = rowsD; match = { kind: "district", name: farm.district }; }
  }
  if (!match || chosen.length === 0) return { ok: false, reason: "no-nearby" };

  const params: AreaSummary["params"] = [];
  for (const d of SOIL_PARAMS) {
    const i = cols.params[d.id];
    if (i === undefined) continue;
    const vals = chosen.map((r) => num(r, i)).filter((v) => Number.isFinite(v) && v >= d.min && v <= d.max);
    const m = median(vals);
    if (m === null) continue;
    const concern = vals.filter((v) => ["low", "deficient", "acidic", "saline"].includes(PARAM_BY_ID[d.id].rate(v))).length;
    params.push({ id: d.id, median: Math.round(m * 100) / 100, n: vals.length, rating: d.rate(m), lowShare: Math.round((concern / vals.length) * 100) });
  }
  const years = cols.year === null ? [] : [...new Set(chosen.map((r) => (r[cols.year!] ?? "").trim()).filter(Boolean))].sort();
  return {
    ok: true,
    summary: { version: 1, fileName: fileName.slice(0, 120), loadedAt: now.toISOString(), match, samples: chosen.length, years: years.slice(-5), params },
  };
}

export function isAreaSummary(x: unknown): x is AreaSummary {
  if (typeof x !== "object" || x === null) return false;
  const r = x as Record<string, unknown>;
  return r.version === 1 && typeof r.fileName === "string" && typeof r.samples === "number" && Array.isArray(r.params) && typeof r.match === "object";
}
