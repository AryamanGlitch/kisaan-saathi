import { test } from "node:test";
import assert from "node:assert/strict";
import { buildForecastUrl, parseForecast, WeatherDataError } from "./openMeteo.ts";
import { makeForecastJson } from "../../test/fixtures/openMeteo.ts";

test("buildForecastUrl includes variables, IST timezone and explicit units", () => {
  const u = new URL(buildForecastUrl(30.32, 78.03));
  assert.equal(u.searchParams.get("timezone"), "Asia/Kolkata");
  assert.match(u.searchParams.get("daily") ?? "", /precipitation_probability_max/);
  assert.equal(u.searchParams.get("wind_speed_unit"), "kmh");
  assert.equal(u.searchParams.get("apikey"), null);
  assert.equal(new URL(buildForecastUrl(1, 1, { apiKey: "k" })).searchParams.get("apikey"), "k");
});

test("parseForecast reads a valid response", () => {
  const r = parseForecast(makeForecastJson());
  assert.equal(r.current.temperatureC, 27.4);
  assert.equal(r.current.isDay, true);
  assert.equal(r.daily.length, 7);
  assert.equal(r.daily[3]?.precipMm, 2.1);
});

test("missing probability column becomes null, not an invented number", () => {
  const r = parseForecast(makeForecastJson({ omitProb: true }));
  assert.ok(r.daily.every((d) => d.precipProbPct === null));
});

test("null values stay null", () => {
  const r = parseForecast(makeForecastJson({ max: [null, 30, 31, 28, 29, 30, 30] }));
  assert.equal(r.daily[0]?.maxC, null);
});

test("malformed responses throw WeatherDataError", () => {
  const cases: unknown[] = [
    null,
    "text",
    { error: true, reason: "Latitude must be in range" },
    { ...makeForecastJson(), current: undefined },
    { ...makeForecastJson(), daily: { ...makeForecastJson().daily, temperature_2m_max: [1, 2] } },
    { ...makeForecastJson(), daily: { ...makeForecastJson().daily, time: ["26/10/2026"] } },
    { ...makeForecastJson(), current: { ...makeForecastJson().current, temperature_2m: "hot" } },
  ];
  for (const c of cases) assert.throws(() => parseForecast(c), WeatherDataError);
});
