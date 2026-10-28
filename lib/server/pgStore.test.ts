import { test } from "node:test";
import assert from "node:assert/strict";
import { createPgStore, rowToStatus } from "./pgStore.ts";

test("pg store maps rows and uses parameterised upserts (fake client)", async () => {
  const calls: Array<{ text: string; params?: unknown[] }> = [];
  const db = {
    async query(text: string, params?: unknown[]) {
      calls.push({ text, params });
      if (text.startsWith("SELECT")) return { rows: [{ url: "u", last_success_at: new Date("2026-10-26T00:00:00Z"), changed_since_verification: true }] };
      return { rows: [] };
    },
  };
  const store = createPgStore("postgres://x", async () => db);
  const m = await store.load();
  assert.equal(m.get("u")?.lastSuccessAt, "2026-10-26T00:00:00.000Z");
  assert.equal(m.get("u")?.changedSinceVerification, true);
  await store.save([rowToStatus({ url: "u2" })]);
  const insert = calls.find((c) => c.text.includes("INSERT INTO scheme_source_status"));
  assert.ok(insert);
  assert.equal(insert.params?.[0], "u2");
  assert.ok(!insert.text.includes("u2"), "values must be parameters, not concatenated");
});
