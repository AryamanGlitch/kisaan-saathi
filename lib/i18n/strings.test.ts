import { test } from "node:test";
import assert from "node:assert/strict";
import { DICTS, en, interpolate, placeholders, type StringKey } from "./strings.ts";

const keys = Object.keys(en) as StringKey[];

test("every language has every key, non-empty, with the same placeholders", () => {
  for (const [lang, dict] of Object.entries(DICTS)) {
    assert.deepEqual(Object.keys(dict).sort(), [...keys].sort(), `${lang} key set`);
    for (const k of keys) {
      assert.ok(dict[k].trim().length > 0, `${lang}.${k} empty`);
      assert.deepEqual(placeholders(dict[k]), placeholders(en[k]), `${lang}.${k} placeholders`);
    }
  }
});

test("interpolate fills known and leaves unknown placeholders visible", () => {
  assert.equal(interpolate("Hi {a}, {b}", { a: 1 }), "Hi 1, {b}");
});
