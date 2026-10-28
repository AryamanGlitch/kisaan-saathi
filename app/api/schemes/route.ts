import { fail, ok } from "@/lib/api/result";
import { findState } from "@/lib/location/states";
import { schemesForState } from "@/lib/schemes/data";
import { lastCheckedOk, schemeFreshness } from "@/lib/schemes/freshness";
import { clientKey, jsonResult } from "@/lib/server/http";
import { readLimiter, schemeStore } from "@/lib/server/instances";
import { SOURCES } from "@/lib/sources";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/schemes?state=Uttarakhand — verified schemes plus honest freshness labels. */
export async function GET(request: Request) {
  const limit = readLimiter.check(clientKey(request.headers));
  if (!limit.allowed) return jsonResult(fail("RATE_LIMITED", "Too many requests", { retryAfterSec: Math.ceil(limit.retryAfterMs / 1000) }));
  const raw = new URL(request.url).searchParams.get("state");
  const state = raw ? findState(raw) : null;
  if (raw && !state) return jsonResult(fail("BAD_REQUEST", "Unknown state"));

  let statuses = null;
  let monitoringError = false;
  if (schemeStore.persistent) {
    try {
      statuses = await schemeStore.load();
    } catch {
      monitoringError = true; // database down: show schemes, but never claim they were checked
    }
  }
  const now = Date.now();
  const schemes = schemesForState(state?.en ?? null).map((s) => ({
    ...s,
    freshness: schemeFreshness(s, statuses, now),
    lastCheckedOk: lastCheckedOk(s, statuses),
    sources: s.sourceIds.map((id) => SOURCES[id]),
  }));
  return jsonResult(ok({ schemes, monitoring: { persistent: schemeStore.persistent && !monitoringError, error: monitoringError }, stateCovered: state?.en ?? null }));
}
