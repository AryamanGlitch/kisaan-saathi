/**
 * Turns a large district-wise crop statistics file (e.g. the Directorate of Economics & Statistics
 * "Area, Production and Yield" data: State, District, Year, Season, Crop, Area, Production) into
 * small per-state files the website loads on demand. Pure functions; the CLI is scripts/build-crop-data.ts.
 */
import { CROPS, type CropId } from "./catalog.ts";

export interface ApyColumns {
  state: number;
  district: number;
  crop: number;
  year: number | null;
  season: number | null;
  area: number | null;
}

/** Splits one CSV line (handles quotes). Lines with embedded newlines are not expected in these files. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}

export function detectApyColumns(header: string[]): ApyColumns | null {
  const h = header.map((x) => x.toLowerCase().replace(/^\uFEFF/, "").replace(/[\s-]+/g, "_"));
  const find = (re: RegExp, not?: RegExp) => {
    const i = h.findIndex((x) => re.test(x) && !(not && not.test(x)));
    return i >= 0 ? i : null;
  };
  const state = find(/state/, /code|id$/);
  const district = find(/district/, /code|id$/);
  const crop = find(/^crop$|crop_name|^crop_?(?!year)|commodity/, /year|code|id$|season/);
  if (state === null || district === null || crop === null) return null;
  return { state, district, crop, year: find(/year/), season: find(/season/), area: find(/^area|area_?\(?ha|area_hectare/, /unit/) };
}

export interface CropStat {
  crop: string;
  cropId: CropId | null;
  latestYear: string | null;
  areaHa: number | null; // total area in the latest year (all seasons)
  seasons: string[];
}

/** First year of "2019-20" / "2019" for ordering. */
function yearKey(y: string): number {
  const m = /(\d{4})/.exec(y);
  return m ? Number(m[1]) : -1;
}

const ALIASES: Record<string, CropId> = {
  rice: "rice", paddy: "rice", wheat: "wheat", maize: "maize", barley: "barley", sugarcane: "sugarcane",
  ragi: "finger-millet", fingermillet: "finger-millet", mandua: "finger-millet", smallmillets: "barnyard-millet",
  rapeseedmustard: "mustard", rapeseedandmustard: "mustard", mustard: "mustard", potato: "potato", peas: "pea", pea: "pea",
  peasbeanspulses: "pea", tomato: "tomato", mango: "mango", masoor: "lentil", lentil: "lentil", horsegram: "horsegram",
  soyabean: "soybean", soybean: "soybean", groundnut: "groundnut", onion: "onion", apple: "apple", citrusfruit: "citrus", litchi: "litchi",
  arhartur: "arhar", tur: "arhar", moonggreengram: "moong", greengram: "moong", blackgram: "urad", cowpealobia: "cowpea",
  castorseed: "castor", nigerseed: "niger", sesamum: "sesame", til: "sesame", cottonlint: "cotton", sannhamp: "sunnhemp",
  drychillies: "chilli", chillies: "chilli", cashewnut: "cashew", guarseed: "guar",
};

export function toCropId(name: string): CropId | null {
  const k = name.toLowerCase().replace(/[^a-z]/g, "");
  if (k in ALIASES) return ALIASES[k]!;
  return (Object.keys(CROPS) as CropId[]).find((id) => id.replace(/-/g, "") === k) ?? null;
}

type Acc = Map<string, Map<string, Map<string, { years: Map<string, number>; seasons: Set<string> }>>>;

export function createAggregator() {
  const acc: Acc = new Map();
  let rows = 0;
  let skipped = 0;
  return {
    add(cols: ApyColumns, f: string[]) {
      const state = f[cols.state]?.trim();
      const district = f[cols.district]?.trim();
      const crop = f[cols.crop]?.trim();
      if (!state || !district || !crop) { skipped++; return; }
      rows++;
      const year = cols.year !== null ? f[cols.year]?.trim() || "unknown" : "unknown";
      const area = cols.area !== null ? Number(f[cols.area]) : NaN;
      const d = acc.get(state) ?? new Map();
      acc.set(state, d);
      const c = d.get(district) ?? new Map();
      d.set(district, c);
      const e = c.get(crop) ?? { years: new Map<string, number>(), seasons: new Set<string>() };
      c.set(crop, e);
      e.years.set(year, (e.years.get(year) ?? 0) + (Number.isFinite(area) ? area : 0));
      const season = cols.season !== null ? f[cols.season]?.trim() : "";
      if (season) e.seasons.add(season);
    },
    stats: () => ({ rows, skipped }),
    /** state → district → crops (largest latest-year area first) */
    result(): Map<string, Record<string, CropStat[]>> {
      const out = new Map<string, Record<string, CropStat[]>>();
      for (const [state, districts] of acc) {
        const rec: Record<string, CropStat[]> = {};
        for (const [district, crops] of districts) {
          rec[district] = [...crops].map(([crop, e]) => {
            const latest = [...e.years.keys()].sort((a, b) => yearKey(b) - yearKey(a))[0] ?? null;
            const area = latest !== null ? e.years.get(latest) ?? 0 : 0;
            return { crop, cropId: toCropId(crop), latestYear: latest === "unknown" ? null : latest, areaHa: area > 0 ? Math.round(area) : null, seasons: [...e.seasons].sort() };
          }).sort((a, b) => (b.areaHa ?? -1) - (a.areaHa ?? -1) || a.crop.localeCompare(b.crop));
        }
        out.set(state, rec);
      }
      return out;
    },
  };
}

export function stateSlug(state: string): string {
  return state.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export interface StateCropFile {
  version: 1;
  state: string;
  source: string;
  generatedAt: string;
  districts: Record<string, CropStat[]>;
}

export function isStateCropFile(x: unknown): x is StateCropFile {
  if (typeof x !== "object" || x === null) return false;
  const r = x as Record<string, unknown>;
  return r.version === 1 && typeof r.state === "string" && typeof r.source === "string" && typeof r.districts === "object" && r.districts !== null;
}
