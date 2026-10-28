import { statusFor, type ApiResult } from "../api/result.ts";

/** Best-effort client identifier for rate limiting. Behind a trusted proxy only; headers can be spoofed. */
export function clientKey(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || headers.get("x-real-ip")?.trim() || "unknown";
}

export function jsonResult(result: ApiResult<unknown>): Response {
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (!result.ok && result.error.retryAfterSec) headers["Retry-After"] = String(result.error.retryAfterSec);
  return Response.json(result, { status: statusFor(result), headers });
}
