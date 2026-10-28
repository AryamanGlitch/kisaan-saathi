import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveAdvisories } from "./advisories.ts";
import { parseForecast } from "./openMeteo.ts";
import { makeForecastJson } from "../../test/fixtures/openMeteo.ts";

const kinds = (j: ReturnType<typeof makeForecastJson>) => deriveAdvisories(parseForecast(j)).map((a) => a.kind);

test("calm forecast gives no advisories", () => {
  assert.deepEqual(kinds(makeForecastJson()), []);
});

test("rain likely tomorrow → spray-rain with probability", () => {
  const a = deriveAdvisories(parseForecast(makeForecastJson({ pprob: [10, 80, 0, 0, 0, 0, 0] })));
  assert.deepEqual(a, [{ kind: "spray-rain", date: "2026-10-27", value: 80, unit: "pct" }]);
});

test("rain on day 3 is outside the spraying window", () => {
  assert.deepEqual(kinds(makeForecastJson({ pprob: [0, 0, 90, 0, 0, 0, 0] })), []);
});

test("without probability, falls back to rain amount", () => {
  const a = deriveAdvisories(parseForecast(makeForecastJson({ omitProb: true, psum: [6, 0, 0, 0, 0, 0, 0] })));
  assert.deepEqual(a, [{ kind: "spray-rain", date: "2026-10-26", value: 6, unit: "mm" }]);
});

test("heavy rain uses the 64.5 mm boundary and ranks first", () => {
  assert.deepEqual(kinds(makeForecastJson({ psum: [0, 0, 64.4, 0, 0, 0, 0] })), []);
  assert.deepEqual(kinds(makeForecastJson({ psum: [0, 70, 0, 0, 0, 0, 0], pprob: [0, 90, 0, 0, 0, 0, 0] })), ["heavy-rain", "spray-rain"]);
});

test("heat, cold and wind", () => {
  assert.deepEqual(kinds(makeForecastJson({ max: [41, 30, 30, 30, 30, 30, 30] })), ["heat"]);
  assert.deepEqual(kinds(makeForecastJson({ min: [15, 3, 15, 15, 15, 15, 15] })), ["cold"]);
  assert.deepEqual(kinds(makeForecastJson({ wind: [20, 0, 0, 0, 0, 0, 0] })), ["spray-wind"]);
});

test("one advisory per kind, earliest day", () => {
  const a = deriveAdvisories(parseForecast(makeForecastJson({ max: [30, 42, 44, 30, 30, 30, 30] })));
  assert.equal(a.length, 1);
  assert.equal(a[0]?.date, "2026-10-27");
});

test("null data never triggers advisories", () => {
  const n = [null, null, null, null, null, null, null];
  assert.deepEqual(kinds(makeForecastJson({ max: n, min: n, psum: n, pprob: n, wind: n })), []);
});
