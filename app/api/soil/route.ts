import { fail } from "@/lib/api/result";
import { parseIndianCoords } from "@/lib/location/validate";
import { clientKey, jsonResult } from "@/lib/server/http";
import { soilService, weatherLimiter } from "@/lib/server/instances";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/soil?lat=..&lon=.. — model soil moisture and temperature (Open-Meteo). */
export async function GET(request: Request) {
  const limit = weatherLimiter.check(clientKey(request.headers));
  if (!limit.allowed) return jsonResult(fail("RATE_LIMITED", "Too many requests", { retryAfterSec: Math.ceil(limit.retryAfterMs / 1000) }));
  const url = new URL(request.url);
  const c = parseIndianCoords(url.searchParams.get("lat"), url.searchParams.get("lon"));
  if (!c) return jsonResult(fail("BAD_REQUEST", "lat and lon must be decimal numbers inside India"));
  return jsonResult(await soilService.get(c.lat, c.lon));
}
