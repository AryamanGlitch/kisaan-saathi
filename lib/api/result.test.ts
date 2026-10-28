import { test } from "node:test";
import assert from "node:assert/strict";
import { fail, isApiResult, ok, statusFor } from "./result.ts";

test("statusFor maps codes to HTTP statuses", () => {
  assert.equal(statusFor(ok(1)), 200);
  assert.equal(statusFor(fail("BAD_REQUEST", "x")), 400);
  assert.equal(statusFor(fail("RATE_LIMITED", "x")), 429);
  assert.equal(statusFor(fail("NOT_CONFIGURED", "x")), 503);
  assert.equal(statusFor(fail("UPSTREAM_TIMEOUT", "x")), 504);
  assert.equal(statusFor(fail("INVALID_UPSTREAM_DATA", "x")), 502);
});

test("isApiResult accepts valid shapes and rejects junk", () => {
  assert.ok(isApiResult({ ok: true, data: null }));
  assert.ok(isApiResult({ ok: false, error: { code: "NOT_FOUND", message: "m" } }));
  assert.ok(!isApiResult({ ok: false, error: { code: "MADE_UP", message: "m" } }));
  assert.ok(!isApiResult("<html>500</html>"));
  assert.ok(!isApiResult(null));
  assert.ok(!isApiResult({ ok: true }));
});
