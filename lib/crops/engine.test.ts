import { test } from "node:test";
import assert from "node:assert/strict";
import { cropsSowableOn, endOrdinal, findDistrictData, ordinalOf, recommendCrops, startOrdinal, windowPosition } from "./engine.ts";
import { DISTRICT_CROP_DATA } from "./data.ts";
import type { SowingWindow } from "./types.ts";

const base = { state: "Uttarakhand", district: "Dehradun", previousCrop: null } as const;

test("calendar ordinals and week boundaries", () => {
  assert.equal(ordinalOf("2026-01-01"), 1);
  assert.equal(ordinalOf("2026-12-31"), 365);
  assert.equal(ordinalOf("2028-02-29"), ordinalOf("2028-02-28"));
  assert.equal(startOrdinal({ month: 6, week: 1 }), ordinalOf("2026-06-01"));
  assert.equal(startOrdinal({ month: 6, week: 3 }), ordinalOf("2026-06-15"));
  assert.equal(endOrdinal({ month: 7, week: 4 }), ordinalOf("2026-07-31"));
  assert.equal(endOrdinal({ month: 2 }), ordinalOf("2026-02-28"));
  assert.throws(() => ordinalOf("26-10-2026"));
});

test("window position, including windows that wrap past December", () => {
  const w: SowingWindow = { regime: "irrigated", season: "rabi", start: { month: 11 }, end: { month: 1 }, sourceText: "x" };
  assert.deepEqual(windowPosition(w, ordinalOf("2026-12-15")), { status: "open", daysLeft: 16 + 31 });
  assert.deepEqual(windowPosition(w, ordinalOf("2026-01-10")), { status: "open", daysLeft: 21 });
  assert.equal(windowPosition(w, ordinalOf("2026-10-25")).status, "upcoming");
});

test("district lookup is tolerant of spelling and spacing", () => {
  assert.ok(findDistrictData("uttarakhand", "Dehra Dun", DISTRICT_CROP_DATA));
  assert.equal(findDistrictData("Uttarakhand", "Chamoli", DISTRICT_CROP_DATA), null);
});

test("late October, irrigated: wheat open (Oct–Dec)", () => {
  const r = recommendCrops({ ...base, sowingDate: "2026-10-26", water: "irrigated" }, DISTRICT_CROP_DATA);
  assert.equal(r.kind, "ok");
  if (r.kind !== "ok") return;
  assert.deepEqual(r.suggestions.map((s) => s.cropId), ["wheat"]);
  assert.deepEqual(r.suggestions[0]?.timing, { status: "open", daysLeft: 66 });
});

test("late October, rainfed: wheat open but closing in 5 days; sugarcane needs irrigation", () => {
  const r = recommendCrops({ ...base, sowingDate: "2026-10-26", water: "rainfed" }, DISTRICT_CROP_DATA);
  if (r.kind !== "ok") return assert.fail();
  assert.deepEqual(r.suggestions[0]?.timing, { status: "open", daysLeft: 5 });
  assert.ok(r.notNow.some((n) => n.cropId === "sugarcane" && n.reason === "needs-irrigation"));
});

test("mid-May, irrigated: rice/maize use irrigated windows (opening soon); millet uses its rainfed window", () => {
  const r = recommendCrops({ ...base, sowingDate: "2026-05-20", water: "irrigated" }, DISTRICT_CROP_DATA);
  if (r.kind !== "ok") return assert.fail();
  const ids = r.suggestions.map((s) => s.cropId);
  assert.ok(ids.includes("barnyard-millet"));
  const millet = r.suggestions.find((s) => s.cropId === "barnyard-millet");
  assert.equal(millet?.usesRainfedWindow, true);
  const rice = r.suggestions.find((s) => s.cropId === "rice");
  assert.deepEqual(rice?.timing, { status: "soon", daysUntil: 12 });
  // open before soon
  const firstSoon = r.suggestions.findIndex((s) => s.timing.status === "soon");
  const lastOpen = r.suggestions.map((s) => s.timing.status).lastIndexOf("open");
  assert.ok(lastOpen < firstSoon);
});

test("previous crop and forecast risks are attached, durations stay null", () => {
  const adv = [{ kind: "heavy-rain" as const, date: "2026-10-27", value: 80, unit: "mm" as const }];
  const r = recommendCrops({ ...base, sowingDate: "2026-10-26", water: "irrigated", previousCrop: "wheat" }, DISTRICT_CROP_DATA, adv);
  if (r.kind !== "ok") return assert.fail();
  assert.equal(r.suggestions[0]?.sameAsPrevious, true);
  assert.equal(r.suggestions[0]?.forecastRisks.length, 1);
  assert.equal(r.suggestions[0]?.durationDays, null);
});

test("no verified data → no-data, never a guess", () => {
  assert.deepEqual(recommendCrops({ ...base, district: "Chamoli", sowingDate: "2026-10-26", water: "irrigated" }, DISTRICT_CROP_DATA), { kind: "no-data" });
});

test("sowable today for the dashboard", () => {
  assert.deepEqual(cropsSowableOn("Uttarakhand", "Dehradun", "2026-10-26", DISTRICT_CROP_DATA).map((c) => c.cropId), ["wheat", "wheat"]);
});

test("new districts: Almora rainfed rabi in late October; Haridwar irrigated wheat from 2nd week of November", () => {
  const a = recommendCrops({ state: "Uttarakhand", district: "Almora", sowingDate: "2026-10-26", water: "rainfed", previousCrop: null }, DISTRICT_CROP_DATA);
  if (a.kind !== "ok") return assert.fail();
  assert.deepEqual(a.suggestions.map((s) => s.cropId).sort(), ["barley", "lentil", "wheat"]);
  const h = recommendCrops({ state: "Uttarakhand", district: "Haridwar", sowingDate: "2026-10-26", water: "irrigated", previousCrop: null }, DISTRICT_CROP_DATA);
  if (h.kind !== "ok") return assert.fail();
  assert.deepEqual(h.suggestions.map((s) => [s.cropId, s.timing.status]), [["wheat", "soon"]]);
});
