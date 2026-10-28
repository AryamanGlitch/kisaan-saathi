import { fail } from "@/lib/api/result";
import { parseCoordinate, isWithinIndiaBounds } from "@/lib/location/validate";
import { clientKey, jsonResult } from "@/lib/server/http";
import { geocodeService, locationLimiter } from "@/lib/server/instances";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/location/reverse?lat=..&lon=.. → place name for GPS coordinates */
export async function GET(request: Request) {
  const limit = locationLimiter.check(clientKey(request.headers));
  if (!limit.allowed) {
    return jsonResult(fail("RATE_LIMITED", "Too many location requests", { retryAfterSec: Math.ceil(limit.retryAfterMs / 1000) }));
  }
  const url = new URL(request.url);
  const lat = parseCoordinate(url.searchParams.get("lat"));
  const lon = parseCoordinate(url.searchParams.get("lon"));
  if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return jsonResult(fail("BAD_REQUEST", "lat and lon must be valid decimal coordinates"));
  }
  if (!isWithinIndiaBounds(lat, lon)) return jsonResult(fail("OUTSIDE_INDIA", "Coordinates are outside India"));
  return jsonResult(await geocodeService.reverse(lat, lon));
}
