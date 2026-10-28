import { fail } from "@/lib/api/result";
import { answer, safetyClass } from "@/lib/assistant/service";
import { parseAssistantRequest } from "@/lib/assistant/validate";
import { clientKey, jsonResult } from "@/lib/server/http";
import { assistantDeps, assistantGlobalLimiter, assistantLimiter } from "@/lib/server/instances";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BODY_BYTES = 32_000;

/** POST /api/assistant — Gemini runs only here, on the server. The key never reaches the browser. */
export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return jsonResult(fail("BAD_REQUEST", "Request too large"));
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return jsonResult(fail("BAD_REQUEST", "Body must be JSON"));
  }
  const req = parseAssistantRequest(body);
  if (!req) return jsonResult(fail("BAD_REQUEST", "Invalid request"));

  // Someone in crisis must get the helplines even after hitting the limit. This path never calls the model, so it costs nothing.
  if (!safetyClass(req)) {
    const lim = assistantLimiter.check(clientKey(request.headers));
    if (!lim.allowed) return jsonResult(fail("RATE_LIMITED", "Too many questions", { retryAfterSec: Math.ceil(lim.retryAfterMs / 1000) }));
    const glob = assistantGlobalLimiter.check("global");
    if (!glob.allowed) return jsonResult(fail("RATE_LIMITED", "Assistant busy", { retryAfterSec: Math.ceil(glob.retryAfterMs / 1000) }));
  }
  return jsonResult(await answer(req, assistantDeps));
}
