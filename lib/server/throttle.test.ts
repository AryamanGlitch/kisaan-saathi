import { test } from "node:test";
import assert from "node:assert/strict";
import { createSerialThrottle, ThrottleBusyError } from "./throttle.ts";

test("spaces job starts by minIntervalMs and runs them in order", async () => {
  let clock = 0;
  const starts: number[] = [];
  const schedule = createSerialThrottle({
    minIntervalMs: 1000,
    maxQueue: 10,
    now: () => clock,
    sleep: async (ms) => {
      clock += ms;
    },
  });
  const results = await Promise.all([1, 2, 3].map((n) => schedule(async () => (starts.push(clock), n))));
  assert.deepEqual(results, [1, 2, 3]);
  assert.deepEqual(starts, [0, 1000, 2000]);
});

test("a failing job does not block later jobs", async () => {
  const schedule = createSerialThrottle({ minIntervalMs: 0, maxQueue: 10 });
  await assert.rejects(schedule(async () => { throw new Error("boom"); }));
  assert.equal(await schedule(async () => "ok"), "ok");
});

test("rejects when the queue is full", async () => {
  const schedule = createSerialThrottle({ minIntervalMs: 0, maxQueue: 1 });
  let release!: () => void;
  const first = schedule(() => new Promise<void>((r) => (release = r)));
  await assert.rejects(schedule(async () => 1), ThrottleBusyError);
  release();
  await first;
});
