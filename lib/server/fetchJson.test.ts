import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchJson } from "./fetchJson.ts";
import { hangingFetch } from "../../test/fixtures/hangingFetch.ts";

const respond = (body: string, status = 200): typeof fetch => async () => new Response(body, { status });

test("ok JSON", async () => {
  assert.deepEqual(await fetchJson("https://x", { timeoutMs: 100, fetchImpl: respond('{"a":1}') }), { ok: true, json: { a: 1 } });
});

test("HTTP error keeps parsed body", async () => {
  const r = await fetchJson("https://x", { timeoutMs: 100, fetchImpl: respond('{"error":true,"reason":"bad"}', 400) });
  assert.deepEqual(r, { ok: false, failure: { kind: "http", status: 400, body: { error: true, reason: "bad" } } });
});

test("invalid JSON", async () => {
  assert.deepEqual(await fetchJson("https://x", { timeoutMs: 100, fetchImpl: respond("<html>") }), { ok: false, failure: { kind: "invalid-json" } });
});

test("network failure", async () => {
  const r = await fetchJson("https://x", { timeoutMs: 100, fetchImpl: async () => { throw new TypeError("fetch failed"); } });
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.failure.kind, "network");
});

test("timeout via real AbortSignal", async () => {
  const r = await fetchJson("https://x", { timeoutMs: 20, fetchImpl: hangingFetch });
  assert.deepEqual(r, { ok: false, failure: { kind: "timeout" } });
});
