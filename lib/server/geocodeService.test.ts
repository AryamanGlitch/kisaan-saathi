import { test } from "node:test";
import assert from "node:assert/strict";
import { createGeocodeService } from "./geocodeService.ts";
import type { Scheduler } from "./throttle.ts";

const config = { baseUrl: "https://nominatim.openstreetmap.org/", userAgent: "Test/1.0 (contact: t@t.test)", timeoutMs: 50 };
const immediate: Scheduler = (job) => job();
const place = (o: Record<string, unknown>) => ({ lat: "30.3", lon: "78.0", address: { country_code: "in", ...o } });

function fake(bodies: unknown[]) {
  const calls: Array<{ url: string; ua: string | null }> = [];
  const impl: typeof fetch = async (url, init) => {
    calls.push({ url: String(url), ua: new Headers(init?.headers).get("User-Agent") });
    if (bodies.length === 0) throw new Error("unexpected call");
    return new Response(JSON.stringify(bodies.shift()), { status: 200 });
  };
  return { impl, calls };
}

test("not configured: listed districts still work from the centre table; others → NOT_CONFIGURED; no network call", async () => {
  const f = fake([]);
  const svc = createGeocodeService({ config: null, fetchImpl: f.impl, schedule: immediate });
  const r = await svc.search({ state: "Goa", district: "North Goa", place: null });
  assert.ok(r.ok);
  assert.equal(r.data.candidates[0]?.district, "North Goa");
  const v = await svc.search({ state: "Goa", district: "North Goa", place: "Assagao" });
  assert.ok(v.ok && v.data.precision === "district", "village lookup unavailable → district centre");
  const u = await svc.search({ state: "Goa", district: "Nowhere", place: null });
  assert.equal(u.ok ? null : u.error.code, "NOT_CONFIGURED");
  assert.equal(f.calls.length, 0);
});

test("reverse sends identifying User-Agent and parses the place", async () => {
  const f = fake([place({ village: "Rampur", state_district: "Dehradun", state: "Uttarakhand" })]);
  const r = await createGeocodeService({ config, fetchImpl: f.impl, schedule: immediate }).reverse(30.31649, 78.0322);
  assert.ok(r.ok);
  assert.equal(r.data.place, "Rampur");
  assert.equal(f.calls[0]?.ua, config.userAgent);
  assert.equal(new URL(f.calls[0]!.url).searchParams.get("lat"), "30.316");
});

test("reverse outside India → OUTSIDE_INDIA", async () => {
  const f = fake([{ lat: "27.7", lon: "85.3", address: { country_code: "np", state: "Bagmati" } }]);
  const r = await createGeocodeService({ config, fetchImpl: f.impl, schedule: immediate }).reverse(27.7, 85.3);
  assert.equal(r.ok ? null : r.error.code, "OUTSIDE_INDIA");
});

test("search falls back to the district centre when the village is not found", async () => {
  const f = fake([[]]);
  const r = await createGeocodeService({ config, fetchImpl: f.impl, schedule: immediate }).search({
    state: "Uttarakhand",
    district: "Dehradun",
    place: "Tiny Hamlet",
  });
  assert.ok(r.ok);
  assert.equal(r.data.precision, "district");
  assert.equal(r.data.candidates.length, 1);
  assert.equal(r.data.candidates[0]?.label, "Dehradun, Uttarakhand");
  assert.equal(f.calls.length, 1);
});

test("village results: chosen state and nearest the district first, district centre offered last", async () => {
  const f = fake([[
    { lat: "29.9", lon: "78.1", address: { country_code: "in", village: "Rampur", state_district: "Haridwar", state: "Uttarakhand" } },
    { lat: "30.35", lon: "78.0", address: { country_code: "in", village: "Rampur", state_district: "Dehradun", state: "Uttarakhand" } },
    { lat: "28.8", lon: "79.0", address: { country_code: "in", village: "Rampur", state: "Uttar Pradesh" } },
  ]]);
  const r = await createGeocodeService({ config, fetchImpl: f.impl, schedule: immediate }).search({ state: "Uttarakhand", district: "Dehradun", place: "Rampur" });
  assert.ok(r.ok);
  assert.equal(r.data.precision, "place");
  assert.deepEqual(r.data.candidates.map((c) => c.district), ["Dehradun", "Haridwar", null, "Dehradun"]);
  assert.equal(r.data.candidates.at(-1)?.place, null);
});

test("search with no results anywhere → empty list, not an error", async () => {
  const f = fake([[]]);
  const r = await createGeocodeService({ config, fetchImpl: f.impl, schedule: immediate }).search({ state: "Goa", district: "Nowhere", place: null });
  assert.ok(r.ok);
  assert.equal(r.data.candidates.length, 0);
});

test("results are cached (same query twice = one upstream call)", async () => {
  const f = fake([[place({ state: "Goa", state_district: "North Goa" })]]);
  const svc = createGeocodeService({ config, fetchImpl: f.impl, schedule: immediate });
  await svc.search({ state: "Goa", district: "North Goa", place: "Assagao" });
  await svc.search({ state: "Goa", district: "North Goa", place: "Assagao" });
  assert.equal(f.calls.length, 1);
});

test("upstream 403 (policy block) → RATE_LIMITED", async () => {
  const impl: typeof fetch = async () => new Response("blocked", { status: 403 });
  const r = await createGeocodeService({ config, fetchImpl: impl, schedule: immediate }).reverse(30, 78);
  assert.equal(r.ok ? null : r.error.code, "RATE_LIMITED");
});
