import { test } from "node:test";
import assert from "node:assert/strict";
import { INDIA_STATES, findState } from "./states.ts";

test("28 states and 8 union territories, no duplicates", () => {
  assert.equal(INDIA_STATES.filter((s) => s.kind === "state").length, 28);
  assert.equal(INDIA_STATES.filter((s) => s.kind === "ut").length, 8);
  assert.equal(new Set(INDIA_STATES.map((s) => s.en)).size, 36);
  assert.ok(INDIA_STATES.every((s) => s.hi.trim().length > 0));
});

test("findState handles case, ampersands and old names", () => {
  assert.equal(findState("uttarakhand")?.en, "Uttarakhand");
  assert.equal(findState("Jammu & Kashmir")?.en, "Jammu and Kashmir");
  assert.equal(findState("Orissa")?.en, "Odisha");
  assert.equal(findState("NCT of Delhi")?.en, "Delhi");
  assert.equal(findState("Atlantis"), null);
  assert.equal(findState(""), null);
  assert.equal(findState(null), null);
});
