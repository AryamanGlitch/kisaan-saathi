import { test } from "node:test";
import assert from "node:assert/strict";
import { SOURCES, isSourceId } from "./sources.ts";
import { DISTRICT_CROP_DATA } from "./crops/data.ts";
import { DISTRICT_PROBLEMS } from "./cropcare/data.ts";
import { SCHEMES } from "./schemes/data.ts";
import { UTILITIES } from "./utilities/data.ts";
import { findState } from "./location/states.ts";
import { startOrdinal, endOrdinal } from "./crops/engine.ts";

const httpsUrl = (u: string) => /^https:\/\/[^\s]+$/.test(u);
const isoDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));

test("sources: https URLs, valid dates, id matches key", () => {
  for (const [k, s] of Object.entries(SOURCES)) {
    assert.equal(s.id, k);
    assert.ok(httpsUrl(s.url), s.url);
    assert.ok(isoDate(s.verifiedOn));
    if (s.documentDate) assert.ok(isoDate(s.documentDate));
  }
});

test("crop data: known states, valid windows, real source ids, no invented durations", () => {
  for (const d of DISTRICT_CROP_DATA) {
    assert.ok(findState(d.state), d.state);
    assert.ok(isSourceId(d.sourceId));
    for (const r of d.records) {
      assert.ok(r.windows.length > 0);
      for (const w of r.windows) {
        assert.ok(startOrdinal(w.start) >= 1 && endOrdinal(w.end) <= 365);
        assert.ok(w.sourceText.length > 5);
      }
    }
  }
});

test("crop-care problems cite real sources", () => {
  for (const d of DISTRICT_PROBLEMS) {
    assert.ok(isSourceId(d.sourceId));
    for (const list of Object.values(d.byCrop)) for (const p of list ?? []) assert.ok(p.en && p.hi);
  }
});

test("schemes: bilingual, sourced, https links, unique ids, honest status notes", () => {
  const ids = new Set<string>();
  for (const s of SCHEMES) {
    assert.ok(!ids.has(s.id));
    ids.add(s.id);
    assert.ok(s.sourceIds.length > 0 && s.sourceIds.every(isSourceId), s.id);
    assert.ok(httpsUrl(s.applyUrl));
    s.watchUrls.forEach((u) => assert.ok(httpsUrl(u)));
    for (const f of [s.name, s.summary, s.howToApply, s.benefits, s.eligibility, s.documents, s.statusNote]) {
      if (f) assert.ok(f.en.trim() && f.hi.trim(), `${s.id} missing translation`);
    }
    assert.ok(isoDate(s.lastVerified));
    if (s.status === "needs-verification") assert.ok(s.statusNote, `${s.id} must explain why`);
  }
});

test("utilities: verified sources and valid contacts", () => {
  for (const u of UTILITIES) {
    assert.ok(findState(u.state));
    assert.ok(isSourceId(u.sourceId));
    for (const c of u.contacts) {
      if (c.type === "phone") assert.match(c.value, /^\d{3,12}$/);
      if (c.type === "email") assert.match(c.value, /^[^@\s]+@[^@\s]+\.[a-z]+$/);
      if (c.type === "web") assert.ok(httpsUrl(c.value));
    }
    assert.equal(u.liveFeed, null, "no live feed has been verified");
  }
});
