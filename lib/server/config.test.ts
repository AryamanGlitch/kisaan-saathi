import { test } from "node:test";
import assert from "node:assert/strict";
import { getGeocodeConfig, getWeatherConfig } from "./config.ts";

test("geocoding is off when the user agent is missing or still the placeholder", () => {
  assert.equal(getGeocodeConfig({}), null);
  assert.equal(getGeocodeConfig({ NOMINATIM_USER_AGENT: "  " }), null);
  assert.equal(getGeocodeConfig({ NOMINATIM_USER_AGENT: "KisaanSaathi/0.1 (contact: replace-with-your-email@example.com)" }), null);
  const c = getGeocodeConfig({ NOMINATIM_USER_AGENT: "KisaanSaathi/0.1 (contact: team@college.edu)" });
  assert.ok(c);
  assert.equal(c.baseUrl, "https://nominatim.openstreetmap.org/");
});

test("non-https base URLs are rejected in favour of the default", () => {
  assert.equal(getWeatherConfig({ OPEN_METEO_BASE_URL: "http://evil.example" }).baseUrl, "https://api.open-meteo.com/v1/forecast");
  assert.equal(getWeatherConfig({}).apiKey, null);
  assert.equal(getWeatherConfig({ OPEN_METEO_API_KEY: " k " }).apiKey, "k");
});

import { getCronSecret, getDatabaseUrl, getGeminiConfig, safeEqual } from "./config.ts";

test("Gemini config: off without key, default model, rejects odd model ids", () => {
  assert.equal(getGeminiConfig({}), null);
  assert.equal(getGeminiConfig({ GEMINI_API_KEY: "k" })?.model, "gemini-3.5-flash");
  assert.deepEqual(getGeminiConfig({ GEMINI_API_KEY: "k" })?.fallbackModels, ["gemini-3.8-flash", "gemini-3.6-flash"]);
  assert.equal(getGeminiConfig({ GEMINI_API_KEY: "k", GEMINI_MODEL: "gemini-3.7-flash" })?.model, "gemini-3.7-flash");
  assert.equal(getGeminiConfig({ GEMINI_API_KEY: "k", GEMINI_MODEL: "../../evil" }), null);
});

test("cron secret, database URL, constant-time compare", () => {
  assert.equal(getCronSecret({ CRON_SECRET: "short" }), null);
  assert.equal(getCronSecret({ CRON_SECRET: "a-long-enough-secret" }), "a-long-enough-secret");
  assert.equal(getDatabaseUrl({ DATABASE_URL: "mysql://x" }), null);
  assert.ok(getDatabaseUrl({ DATABASE_URL: "postgres://u:p@h/db" }));
  assert.ok(safeEqual("abc", "abc"));
  assert.ok(!safeEqual("abc", "abd"));
  assert.ok(!safeEqual("abc", "abcd"));
});
