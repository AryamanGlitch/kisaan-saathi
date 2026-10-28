import { fail, ok, type ApiResult } from "../api/result.ts";
import { DISTRICT_CROP_DATA } from "../crops/data.ts";
import { findDistrictData } from "../crops/engine.ts";
import { grownInDistrict } from "../crops/grown.ts";
import { schemesForState } from "../schemes/data.ts";
import { SOURCES, isSourceId } from "../sources.ts";
import { todayInIndia } from "../time.ts";
import type { WeatherReport } from "../weather/openMeteo.ts";
import { generateJsonWithFallback, type GeminiConfig, type GeminiContent } from "./gemini.ts";
import { classifyMessage, crisisReply, SAFE_DOSE_TEXT, scrubDoses } from "./guard.ts";
import { buildContext, systemInstruction } from "./prompt.ts";
import { modelSafetySignal, parseReply, ReplyFormatError } from "./schema.ts";
import type { AssistantRequest, AssistantResponse, CitedSource } from "./types.ts";

export interface AssistantDeps {
  config: GeminiConfig | null;
  getWeather: (lat: number, lon: number) => Promise<{ report: WeatherReport; fetchedAt: string } | null>;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

function cite(ids: string[]): CitedSource[] {
  return [...new Set(ids)].filter(isSourceId).map((id) => {
    const s = SOURCES[id];
    return { id: s.id, title: s.title, publisher: s.publisher, url: s.url, documentDate: s.documentDate };
  });
}

/** Self-harm or poisoning in the latest message. The route uses this to answer before rate limiting. */
export function safetyClass(req: AssistantRequest): "crisis" | "poisoning" | null {
  const cls = classifyMessage(req.messages[req.messages.length - 1]?.text ?? "");
  return cls === "crisis" || cls === "poisoning" ? cls : null;
}

function safetyResponse(kind: "crisis" | "poisoning", lang: AssistantRequest["lang"], model: string | null): AssistantResponse {
  const reply = crisisReply(kind, lang);
  return { reply, sources: cite(reply.sourceIds), redacted: false, mode: "safety", model, usedContext: { weather: false, sowingWindows: false, schemes: false } };
}

export async function answer(req: AssistantRequest, deps: AssistantDeps): Promise<ApiResult<AssistantResponse>> {
  // Safety first: these never go to the model, and work even without an API key.
  const cls = safetyClass(req);
  if (cls) return ok(safetyResponse(cls, req.lang, null));

  if (!deps.config) return fail("NOT_CONFIGURED", "Set GEMINI_API_KEY on the server to enable the assistant");

  const loc = req.location;
  let weather: { report: WeatherReport; fetchedAt: string } | null = null;
  if (loc && loc.lat !== null && loc.lon !== null) {
    try {
      weather = await deps.getWeather(loc.lat, loc.lon);
    } catch {
      weather = null; // assistant still works; the context says weather is unavailable
    }
  }
  const district = loc ? findDistrictData(loc.state, loc.district, DISTRICT_CROP_DATA) : null;
  const schemes = schemesForState(loc?.state ?? null);
  const now = deps.now ?? (() => new Date());
  const grown = loc ? grownInDistrict(loc.state, loc.district) : null;
  const ctx = buildContext({ todayIst: todayInIndia(now()), request: req, weather, district, schemes, grown });

  // The context is attached to the first user turn so it isn't repeated each time.
  const contents: GeminiContent[] = req.messages.map((m, i) => ({
    role: m.role,
    parts: [{ text: i === 0 ? `${ctx.text}\n\nFARMER: ${m.text}` : m.text }],
  }));

  const { result: res, model: usedModel } = await generateJsonWithFallback(deps.config, systemInstruction(req.lang), contents, deps.fetchImpl);
  if (!res.ok) return res;

  // The keyword check can't know every wording, so the model can flag distress too. Its own text is never shown then.
  const signal = modelSafetySignal(res.data);
  if (signal) return ok(safetyResponse(signal, req.lang, usedModel));

  let reply;
  try {
    reply = parseReply(res.data);
  } catch (err) {
    if (err instanceof ReplyFormatError) return fail("INVALID_UPSTREAM_DATA", `Assistant reply failed validation: ${err.message}`);
    throw err;
  }

  // Keep only citations we actually supplied; drop anything the model made up.
  reply = { ...reply, sourceIds: reply.sourceIds.filter((id) => ctx.allowedSourceIds.includes(id as never)) };
  const scrubbed = scrubDoses(reply, SAFE_DOSE_TEXT[req.lang]);

  return ok({
    reply: scrubbed.reply,
    sources: cite(scrubbed.reply.sourceIds),
    redacted: scrubbed.redacted,
    mode: "gemini",
    model: usedModel,
    usedContext: { weather: weather !== null, sowingWindows: district !== null, schemes: schemes.length > 0 },
  });
}
