import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGeocodingUrl, parseGeocoding } from "./openMeteoGeocoding.ts";

test("URL limits to India and keeps the state qualifier", () => {
  const u = new URL(buildGeocodingUrl("Rampur, Uttarakhand"));
  assert.equal(u.searchParams.get("countryCode"), "IN");
  assert.equal(u.searchParams.get("name"), "Rampur, Uttarakhand");
});

test("parses results, drops non-Indian and malformed ones", () => {
  const out = parseGeocoding({
    results: [
      { name: "Dehradun", latitude: 30.3226, longitude: 78.0317, country_code: "IN", admin1: "Uttarakhand", admin2: "Dehradun", postcodes: ["248001"] },
      { name: "Kathmandu", latitude: 27.7, longitude: 85.3, country_code: "NP", admin1: "Bagmati" },
      { name: "Broken", latitude: "x", longitude: 78 },
    ],
  });
  assert.equal(out.length, 1);
  assert.equal(out[0]?.label, "Dehradun, Uttarakhand");
  assert.equal(out[0]?.postcode, "248001");
  assert.deepEqual(parseGeocoding({}), []);
  assert.deepEqual(parseGeocoding(null), []);
});
