import { test } from "node:test";
import assert from "node:assert/strict";
import { createAggregator, detectApyColumns, isStateCropFile, splitCsvLine, stateSlug, toCropId } from "./dataset.ts";
import { grownInDistrict } from "./grown.ts";

test("CSV line split and APY column detection", () => {
  assert.deepEqual(splitCsvLine('a,"b, c","d ""e"""'), ["a", "b, c", 'd "e"']);
  const c = detectApyColumns(["State_Name", "District_Name", "Crop_Year", "Season", "Crop", "Area", "Production"]);
  assert.deepEqual(c, { state: 0, district: 1, crop: 4, year: 2, season: 3, area: 5 });
  assert.equal(detectApyColumns(["a", "b"]), null);
});

test("aggregates latest-year area per district, maps crop names", () => {
  const cols = detectApyColumns(["State", "District", "Year", "Season", "Crop", "Area", "Production"])!;
  const agg = createAggregator();
  // Synthetic rows (test data only)
  for (const line of [
    "Uttarakhand,DEHRADUN,2018-19,Kharif,Rice,1000,2000",
    "Uttarakhand,DEHRADUN,2019-20,Kharif,Rice,900,1800",
    "Uttarakhand,DEHRADUN,2019-20,Rabi,Wheat,1500,3000",
    "Uttarakhand,DEHRADUN,2019-20,Whole Year,Sugarcane,,",
    "Uttarakhand,,2019-20,Kharif,Rice,1,1",
  ]) agg.add(cols, splitCsvLine(line));
  assert.deepEqual(agg.stats(), { rows: 4, skipped: 1 });
  const d = agg.result().get("Uttarakhand")!["DEHRADUN"]!;
  assert.deepEqual(d.map((c) => c.crop), ["Wheat", "Rice", "Sugarcane"]);
  assert.equal(d[1]!.latestYear, "2019-20"); assert.equal(d[1]!.areaHa, 900);
  assert.equal(d[2]!.areaHa, null);
  assert.equal(toCropId("Rapeseed &Mustard"), "mustard"); assert.equal(toCropId("Arhar/Tur"), "arhar");
  assert.equal(toCropId("Cotton(lint)"), "cotton"); assert.equal(toCropId("Moong(Green Gram)"), "moong"); assert.equal(toCropId("Sweet potato"), "sweet-potato");
  assert.equal(toCropId("Other Kharif pulses"), null);
  assert.equal(stateSlug("Jammu and Kashmir"), "jammu-and-kashmir");
  assert.ok(isStateCropFile({ version: 1, state: "x", source: "y", generatedAt: "z", districts: {} }));
});

test("verified district crop lists", () => {
  assert.ok(grownInDistrict("Uttarakhand", "Almora")?.crops.includes("finger-millet"));
  assert.ok(grownInDistrict("Uttarakhand", "dehradun"));
  assert.equal(grownInDistrict("Uttarakhand", "Chamoli"), null);
});
