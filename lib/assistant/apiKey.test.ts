import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeApiKey } from "./apiKey.ts";

// Plainly fake keys with the right prefixes — not real credentials, and deliberately not shaped
// like real ones (a realistic-looking fake was flagged by GitHub's secret scanning).
const AQ = "AQ.FAKE.unit-test-key-not-real";
const AIZA = "AIza-FAKE-unit-test-key-not-real";

test("accepts the new AQ. auth keys (with dots) and old AIza keys", () => {
  assert.deepEqual(normalizeApiKey(AQ), { ok: true, key: AQ, kind: "auth" });
  assert.deepEqual(normalizeApiKey(AIZA), { ok: true, key: AIZA, kind: "standard" });
});

test("cleans common paste problems", () => {
  for (const pasted of [` ${AQ} `, `${AQ.slice(0, 20)}\n${AQ.slice(20)}`, `"${AQ}"`, `GEMINI_API_KEY=${AQ}`, `\u200B${AQ}\uFEFF`, `${AQ.slice(0, 10)} ${AQ.slice(10)}`]) {
    const r = normalizeApiKey(pasted);
    assert.ok(r.ok && r.key === AQ, JSON.stringify(pasted));
  }
});

test("rejects things that are clearly not keys", () => {
  assert.deepEqual(normalizeApiKey("   "), { ok: false, reason: "empty" });
  for (const bad of ["hello", "https://aistudio.google.com/apikey", "my key is AQ.abc!!", "x".repeat(600)]) assert.equal(normalizeApiKey(bad).ok, false, bad);
});
