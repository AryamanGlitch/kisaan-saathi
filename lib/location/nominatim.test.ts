import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReverseUrl, buildSearchQuery, buildSearchUrl, parseAddress, parseReverse, parseSearch, rankCandidates } from "./nominatim.ts";

// Synthetic responses in Nominatim's jsonv2 shape (test data only).
const reverseJson = {
  lat: "30.3165",
  lon: "78.0322",
  display_name: "Rajpur Road, Dehradun, Uttarakhand, 248001, India",
  address: { suburb: "Rajpur", state_district: "Dehradun District", state: "Uttarakhand", postcode: "248001", country_code: "in" },
};

test("parseAddress finds district under alternative keys and strips 'District'", () => {
  assert.equal(parseAddress({ state_district: "Dehradun District" }).district, "Dehradun");
  assert.equal(parseAddress({ county: "Haridwar" }).district, "Haridwar");
  assert.equal(parseAddress({ village: "Rampur", town: "X" }).place, "Rampur");
  assert.equal(parseAddress(null).state, null);
});

test("parseReverse", () => {
  const c = parseReverse(reverseJson);
  assert.ok(c);
  assert.equal(c.lat, 30.3165);
  assert.equal(c.state, "Uttarakhand");
  assert.equal(c.district, "Dehradun");
  assert.equal(c.label, "Rajpur, Dehradun, Uttarakhand");
  assert.equal(parseReverse({ error: "Unable to geocode" }), null);
  assert.equal(parseReverse({ lat: "x", lon: "1" }), null);
});

test("parseSearch drops invalid and non-Indian results", () => {
  const out = parseSearch([
    reverseJson,
    { lat: "27.7", lon: "85.3", address: { state: "Bagmati", country_code: "np" } },
    { lat: "bad", lon: "1" },
    "junk",
  ]);
  assert.equal(out.length, 1);
  assert.deepEqual(parseSearch({ not: "an array" }), []);
});

test("rankCandidates puts the chosen state first and flags others", () => {
  const a = { ...parseReverse(reverseJson)! };
  const b = { ...a, state: "Uttar Pradesh", label: "Rampur, UP" };
  const r = rankCandidates([b, a], "Uttarakhand");
  assert.equal(r[0]?.state, "Uttarakhand");
  assert.equal(r[0]?.matchesState, true);
  assert.equal(r[1]?.matchesState, false);
});

test("URL builders set required parameters", () => {
  const rev = new URL(buildReverseUrl(30.317, 78.032));
  assert.equal(rev.pathname, "/reverse");
  assert.equal(rev.searchParams.get("format"), "jsonv2");
  const s = new URL(buildSearchUrl(buildSearchQuery({ place: "Rampur", district: "Dehradun", state: "Uttarakhand" })));
  assert.equal(s.searchParams.get("countrycodes"), "in");
  assert.equal(s.searchParams.get("q"), "Rampur, Dehradun, Uttarakhand, India");
});
