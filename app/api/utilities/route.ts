import { fail, ok } from "@/lib/api/result";
import { findState } from "@/lib/location/states";
import { cleanText } from "@/lib/location/validate";
import { clientKey, jsonResult } from "@/lib/server/http";
import { readLimiter } from "@/lib/server/instances";
import { SOURCES } from "@/lib/sources";
import { utilitiesForState } from "@/lib/utilities/data";
import { FEED_ADAPTERS } from "@/lib/utilities/feeds";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/utilities?state=Uttarakhand&district=Dehradun — verified contacts plus live status where an adapter exists. */
export async function GET(request: Request) {
  const limit = readLimiter.check(clientKey(request.headers));
  if (!limit.allowed) return jsonResult(fail("RATE_LIMITED", "Too many requests", { retryAfterSec: Math.ceil(limit.retryAfterMs / 1000) }));
  const p = new URL(request.url).searchParams;
  const state = findState(p.get("state"));
  if (!state) return jsonResult(fail("BAD_REQUEST", "Unknown state"));
  const district = cleanText(p.get("district"), 80) ?? "";

  const utilities = await Promise.all(
    utilitiesForState(state.en).map(async (u) => {
      const adapter = u.liveFeed ? FEED_ADAPTERS[u.liveFeed] : undefined;
      let live = null;
      let liveError = false;
      if (adapter) {
        try {
          live = await adapter.fetchStatus({ state: state.en, district, lat: null, lon: null });
        } catch {
          liveError = true;
        }
      }
      return { ...u, source: SOURCES[u.sourceId], live, liveAvailable: Boolean(adapter), liveError };
    }),
  );
  return jsonResult(ok({ utilities }));
}
