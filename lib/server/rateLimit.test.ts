import { test } from "node:test";
import assert from "node:assert/strict";
import { createRateLimiter } from "./rateLimit.ts";

test("allows up to the limit, then blocks until the window resets", () => {
  const rl = createRateLimiter({ limit: 2, windowMs: 1000 });
  assert.ok(rl.check("ip", 0).allowed);
  assert.ok(rl.check("ip", 10).allowed);
  const blocked = rl.check("ip", 20);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterMs, 980);
  assert.ok(rl.check("other", 20).allowed, "separate keys are independent");
  assert.ok(rl.check("ip", 1000).allowed);
});

test("memory is bounded", () => {
  const rl = createRateLimiter({ limit: 1, windowMs: 1000, maxKeys: 5 });
  for (let i = 0; i < 50; i++) rl.check(`ip${i}`, 0);
  assert.ok(rl.size <= 5);
});
