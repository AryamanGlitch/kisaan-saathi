// Converts the village-wise Soil Health Card nutrient status CSV (over 1 GB, too big for GitHub)
// into small JSON files the website loads on demand: one per state and one per district.
// Streams the file, so it works on an ordinary laptop.
//
// Usage:
//   node --experimental-strip-types scripts/build-soil-data.ts <soil-dataset.csv> --source "<dataset, website, download date>" [--out public/data/soil]
import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { splitCsvLine, stateSlug } from "../lib/crops/dataset.ts";
import { findState } from "../lib/location/states.ts";
import { matchDistrict } from "../lib/location/districtMatch.ts";
import {
  detectNutrientColumns, emptyCounts, sampleCount, slotOf, sumCounts,
  type NutrientColumns, type SoilDistrictFile, type SoilStateFile,
} from "../lib/soil/nutrientStatus.ts";

const args = process.argv.slice(2);
const input = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
const flag = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const source = flag("source");
const out = flag("out") ?? "public/data/soil";
if (!input || !source) {
  console.error('Usage: node --experimental-strip-types scripts/build-soil-data.ts <soil-dataset.csv> --source "<dataset, website, download date>" [--out public/data/soil]');
  process.exit(1);
}

interface Village { name: string; block: string; counts: number[] }
interface District { name: string; years: Set<string>; villages: Map<string, Village> }
const states = new Map<string, { years: Set<string>; districts: Map<string, District> }>();

const rl = createInterface({ input: createReadStream(input, { encoding: "utf8" }), crlfDelay: Infinity });
let cols: NutrientColumns | null = null;
let n = 0;
let skipped = 0;
const unknown = new Set<string>();
for await (const line of rl) {
  if (!line.trim()) continue;
  const f = splitCsvLine(line);
  if (!cols) {
    cols = detectNutrientColumns(f);
    if (!cols) {
      console.error("Could not find year, state, district, block, village, nutrient, level and value columns in:", f.join(" | "));
      process.exit(2);
    }
    continue;
  }
  if (++n % 1_000_000 === 0) console.log(`${n / 1e6} million rows read…`);
  const value = Number(f[cols.value]);
  const slot = slotOf(f[cols.nutrient] ?? "", f[cols.level] ?? "");
  const stateRaw = f[cols.state], district = f[cols.district], village = f[cols.village];
  if (slot === null) { unknown.add(`${f[cols.nutrient]} / ${f[cols.level]}`); skipped++; continue; }
  if (!stateRaw || !district || !village || !Number.isFinite(value) || value < 0) { skipped++; continue; }
  const state = findState(stateRaw)?.en ?? stateRaw;
  const year = f[cols.year] ?? "";
  const s = states.get(state) ?? { years: new Set<string>(), districts: new Map<string, District>() };
  states.set(state, s);
  const dKey = cols.districtCode !== null ? f[cols.districtCode]! : district;
  const d = s.districts.get(dKey) ?? { name: district, years: new Set<string>(), villages: new Map<string, Village>() };
  s.districts.set(dKey, d);
  const block = f[cols.block] ?? "";
  const vKey = cols.villageCode !== null ? f[cols.villageCode]! : `${block}|${village}`;
  const v = d.villages.get(vKey) ?? { name: village, block, counts: emptyCounts() };
  d.villages.set(vKey, v);
  v.counts[slot]! += value;
  if (year) { s.years.add(year); d.years.add(year); }
}

mkdirSync(out, { recursive: true });
const index: Array<{ state: string; file: string; districts: number; samples: number }> = [];
const generatedAt = new Date().toISOString();
let unmatched = 0;
for (const [state, s] of [...states].sort((a, b) => a[0].localeCompare(b[0]))) {
  const slug = stateSlug(state);
  mkdirSync(join(out, slug), { recursive: true });
  const used = new Set<string>();
  const districts: SoilStateFile["districts"] = [];
  for (const [code, d] of [...s.districts].sort((a, b) => a[1].name.localeCompare(b[1].name))) {
    let dSlug = stateSlug(d.name);
    if (used.has(dSlug)) dSlug = `${dSlug}-${stateSlug(code)}`;
    used.add(dSlug);
    const villages = [...d.villages.values()].sort((a, b) => a.block.localeCompare(b.block) || a.name.localeCompare(b.name));
    const blocks = [...new Set(villages.map((v) => v.block))];
    const body: SoilDistrictFile = {
      version: 1, state, district: d.name, years: [...d.years].sort(), blocks,
      villages: villages.map((v) => [blocks.indexOf(v.block), v.name, v.counts]),
    };
    writeFileSync(join(out, slug, `${dSlug}.json`), JSON.stringify(body));
    const counts = sumCounts(villages.map((v) => v.counts));
    const app = matchDistrict(state, [d.name]);
    if (!app) unmatched++;
    districts.push({ name: d.name, app, file: `${slug}/${dSlug}.json`, samples: sampleCount(counts), villages: villages.length, counts });
  }
  const body: SoilStateFile = { version: 1, state, source, generatedAt, years: [...s.years].sort(), districts };
  writeFileSync(join(out, `${slug}.json`), JSON.stringify(body));
  index.push({ state, file: `${slug}.json`, districts: districts.length, samples: districts.reduce((a, d) => a + d.samples, 0) });
}
writeFileSync(join(out, "index.json"), JSON.stringify({ version: 1, source, generatedAt, states: index }, null, 1));
console.log(`Done: ${n} rows, ${skipped} skipped, ${index.length} states, ${index.reduce((a, s) => a + s.districts, 0)} districts in ${out}/`);
if (unmatched) console.log(`${unmatched} districts did not match the app's district list (they are still matched by name at run time).`);
if (unknown.size) console.log("Unknown nutrient/level pairs (skipped):", [...unknown].slice(0, 20).join("; "));
