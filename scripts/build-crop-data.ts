// Converts a large district-wise crop statistics CSV into small per-state JSON files for the website.
// Streams the file, so a 1+ GB input works on an ordinary laptop.
//
// Usage:
//   node --experimental-strip-types scripts/build-crop-data.ts <input.csv> --source "DES APY data, data.desagri.gov.in, downloaded 2026-10" [--out data/crops]
// Then upload the output folder next to index.html (GitHub Pages) or into public/data/crops (server version).
import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { createAggregator, detectApyColumns, splitCsvLine, stateSlug, type ApyColumns, type StateCropFile } from "../lib/crops/dataset.ts";

const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith("--"));
const flag = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const source = flag("source");
const out = flag("out") ?? "data/crops";
if (!input || !source) {
  console.error('Usage: node --experimental-strip-types scripts/build-crop-data.ts <input.csv> --source "<dataset name, website, download date>" [--out data/crops]');
  process.exit(1);
}

const rl = createInterface({ input: createReadStream(input, { encoding: "utf8" }), crlfDelay: Infinity });
const agg = createAggregator();
let cols: ApyColumns | null = null;
let n = 0;
for await (const line of rl) {
  if (!line.trim()) continue;
  const f = splitCsvLine(line);
  if (!cols) {
    cols = detectApyColumns(f);
    if (!cols) {
      console.error("Could not find State, District and Crop columns in the header:", f.join(" | "));
      process.exit(2);
    }
    continue;
  }
  agg.add(cols, f);
  if (++n % 1_000_000 === 0) console.log(`${(n / 1e6).toFixed(0)} million rows read…`);
}

mkdirSync(out, { recursive: true });
const index: Array<{ state: string; file: string; districts: number }> = [];
const generatedAt = new Date().toISOString();
for (const [state, districts] of agg.result()) {
  const file = `${stateSlug(state)}.json`;
  const body: StateCropFile = { version: 1, state, source, generatedAt, districts };
  writeFileSync(join(out, file), JSON.stringify(body));
  index.push({ state, file, districts: Object.keys(districts).length });
}
writeFileSync(join(out, "index.json"), JSON.stringify({ version: 1, source, generatedAt, states: index }, null, 1));
console.log(`Done: ${agg.stats().rows} rows, ${agg.stats().skipped} skipped, ${index.length} state files in ${out}/`);
