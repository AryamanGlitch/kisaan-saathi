import { test } from "node:test";
import assert from "node:assert/strict";
import { DISTRICTS } from "./districts.ts";
import { INDIA_STATES } from "./states.ts";
import { districtsFor, matchDistrict } from "./districtMatch.ts";

test("every state/UT has a district list without duplicates", () => {
  for (const s of INDIA_STATES) {
    const list = DISTRICTS[s.en];
    assert.ok(list && list.length > 0, s.en);
    assert.equal(new Set(list).size, list.length, `${s.en} duplicates`);
  }
  const total = Object.values(DISTRICTS).reduce((n, l) => n + l.length, 0);
  assert.ok(total >= 780 && total <= 820, `total ${total}`);
  assert.equal(districtsFor("Uttarakhand").length, 13);
  assert.deepEqual(districtsFor("Atlantis"), []);
});

test("exact, case, 'District' suffix, alias, renamed and typo matches", () => {
  assert.equal(matchDistrict("Uttarakhand", ["dehradun district"]), "Dehradun");
  assert.equal(matchDistrict("Uttarakhand", ["Dehra Dun"]), "Dehradun");
  assert.equal(matchDistrict("Uttarakhand", ["Garhwal"]), "Pauri Garhwal");
  assert.equal(matchDistrict("Uttar Pradesh", ["Allahabad"]), "Prayagraj");
  assert.equal(matchDistrict("Maharashtra", ["Aurangabad"]), "Chhatrapati Sambhajinagar (Aurangabad)");
  assert.equal(matchDistrict("Maharashtra", ["Chhatrapati Sambhajinagar"]), "Chhatrapati Sambhajinagar (Aurangabad)");
  assert.equal(matchDistrict("Karnataka", ["Mysore District"]), "Mysuru (Mysore)");
  assert.equal(matchDistrict("Haryana", ["Gurgaon"]), "Gurugram");
  assert.equal(matchDistrict("Uttarakhand", ["Haridwaar"]), "Haridwar", "small typo");
});

test("tries each map name in order (tehsil first, district second)", () => {
  assert.equal(matchDistrict("Uttarakhand", ["Vikasnagar", null, "Dehradun"]), "Dehradun");
});

test("no false matches", () => {
  assert.equal(matchDistrict("Uttarakhand", ["Agra"]), null);
  assert.equal(matchDistrict("Bihar", ["Aurangabad"]), "Aurangabad", "same name in another state stays in its own state");
  assert.equal(matchDistrict("Uttarakhand", ["xyz"]), null);
  assert.equal(matchDistrict(null, ["Dehradun"]), null);
});

test("names exactly as listed match, including ones with the old name in brackets", () => {
  assert.equal(matchDistrict("Karnataka", ["Mysuru (Mysore)"]), "Mysuru (Mysore)");
  assert.equal(matchDistrict("Maharashtra", ["Chhatrapati Sambhajinagar (Aurangabad)"]), "Chhatrapati Sambhajinagar (Aurangabad)");
  assert.equal(matchDistrict("Karnataka", ["Mysore"]), "Mysuru (Mysore)");
});
