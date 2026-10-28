import { test } from "node:test";
import assert from "node:assert/strict";
import { schemeFreshness } from "./freshness.ts";
import { createMemoryStore, emptyStatus, nextStatus, normalizePageText, runRefresh, sha256Hex, watchedUrls } from "./refresh.ts";
import { SCHEMES, schemesForState } from "./data.ts";
import type { SchemeRecord, SourceStatus } from "./types.ts";

const rec = (o: Partial<SchemeRecord> = {}): SchemeRecord => ({ ...(SCHEMES[0] as SchemeRecord), ...o });
const NOW = Date.parse("2026-10-28T06:00:00+05:30");
const st = (o: Partial<SourceStatus>): Map<string, SourceStatus> =>
  new Map([["https://pmkisan.gov.in/", { ...emptyStatus("https://pmkisan.gov.in/"), ...o }]]);

test("freshness labels", () => {
  assert.equal(schemeFreshness(rec(), null, NOW), "not-monitored");
  assert.equal(schemeFreshness(rec(), st({ lastSuccessAt: "2026-10-28T00:00:00Z" }), NOW), "current");
  assert.equal(schemeFreshness(rec(), st({ lastSuccessAt: "2026-10-20T00:00:00Z" }), NOW), "check-overdue");
  assert.equal(schemeFreshness(rec(), st({}), NOW), "check-overdue");
  assert.equal(schemeFreshness(rec(), st({ lastSuccessAt: "2026-10-28T00:00:00Z", changedSinceVerification: true }), NOW), "source-changed");
  assert.equal(schemeFreshness(rec({ status: "needs-verification" }), st({}), NOW), "needs-verification");
  assert.equal(schemeFreshness(rec({ lastVerified: "2026-01-01" }), st({}), NOW), "needs-verification", "older than 180 days");
});

test("page text normalisation ignores scripts, tags and whitespace", async () => {
  const a = normalizePageText("<html><script>var t=Date.now()</script><p>Rs  6000</p></html>");
  const b = normalizePageText("<html><script>var t=123</script>\n<div>Rs 6000</div></html>");
  assert.equal(a, b);
  assert.equal(await sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("status transitions: baseline, unchanged, changed, failure keeps last success", () => {
  const t1 = "2026-10-26T01:00:00Z", t2 = "2026-10-27T01:00:00Z", t3 = "2026-10-28T01:00:00Z";
  let s = nextStatus(emptyStatus("u"), { ok: true, hash: "A" }, "2026-10-26", t1);
  assert.equal(s.baselineHash, "A");
  assert.equal(s.changedSinceVerification, false);
  s = nextStatus(s, { ok: true, hash: "A" }, "2026-10-26", t2);
  assert.equal(s.changedSinceVerification, false);
  s = nextStatus(s, { ok: true, hash: "B" }, "2026-10-26", t3);
  assert.equal(s.changedSinceVerification, true);
  assert.equal(s.lastChangedAt, t3);
  const failed = nextStatus(s, { ok: false, error: "HTTP 503" }, "2026-10-26", "2026-10-29T01:00:00Z");
  assert.equal(failed.lastSuccessAt, t3, "failure must not erase the last success");
  assert.equal(failed.changedSinceVerification, true, "failure must not clear a change flag");
  const reverified = nextStatus(failed, { ok: true, hash: "B" }, "2026-10-30", "2026-10-30T01:00:00Z");
  assert.equal(reverified.changedSinceVerification, false, "a newer human verification re-baselines");
});

test("runRefresh checks each watched URL once and reports changes and failures", async () => {
  const store = createMemoryStore();
  const pages: Record<string, string> = { "https://pmkisan.gov.in/": "<p>v1</p>", "https://pmfby.gov.in/": "<p>x</p>", "https://soilhealth.dac.gov.in/": "<p>y</p>" };
  const fetchText = async (u: string) => (u in pages ? { ok: true as const, text: pages[u]! } : { ok: false as const, error: "HTTP 404" });
  const first = await runRefresh({ registry: SCHEMES, store, fetchText });
  assert.equal(first.checked, watchedUrls(SCHEMES).size);
  assert.deepEqual(first.changed, []);
  pages["https://pmkisan.gov.in/"] = "<p>v2</p>";
  delete pages["https://pmfby.gov.in/"];
  const second = await runRefresh({ registry: SCHEMES, store, fetchText });
  assert.deepEqual(second.changed, ["https://pmkisan.gov.in/"]);
  assert.deepEqual(second.failed.map((f) => f.url), ["https://pmfby.gov.in/"]);
  assert.equal(store.runs.length, 2);
  const s = await store.load();
  assert.ok(s.get("https://pmfby.gov.in/")?.lastSuccessAt, "earlier success kept");
});

test("a throwing fetch is recorded as a failure, not a crash", async () => {
  const store = createMemoryStore();
  const r = await runRefresh({ registry: SCHEMES, store, fetchText: async () => { throw new Error("boom"); } });
  assert.equal(r.failed.length, r.checked);
});

test("central schemes apply everywhere", () => {
  assert.equal(schemesForState("Goa").length, SCHEMES.length);
  assert.equal(schemesForState(null).length, SCHEMES.length);
});
