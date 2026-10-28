import { fail, ok, type ApiResult } from "../api/result.ts";
import { REPLY_JSON_SCHEMA } from "./schema.ts";

export interface GeminiConfig {
  apiKey: string;
  model: string;
  /** Tried in order if Google reports the model as not found (models get retired). */
  fallbackModels?: string[];
  baseUrl: string;
  timeoutMs: number;
}

export interface GeminiContent {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

/**
 * Calls Gemini generateContent (REST, v1beta) with a JSON response schema.
 * Docs: https://ai.google.dev/gemini-api/docs/json-mode
 * Returns the parsed JSON object (still unvalidated) or a typed error.
 */
export async function generateJson(
  cfg: GeminiConfig,
  system: string,
  contents: GeminiContent[],
  fetchImpl: typeof fetch = fetch,
): Promise<ApiResult<unknown>> {
  const url = `${cfg.baseUrl.replace(/\/$/, "")}/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent`;
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": cfg.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { responseMimeType: "application/json", responseJsonSchema: REPLY_JSON_SCHEMA },
      }),
      signal: AbortSignal.timeout(cfg.timeoutMs),
      cache: "no-store",
    });
  } catch (err) {
    const name = (err as { name?: string })?.name;
    if (name === "TimeoutError" || name === "AbortError") return fail("UPSTREAM_TIMEOUT", "Gemini timed out");
    return fail("UPSTREAM_ERROR", "Gemini unreachable");
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const msg = String((body as { error?: { message?: string } } | null)?.error?.message ?? "");
    if (res.status === 401 || res.status === 403 || (res.status === 400 && /api key/i.test(msg))) {
      return fail("UNAUTHORIZED", "Gemini API key rejected — check GEMINI_API_KEY");
    }
    if (res.status === 404) return fail("NOT_FOUND", `Gemini model "${cfg.model}" not found`);
    if (res.status === 429) return fail("RATE_LIMITED", "Gemini quota or rate limit reached", { retryAfterSec: 60 });
    return fail("UPSTREAM_ERROR", `Gemini HTTP ${res.status}`);
  }

  const b = body as {
    promptFeedback?: { blockReason?: string };
    candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
  } | null;
  if (b?.promptFeedback?.blockReason) return fail("CONTENT_BLOCKED", `Prompt blocked: ${b.promptFeedback.blockReason}`);
  const cand = b?.candidates?.[0];
  if (!cand) return fail("INVALID_UPSTREAM_DATA", "No candidates");
  if (cand.finishReason && ["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "RECITATION"].includes(cand.finishReason)) {
    return fail("CONTENT_BLOCKED", `Response blocked: ${cand.finishReason}`);
  }
  const text = (cand.content?.parts ?? [])
    .filter((p) => p.thought !== true && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
  if (!text.trim()) return fail("INVALID_UPSTREAM_DATA", `Empty response (finishReason ${cand.finishReason ?? "none"})`);
  try {
    return ok(JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")));
  } catch {
    return fail("INVALID_UPSTREAM_DATA", `Response is not valid JSON (finishReason ${cand.finishReason ?? "none"})`);
  }
}

/** Like generateJson, but moves on to the next model when one is not found. Returns the model that answered. */
export async function generateJsonWithFallback(
  cfg: GeminiConfig,
  system: string,
  contents: GeminiContent[],
  fetchImpl: typeof fetch = fetch,
): Promise<{ result: ApiResult<unknown>; model: string }> {
  const models = [...new Set([cfg.model, ...(cfg.fallbackModels ?? [])])];
  for (const model of models) {
    const result = await generateJson({ ...cfg, model }, system, contents, fetchImpl);
    if (result.ok || result.error.code !== "NOT_FOUND") return { result, model };
  }
  return { result: fail("NOT_CONFIGURED", `None of these Gemini models is available: ${models.join(", ")} — set GEMINI_MODEL`), model: cfg.model };
}
