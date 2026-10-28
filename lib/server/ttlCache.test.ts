import { test } from "node:test";
import assert from "node:assert/strict";
import { TtlCache } from "./ttlCache.ts";

test("fresh → stale → expired", () => {
  const c = new TtlCache<string>({ ttlMs: 100, maxStaleMs: 1000, maxEntries: 10 });
  c.set("k", "v", 0);
  assert.equal(c.get("k", 50)?.fresh, true);
  assert.equal(c.get("k", 500)?.fresh, false);
  assert.equal(c.get("k", 1001), null);
  assert.equal(c.size, 0);
});

test("evicts oldest beyond maxEntries", () => {
  const c = new TtlCache<number>({ ttlMs: 100, maxStaleMs: 100, maxEntries: 2 });
  c.set("a", 1, 0);
  c.set("b", 2, 0);
  c.set("c", 3, 0);
  assert.equal(c.get("a", 0), null);
  assert.equal(c.get("c", 0)?.value, 3);
});
