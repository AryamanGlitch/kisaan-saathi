import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, dayKind, isStale, todayInIndia } from "./time.ts";

test("todayInIndia uses IST, not UTC", () => {
  // 20:00 UTC on 26 Oct = 01:30 IST on 27 Oct
  assert.equal(todayInIndia(new Date("2026-10-26T20:00:00Z")), "2026-10-27");
  assert.equal(todayInIndia(new Date("2026-10-26T10:00:00Z")), "2026-10-26");
});

test("addDays crosses month and year boundaries", () => {
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});

test("dayKind", () => {
  assert.equal(dayKind("2026-10-26", "2026-10-26"), "today");
  assert.equal(dayKind("2026-10-27", "2026-10-26"), "tomorrow");
  assert.equal(dayKind("2026-10-29", "2026-10-26"), "other");
});

test("isStale", () => {
  const now = Date.parse("2026-10-26T12:00:00Z");
  assert.equal(isStale("2026-10-26T11:00:00Z", now, 3 * 3600e3), false);
  assert.equal(isStale("2026-10-26T08:00:00Z", now, 3 * 3600e3), true);
  assert.equal(isStale("not a date", now, 3 * 3600e3), true);
});

import { nowInIndiaLocal } from "./time.ts";
test("nowInIndiaLocal formats IST wall-clock time", () => {
  assert.equal(nowInIndiaLocal(new Date("2026-10-26T20:00:00Z")), "2026-10-27T01:30");
});
