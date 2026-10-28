import { test } from "node:test";
import assert from "node:assert/strict";
import { isSoilCard, parseSoilNumber, PARAM_BY_ID, rateAll, SOIL_PARAMS } from "./shc.ts";
import { detectColumns, median, parseCsv, summariseArea } from "./areaData.ts";
import { buildSoilUrl, parseSoil } from "./moisture.ts";

test("12 official parameters with ICAR-IISS limits at the boundaries", () => {
  assert.equal(SOIL_PARAMS.length, 12);
  const r = (id: keyof typeof PARAM_BY_ID, v: number) => PARAM_BY_ID[id].rate(v);
  assert.equal(r("ph", 6.4), "acidic"); assert.equal(r("ph", 6.5), "neutral"); assert.equal(r("ph", 7.0), "neutral"); assert.equal(r("ph", 7.1), "alkaline");
  assert.equal(r("ec", 4.0), "normal"); assert.equal(r("ec", 4.1), "saline");
  assert.equal(r("oc", 0.49), "low"); assert.equal(r("oc", 0.5), "medium"); assert.equal(r("oc", 0.75), "medium"); assert.equal(r("oc", 0.76), "high");
  assert.equal(r("n", 279), "low"); assert.equal(r("n", 560), "medium"); assert.equal(r("n", 561), "high");
  assert.equal(r("p", 9.9), "low"); assert.equal(r("p", 25), "medium"); assert.equal(r("p", 26), "high");
  assert.equal(r("k", 119), "low"); assert.equal(r("k", 120), "medium"); assert.equal(r("k", 281), "high");
  assert.equal(r("s", 9.9), "deficient"); assert.equal(r("zn", 0.6), "sufficient"); assert.equal(r("fe", 4.4), "deficient");
  assert.equal(r("cu", 0.19), "deficient"); assert.equal(r("mn", 2.0), "sufficient"); assert.equal(r("b", 0.49), "deficient");
});

test("typed numbers and saved cards are validated", () => {
  assert.equal(parseSoilNumber(" 7,8 "), 7.8);
  assert.equal(parseSoilNumber("abc"), null);
  assert.equal(parseSoilNumber("-1"), null);
  assert.deepEqual(rateAll({ ph: 8.2, n: 200 }).map((x) => x.rating), ["alkaline", "low"]);
  assert.ok(isSoilCard({ version: 1, values: { ph: 7.2 }, testDate: "2025-11-02", savedAt: "2026-10-26T00:00:00Z" }));
  assert.ok(!isSoilCard({ version: 1, values: { ph: 77 }, testDate: null, savedAt: "x" }), "pH out of range");
  assert.ok(!isSoilCard({ version: 1, values: { unknown: 1 }, testDate: null, savedAt: "x" }));
});

test("CSV parsing handles quotes, CRLF and BOM", () => {
  const rows = parseCsv('\uFEFFa,b\r\n"x, y","say ""hi"""\r\n\r\n1,2');
  assert.deepEqual(rows, [["a", "b"], ["x, y", 'say "hi"'], ["1", "2"]]);
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
});

test("column detection for the SHC village-wise layout and short headers", () => {
  const c = detectColumns(["fiscal_year", "state", "district_as_per_source", "district_lgd_code", "village", "point_id", "longitude", "latitude",
    "nitrogen_kg_per_hectare", "phosphorous_kg_per_hectare", "potassium_kg_per_hectare", "sulphur_ppm", "organic_carbon_percentage", "ph",
    "electrical_conductivity_ds_per_metre", "boron_ppm", "iron_ppm", "zinc_ppm", "copper_ppm", "manganese_ppm"]);
  assert.equal(c.lat, 7); assert.equal(c.lon, 6); assert.equal(c.district, 2); assert.equal(c.village, 4); assert.equal(c.year, 0);
  assert.deepEqual(Object.keys(c.params).sort(), ["b", "cu", "ec", "fe", "k", "mn", "n", "oc", "p", "ph", "s", "zn"]);
  const short = detectColumns(["Village", "District", "pH", "EC", "OC", "N", "P", "K"]);
  assert.deepEqual(Object.keys(short.params).sort(), ["ec", "k", "n", "oc", "p", "ph"]);
});

// Synthetic rows only — test data, not real soil results.
const HEADER = "fiscal_year,district,village,latitude,longitude,ph,nitrogen_kg_per_hectare,organic_carbon_percentage,zinc_ppm";
const near = (i: number) => `2024-25,Dehradun,Rampur,${(30.317 + i * 0.001).toFixed(4)},78.032,${(7.5 + i * 0.1).toFixed(1)},${200 + i * 10},0.4,0.5`;
const far = "2024-25,Haridwar,Far,29.9,78.1,6.0,600,1.0,2.0";

test("area summary uses tests within 5 km first and rates medians", () => {
  const csv = [HEADER, ...[0, 1, 2, 3, 4, 5].map(near), far].join("\n");
  const r = summariseArea(csv, "dehradun.csv", { lat: 30.317, lon: 78.032, place: "Rampur", district: "Dehradun" });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.summary.match, { kind: "radius", km: 5 });
  assert.equal(r.summary.samples, 6);
  const n = r.summary.params.find((p) => p.id === "n");
  assert.equal(n?.median, 225); assert.equal(n?.rating, "low"); assert.equal(n?.lowShare, 100);
  assert.deepEqual(r.summary.years, ["2024-25"]);
});

test("falls back to village, then district name; reports bad files honestly", () => {
  const noCoords = ["district,village,ph", "Dehradun,Rampur,7.2", "Dehradun,Other,6.0"].join("\n");
  const v = summariseArea(noCoords, "f.csv", { lat: null, lon: null, place: "rampur", district: "Dehradun" });
  assert.ok(v.ok && v.summary.match.kind === "village" && v.summary.samples === 1);
  const d = summariseArea(noCoords, "f.csv", { lat: null, lon: null, place: "Nowhere", district: "dehradun" });
  assert.ok(d.ok && d.summary.match.kind === "district" && d.summary.samples === 2);
  assert.deepEqual(summariseArea("only,header", "f.csv", { lat: null, lon: null, place: null, district: "x" }), { ok: false, reason: "no-header" });
  assert.deepEqual(summariseArea("name,age\nA,3", "f.csv", { lat: null, lon: null, place: null, district: "x" }), { ok: false, reason: "no-soil-columns" });
  assert.deepEqual(summariseArea(noCoords, "f.csv", { lat: null, lon: null, place: null, district: "Goa" }), { ok: false, reason: "no-nearby" });
});

test("soil moisture: picks the current IST hour and the 24 h trend", () => {
  const time = Array.from({ length: 48 }, (_, i) => `2026-10-${26 + Math.floor(i / 24)}T${String(i % 24).padStart(2, "0")}:00`);
  const json = { hourly: { time, soil_temperature_6cm: time.map((_, i) => 20 + i * 0.1), soil_moisture_0_to_1cm: time.map(() => 0.2),
    soil_moisture_3_to_9cm: time.map((_, i) => 0.3 - i * 0.001), soil_moisture_9_to_27cm: time.map(() => 0.33) } };
  const s = parseSoil(json, "2026-10-26T14:30");
  assert.equal(s?.time, "2026-10-26T14:00");
  assert.equal(s?.temp6cmC, 21.4);
  assert.equal(s?.trend3to9, -0.024);
  assert.equal(parseSoil({}, "x"), null);
  assert.equal(parseSoil({ hourly: { time } }, "2026-10-26T14:30"), null, "no soil columns → null, never invented");
  assert.match(buildSoilUrl(30, 78), /soil_moisture_3_to_9cm/);
});
