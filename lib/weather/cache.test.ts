import { test } from "node:test";
import assert from "node:assert/strict";
import { isCachedWeather } from "./cache.ts";
import { parseForecast } from "./openMeteo.ts";
import { makeForecastJson } from "../../test/fixtures/openMeteo.ts";

const payload = {
  report: parseForecast(makeForecastJson()),
  fetchedAt: "2026-10-26T08:00:00.000Z",
  stale: false,
  source: { name: "Open-Meteo", url: "https://open-meteo.com/", attribution: "x" },
};

test("device copy must match the current coordinates and shape", () => {
  // `base` stays un-narrowed by the type-guard assertions below, so it can be spread.
  const base = { lat: 30.317, lon: 78.032, savedAt: "2026-10-26T08:00:00.000Z", payload };
  const c = base;
  assert.ok(isCachedWeather(c, 30.317, 78.032));
  assert.ok(!isCachedWeather(c, 28.6, 77.2), "copy for another place must not be shown");
  assert.ok(!isCachedWeather({ ...base, payload: { ...payload, report: {} } }, 30.317, 78.032));
  assert.ok(!isCachedWeather(null, 30.317, 78.032));
});
