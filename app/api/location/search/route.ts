import { fail } from "@/lib/api/result";
import { findState } from "@/lib/location/states";
import { cleanText } from "@/lib/location/validate";
import { clientKey, jsonResult } from "@/lib/server/http";
import { geocodeService, locationLimiter } from "@/lib/server/instances";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/location/search?state=Uttarakhand&district=Dehradun&place=Rampur */
export async function GET(request: Request) {
  const limit = locationLimiter.check(clientKey(request.headers));
  if (!limit.allowed) {
    return jsonResult(fail("RATE_LIMITED", "Too many location requests", { retryAfterSec: Math.ceil(limit.retryAfterMs / 1000) }));
  }
  const p = new URL(request.url).searchParams;
  const state = findState(p.get("state"));
  const district = cleanText(p.get("district"), 60);
  const rawPlace = p.get("place");
  const place = rawPlace && rawPlace.trim() ? cleanText(rawPlace, 60) : null;
  if (!state) return jsonResult(fail("BAD_REQUEST", "Unknown state"));
  if (!district) return jsonResult(fail("BAD_REQUEST", "District is required (max 60 characters)"));
  if (rawPlace && rawPlace.trim() && !place) return jsonResult(fail("BAD_REQUEST", "Place is too long (max 60 characters)"));
  return jsonResult(await geocodeService.search({ state: state.en, district, place }));
}
