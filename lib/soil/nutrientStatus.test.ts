import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COUNTS_WIDTH, detectNutrientColumns, emptyCounts, findVillages, isSoilDistrictFile, isSoilStateFile,
  sampleCount, shares, slotOf, sumCounts, type SoilDistrictFile,
} from "./nutrientStatus.ts";
import { matchDistrict } from "../location/districtMatch.ts";
import { grownInState } from "../crops/grown.ts";

test("portal column layout and nutrient/level names", () => {
  const h = ["﻿_id", "id", "year", "state_name", "state_code", "district_name", "district_code", "block_name", "block_code",
    "village_name", "village_code", "nutrient_type", "nutrient_name", "nutrient_level", "value"];
  assert.deepEqual(detectNutrientColumns(h), {
    year: 2, state: 3, district: 5, districtCode: 6, block: 7, village: 9, villageCode: 10, nutrient: 12, level: 13, value: 14,
  });
  assert.equal(detectNutrientColumns(["state", "district"]), null);
  assert.equal(COUNTS_WIDTH, 29);
  assert.equal(slotOf("Soil Ph", "Acidic"), 0);
  assert.equal(slotOf("Electrical Conductivity", "Non Saline"), 3);
  assert.equal(slotOf("Nitrogen", "Low"), 8);
  assert.equal(slotOf("Boron", "Sufficient"), 28);
  assert.equal(slotOf("Nitrogen", "Deficient"), null);
  assert.equal(slotOf("Calcium", "Low"), null);
});

test("shares: percent per level, concern share, untested parameters left out", () => {
  // Synthetic counts (test data only): 10 pH samples, nitrogen 8 low / 2 medium, nothing else tested.
  const c = emptyCounts();
  c[slotOf("Soil Ph", "Acidic")!] = 3; c[slotOf("Soil Ph", "Neutral")!] = 7;
  c[slotOf("Nitrogen", "Low")!] = 8; c[slotOf("Nitrogen", "Medium")!] = 2;
  const s = shares(c);
  assert.deepEqual(s.map((x) => x.id), ["ph", "n"]);
  assert.equal(s[0]!.concernPct, 30);
  assert.deepEqual(s[1]!.levels.map((l) => [l.rating, l.pct]), [["low", 80], ["medium", 20], ["high", 0]]);
  assert.equal(s[1]!.concernPct, 80);
  assert.equal(sampleCount(c), 10);
  assert.equal(sumCounts([c, c])[slotOf("Nitrogen", "Low")!], 16);
});

test("village lookup and file shape checks", () => {
  const f: SoilDistrictFile = {
    version: 1, state: "Uttarakhand", district: "Dehradun", years: ["2024-25"], blocks: ["Doiwala", "Raipur"],
    villages: [[0, "Rampur", emptyCounts()], [1, "Rampur", emptyCounts()], [1, "Kandoli", emptyCounts()]],
  };
  assert.ok(isSoilDistrictFile(f));
  assert.deepEqual(findVillages(f, "rampur"), [0, 1]);
  assert.deepEqual(findVillages(f, "Kandoli (Raipur)"), [2]);
  assert.deepEqual(findVillages(f, null), []);
  assert.ok(!isSoilDistrictFile({ ...f, villages: [[0, "x", [1, 2]]] }));
  assert.ok(isSoilStateFile({ version: 1, state: "x", source: "y", generatedAt: "z", years: [], districts: [] }));
});

test("soil data district spellings match the app's district list", () => {
  assert.equal(matchDistrict("Bihar", ["Purbi Champaran"]), "East Champaran");
  assert.equal(matchDistrict("Chhattisgarh", ["Kabeerdham"]), "Kabirdham");
  assert.equal(matchDistrict("Tamil Nadu", ["Kanniyakumari"]), "Kanyakumari");
});

test("state crop list from verified district plans", () => {
  const uk = grownInState("Uttarakhand");
  assert.ok(uk.includes("apple") && uk.includes("litchi") && uk.includes("wheat"));
  assert.equal(new Set(uk).size, uk.length);
  assert.deepEqual(grownInState("Kerala"), []);
});
