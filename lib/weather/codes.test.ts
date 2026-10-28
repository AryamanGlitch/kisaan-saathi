import { test } from "node:test";
import assert from "node:assert/strict";
import { weatherCodeKey } from "./codes.ts";

test("WMO codes map to keys; unknowns are explicit", () => {
  assert.equal(weatherCodeKey(0), "wx.clear");
  assert.equal(weatherCodeKey(65), "wx.heavyRain");
  assert.equal(weatherCodeKey(99), "wx.thunderHail");
  assert.equal(weatherCodeKey(12345), "wx.unknown");
  assert.equal(weatherCodeKey(null), "wx.unknown");
});
