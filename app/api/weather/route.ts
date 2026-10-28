import { fail } from "@/lib/api/result";
import { parseIndianCoords } from "@/lib/location/validate";
import { clientKey, jsonResult } from "@/lib/server/http";
import { weatherLimiter, weatherService } from "@/lib/server/instances";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/weather?lat=30.316&lon=78.032 */
export async function GET(request: Request) {
  const limit = weatherLimiter.check(clientKey(request.headers));
  if (!limit.allowed) {
    return jsonResult(fail("RATE_LIMITED", "Too many weather requests", { retryAfterSec: Math.ceil(limit.retryAfterMs / 1000) }));
  }
  const url = new URL(request.url);
  const coords = parseIndianCoords(url.searchParams.get("lat"), url.searchParams.get("lon"));
  if (!coords) return jsonResult(fail("BAD_REQUEST", "lat and lon must be decimal numbers inside India"));
  const force = url.searchParams.get("refresh") === "1";
  return jsonResult(await weatherService.get(coords.lat, coords.lon, { force }));
}
