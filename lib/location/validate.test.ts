import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildLabel,
  cleanText,
  isSavedLocation,
  isValidPin,
  parseCoordinate,
  parseIndianCoords,
  roundCoord,
} from "./validate.ts";

test("parseCoordinate is strict", () => {
  assert.equal(parseCoordinate("30.3165"), 30.3165);
  assert.equal(parseCoordinate(" -12.5 "), -12.5);
  for (const bad of [null, "", "abc", "1e3", "12,5", "30.", "NaN", "Infinity", "1234.5"]) {
    assert.equal(parseCoordinate(bad), null, String(bad));
  }
});

test("parseIndianCoords rejects points outside India's box", () => {
  assert.deepEqual(parseIndianCoords("30.3", "78.0"), { lat: 30.3, lon: 78 });
  assert.equal(parseIndianCoords("51.5", "-0.12"), null); // London
  assert.equal(parseIndianCoords("30.3", null), null);
});

test("PIN validation", () => {
  assert.ok(isValidPin("248001"));
  assert.ok(!isValidPin("048001"));
  assert.ok(!isValidPin("24800"));
  assert.ok(!isValidPin("2480011"));
  assert.ok(!isValidPin("24800a"));
});

test("cleanText trims, strips control chars, enforces length, keeps Hindi", () => {
  assert.equal(cleanText("  Rampur\n  Kalan "), "Rampur Kalan");
  assert.equal(cleanText("देहरादून"), "देहरादून");
  assert.equal(cleanText("   "), null);
  assert.equal(cleanText(42), null);
  assert.equal(cleanText("x".repeat(81)), null);
});

test("roundCoord and buildLabel", () => {
  assert.equal(roundCoord(30.316512, 3), 30.317);
  assert.equal(buildLabel(["Dehradun", "dehradun", null, "Uttarakhand"]), "Dehradun, Uttarakhand");
});

const good = {
  version: 1,
  state: "Uttarakhand",
  district: "Dehradun",
  place: null,
  pin: "248001",
  lat: 30.317,
  lon: 78.032,
  accuracyM: 25,
  label: "Dehradun, Uttarakhand",
  source: "gps",
  savedAt: "2026-10-26T10:00:00.000Z",
};

test("isSavedLocation accepts valid and rejects inconsistent records", () => {
  assert.ok(isSavedLocation(good));
  assert.ok(isSavedLocation({ ...good, lat: null, lon: null, accuracyM: null, source: "manual-unverified" }));
  assert.ok(!isSavedLocation({ ...good, state: "Atlantis" }));
  assert.ok(!isSavedLocation({ ...good, lat: null })); // lat without lon
  assert.ok(!isSavedLocation({ ...good, lat: null, lon: null })); // gps source but no coords
  assert.ok(!isSavedLocation({ ...good, source: "manual-unverified" })); // unverified but has coords
  assert.ok(isSavedLocation({ ...good, place: "Doiwala", label: "Doiwala, Dehradun, Uttarakhand", accuracyM: null, source: "manual-district" }));
  assert.ok(!isSavedLocation({ ...good, lat: null, lon: null, source: "manual-district" })); // district centre needs coords
  assert.ok(!isSavedLocation({ ...good, lat: 51.5, lon: -0.1 }));
  assert.ok(!isSavedLocation({ ...good, version: 2 }));
  assert.ok(!isSavedLocation({ ...good, pin: "12" }));
  assert.ok(!isSavedLocation("garbage"));
});
