import { test } from "node:test";
import assert from "node:assert/strict";
import { DISTRICTS } from "./districts.ts";
import { DISTRICT_COORDS } from "./districtCoords.ts";
import { INDIA_STATES } from "./states.ts";
import { districtCentre } from "./search.ts";
import { isWithinIndiaBounds } from "./validate.ts";

test("every listed district of every state has a centre inside India", () => {
  const missing: string[] = [];
  for (const s of INDIA_STATES) {
    assert.ok(DISTRICTS[s.en]?.length, `${s.en} has no districts`);
    for (const d of DISTRICTS[s.en]!) {
      const p = DISTRICT_COORDS[s.en]?.[d];
      if (!p) { missing.push(`${s.en} / ${d}`); continue; }
      assert.ok(isWithinIndiaBounds(p[0], p[1]), `${s.en} / ${d} is outside India`);
    }
  }
  assert.deepEqual(missing, [], "run scripts/build-district-coords.ts after adding districts");
});

test("district centre works for every listed district, and for spelling variants", () => {
  for (const s of INDIA_STATES) for (const d of DISTRICTS[s.en]!) assert.equal(districtCentre(s.en, d)?.district, d);
  assert.equal(districtCentre("Goa", "north goa")?.label, "North Goa, Goa");
  assert.equal(districtCentre("Bihar", "Purbi Champaran")?.district, "East Champaran");
  assert.equal(districtCentre("Goa", "Nowhere"), null);
});
