import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDate } from "./format.ts";

test("formatDate is the same on server and browser, in IST, and safe on bad input", () => {
  assert.equal(formatDate("2026-10-26T12:00:00+05:30", "en"), "26 October 2026");
  assert.equal(formatDate("2026-10-26T12:00:00+05:30", "hi"), "26 अक्टूबर 2026");
  assert.equal(formatDate("2026-02-01T00:00:00+05:30", "hi"), "1 फ़रवरी 2026");
  // 20:00 UTC on 31 Dec is already 1 Jan in India.
  assert.equal(formatDate("2025-12-31T20:00:00Z", "en"), "1 January 2026");
  assert.equal(formatDate("not a date", "en"), "—");
});
