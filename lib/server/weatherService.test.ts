import { test } from "node:test";
import assert from "node:assert/strict";
import { createWeatherService } from "./weatherService.ts";
import { getWeatherConfig } from "./config.ts";
import { makeForecastJson } from "../../test/fixtures/openMeteo.ts";
import { hangingFetch } from "../../test/fixtures/hangingFetch.ts";

const config = { ...getWeatherConfig({}), timeoutMs: 50 };

function fakeFetch(responses: Array<() => Promise<Response>>) {
  const calls: string[] = [];
  const impl: typeof fetch = async (url) => {
    calls.push(String(url));
    const next = responses.shift();
    if (!next) throw new Error("unexpected call");
    return next();
  };
  return { impl, calls };
}
const json = (b: unknown, status = 200) => async () => new Response(JSON.stringify(b), { status });

test("success is cached; coordinates are rounded before leaving the server", async () => {
  let clock = 0;
  const f = fakeFetch([json(makeForecastJson())]);
  const svc = createWeatherService({ config, fetchImpl: f.impl, now: () => clock });
  const a = await svc.get(30.31649, 78.03219);
  assert.ok(a.ok);
  assert.equal(a.data.stale, false);
  assert.equal(new URL(f.calls[0]!).searchParams.get("latitude"), "30.32");
  clock = 60_000;
  const b = await svc.get(30.3161, 78.0319); // same rounded cell → cache hit, no new call
  assert.ok(b.ok);
  assert.equal(f.calls.length, 1);
});

test("provider failure with no cache → honest error", async () => {
  const f = fakeFetch([json({ error: true }, 500)]);
  const r = await createWeatherService({ config, fetchImpl: f.impl }).get(30, 78);
  assert.deepEqual(r.ok ? null : r.error.code, "UPSTREAM_ERROR");
});

test("provider failure with old cache → returns it marked stale", async () => {
  let clock = 0;
  const f = fakeFetch([json(makeForecastJson()), json({}, 503)]);
  const svc = createWeatherService({ config, fetchImpl: f.impl, now: () => clock });
  await svc.get(30, 78);
  clock = 2 * 3600e3; // past 30-min TTL
  const r = await svc.get(30, 78);
  assert.ok(r.ok);
  assert.equal(r.data.stale, true);
  assert.equal(r.data.fetchedAt, new Date(0).toISOString());
});

test("malformed provider data → INVALID_UPSTREAM_DATA, never fake numbers", async () => {
  const f = fakeFetch([json({ current: { time: "x" } })]);
  const r = await createWeatherService({ config, fetchImpl: f.impl }).get(30, 78);
  assert.equal(r.ok ? null : r.error.code, "INVALID_UPSTREAM_DATA");
});

test("timeout → UPSTREAM_TIMEOUT", async () => {
  const r = await createWeatherService({ config, fetchImpl: hangingFetch }).get(30, 78);
  assert.equal(r.ok ? null : r.error.code, "UPSTREAM_TIMEOUT");
});

test("provider 429 → RATE_LIMITED with retry hint", async () => {
  const f = fakeFetch([json({}, 429)]);
  const r = await createWeatherService({ config, fetchImpl: f.impl }).get(30, 78);
  assert.equal(r.ok ? null : r.error.code, "RATE_LIMITED");
  assert.equal(r.ok ? null : r.error.retryAfterSec, 60);
});

test("force refresh skips a fresh cache but still falls back on failure", async () => {
  const f = fakeFetch([json(makeForecastJson()), json(makeForecastJson()), json({}, 503)]);
  const svc = createWeatherService({ config, fetchImpl: f.impl });
  await svc.get(30, 78);
  await svc.get(30, 78, { force: true });
  assert.equal(f.calls.length, 2, "forced call hit the provider");
  const r = await svc.get(30, 78, { force: true });
  assert.ok(r.ok && r.data.stale, "forced call that fails returns the last copy marked stale");
});
