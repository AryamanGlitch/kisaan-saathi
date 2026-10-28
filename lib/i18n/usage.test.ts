import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { en, type StringKey } from "./strings.ts";
import { API_ERROR_CODES } from "../api/result.ts";
import { weatherCodeKey } from "../weather/codes.ts";
import { GROWTH_STAGES, PLANT_PARTS } from "../cropcare/data.ts";

const ROOT = new URL("../../", import.meta.url).pathname;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(name) && !name.endsWith(".test.ts") ? [p] : [];
  });
}

const has = (k: string) => Object.prototype.hasOwnProperty.call(en, k);

test("every literal translation key in the UI exists", () => {
  // Any string literal that starts with a known key prefix ("grow.", "care.", ...) must be a real key.
  const prefixes = [...new Set(Object.keys(en).map((k) => k.split(".")[0]))].join("|");
  const re = new RegExp(`["'\`]((?:${prefixes})\\.[a-zA-Z0-9_.-]+)["'\`]`, "g");
  const src = [...files(join(ROOT, "app")), ...files(join(ROOT, "components"))];
  const used = new Set<string>();
  for (const f of src) for (const m of readFileSync(f, "utf8").matchAll(re)) if (m[1] && !m[1].includes("${")) used.add(m[1]);
  assert.ok(used.size > 150, `expected many keys, found ${used.size}`);
  assert.deepEqual([...used].filter((k) => !has(k)), []);
});

test("dynamic keys exist", () => {
  for (const c of [...API_ERROR_CODES, "NETWORK", "SERVER"]) assert.ok(has(`err.${c}`), `err.${c}`);
  for (const k of ["heavy-rain", "heat", "cold", "spray-wind", "spray-rain.pct", "spray-rain.mm"]) assert.ok(has(`adv.${k}`), k);
  for (let code = -1; code <= 100; code++) assert.ok(has(weatherCodeKey(code) as StringKey));
  for (const s of GROWTH_STAGES) assert.ok(has(`stage.${s}`));
  for (const p of PLANT_PARTS) assert.ok(has(`part.${p}`));
  for (const k of ["current", "check-overdue", "source-changed", "needs-verification", "not-monitored"]) assert.ok(has(`fresh.${k}`));
  for (const k of ["low", "medium", "high"]) assert.ok(has(`ask.confidence.${k}`));
  for (const k of ["irrigated", "rainfed"]) assert.ok(has(`regime.${k}`));
  for (const k of ["kharif", "rabi", "annual"]) assert.ok(has(`season.${k}`));
  for (const w of [1, 2, 3, 4]) assert.ok(has(`week.${w}`));
  for (const k of ["irrigated", "rainfed", "unknown"]) assert.ok(has(`farm.water.${k}`));
});
