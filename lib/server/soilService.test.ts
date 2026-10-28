import { test } from "node:test";
import assert from "node:assert/strict";
import { createSoilService } from "./soilService.ts";

const time = Array.from({ length: 48 }, (_, i) => `2026-10-${26 + Math.floor(i / 24)}T${String(i % 24).padStart(2, "0")}:00`);
const body = { hourly: { time, soil_temperature_6cm: time.map(() => 21), soil_moisture_3_to_9cm: time.map(() => 0.3) } };
const NOW = Date.parse("2026-10-26T08:45:00Z"); // 14:15 IST

test("soil service: ok, cached, stale fallback, malformed → error", async () => {
  let calls = 0; let mode: "ok" | "down" | "bad" = "ok"; let clock = NOW;
  const f: typeof fetch = async () => { calls++; return mode === "down" ? new Response("x", { status: 503 }) : Response.json(mode === "bad" ? {} : body); };
  const svc = createSoilService({ fetchImpl: f, now: () => clock });
  const a = await svc.get(30.317, 78.032);
  assert.ok(a.ok); assert.equal(a.ok && a.data.soil.time, "2026-10-26T14:00");
  await svc.get(30.317, 78.032); assert.equal(calls, 1);
  clock += 2 * 3600e3; mode = "down";
  const b = await svc.get(30.317, 78.032); assert.ok(b.ok && b.data.stale);
  mode = "bad";
  const c = await createSoilService({ fetchImpl: f, now: () => clock }).get(29, 79);
  assert.equal(c.ok ? null : c.error.code, "INVALID_UPSTREAM_DATA");
});
