import { test } from "node:test";
import assert from "node:assert/strict";
import { buildComplaint, buildMailto } from "./complaint.ts";
import { utilitiesForState } from "./data.ts";

test("complaint text includes only what the farmer gave", () => {
  const c = buildComplaint({ lang: "en", utilityName: "UPCL", issue: "no-power", consumerNumber: "", place: "Rampur, Dehradun", since: "yesterday", details: "" });
  assert.match(c.subject, /No electricity supply/);
  assert.ok(!c.body.includes("Consumer number"));
  assert.match(c.body, /Since: yesterday/);
  const h = buildComplaint({ lang: "hi", utilityName: "जल संस्थान", issue: "no-water", consumerNumber: "123", place: "रामपुर", since: "", details: "" });
  assert.match(h.body, /पानी नहीं आ रहा/);
  assert.match(h.body, /उपभोक्ता संख्या: 123/);
});

test("mailto is encoded and length-limited", () => {
  const url = buildMailto("a@b.org", "S & T", "x".repeat(5000));
  assert.ok(url.startsWith("mailto:a@b.org?subject=S%20%26%20T&body="));
  assert.ok(url.length <= 1800);
});

test("utility lookup by state", () => {
  assert.equal(utilitiesForState("Uttarakhand").length, 2);
  assert.equal(utilitiesForState("Goa").length, 0);
  assert.equal(utilitiesForState(null).length, 0);
});
