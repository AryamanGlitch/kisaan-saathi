import { test } from "node:test";
import assert from "node:assert/strict";
import { windowText } from "./format.ts";
import { translate, type StringKey } from "../i18n/strings.ts";

test("window text in English and Hindi", () => {
  const w = { regime: "irrigated" as const, season: "kharif" as const, start: { month: 6, week: 1 as const }, end: { month: 7, week: 4 as const }, sourceText: "" };
  const en = (k: StringKey, p?: Record<string, string | number>) => translate("en", k, p);
  const hi = (k: StringKey, p?: Record<string, string | number>) => translate("hi", k, p);
  assert.equal(windowText(w, "en", en), "Kharif: 1st week of June – 4th week of July");
  assert.match(windowText(w, "hi", hi), /^खरीफ: जून का पहला सप्ताह – जुलाई का चौथा सप्ताह$/);
  assert.equal(windowText({ ...w, season: "rabi", start: { month: 10 }, end: { month: 10 } }, "en", en), "Rabi: October");
});
