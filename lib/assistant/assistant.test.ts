import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyMessage, containsDose, scrubDoses, SAFE_DOSE_TEXT } from "./guard.ts";
import { parseReply, ReplyFormatError, replyToHistoryText } from "./schema.ts";
import { parseAssistantRequest } from "./validate.ts";
import { buildContext, systemInstruction } from "./prompt.ts";
import { generateJson } from "./gemini.ts";
import { answer } from "./service.ts";
import { DISTRICT_CROP_DATA } from "../crops/data.ts";
import { SCHEMES } from "../schemes/data.ts";
import { parseForecast } from "../weather/openMeteo.ts";
import { makeForecastJson } from "../../test/fixtures/openMeteo.ts";
import { hangingFetch } from "../../test/fixtures/hangingFetch.ts";
import type { AssistantReply, AssistantRequest } from "./types.ts";

const goodReply = {
  kind: "answer", followUpQuestions: [], possibleProblem: "May be nitrogen shortage.", why: "Lower leaves yellow first.",
  checkNext: ["Look at older leaves"], actions: ["Get a soil test"], warnings: [], whenToSeeExpert: "If it spreads, call KVK.",
  sourceIds: ["kcc-mkisan", "made-up-source"], confidence: "medium",
};
const req = (text: string, extra: Partial<AssistantRequest> = {}): AssistantRequest => ({
  lang: "en", messages: [{ role: "user", text }],
  location: { state: "Uttarakhand", district: "Dehradun", label: "Rampur, Dehradun, Uttarakhand", lat: 30.3, lon: 78.0 },
  farm: null, ...extra,
});
const cfg = { apiKey: "test-key", model: "gemini-3.5-flash", baseUrl: "https://generativelanguage.googleapis.com", timeoutMs: 50 };
const geminiOk = (obj: unknown, extra: Record<string, unknown> = {}): typeof fetch => async () =>
  Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "thinking…", thought: true }, { text: JSON.stringify(obj) }] } }], ...extra });

test("message classification (English and Hindi)", () => {
  assert.equal(classifyMessage("I want to kill myself"), "crisis");
  assert.equal(classifyMessage("मैं आत्महत्या करना चाहता हूँ"), "crisis");
  assert.equal(classifyMessage("मेरे पिता ने कीटनाशक पी लिया"), "poisoning");
  assert.equal(classifyMessage("my brother swallowed pesticide"), "poisoning");
  assert.equal(classifyMessage("how many ml of pesticide per litre"), "chemical");
  assert.equal(classifyMessage("गेहूँ में कौन सी दवा डालें"), "chemical");
  assert.equal(classifyMessage("my wheat leaves are turning yellow"), "normal");
});

test("dose detection catches common formats and ignores ordinary numbers", () => {
  for (const s of ["Spray 2 ml/litre", "use 120 kg per hectare", "2 मिली प्रति लीटर पानी", "@ 2.5 g", "0.2% solution", "250 ग्राम प्रति एकड़"]) assert.ok(containsDose(s), s);
  for (const s of ["Check 10 plants in a row", "Rain chance 60% tomorrow", "Call 1800-180-1551"]) assert.ok(!containsDose(s), s);
});

test("scrubDoses replaces dose items and reports it", () => {
  const r = scrubDoses({ ...(goodReply as AssistantReply), actions: ["Spray 2 ml/litre of X", "Remove sick plants"] }, SAFE_DOSE_TEXT.en);
  assert.equal(r.redacted, true);
  assert.equal(r.reply.actions[0], SAFE_DOSE_TEXT.en);
  assert.equal(r.reply.actions[1], "Remove sick plants");
});

test("parseReply validates and caps; rejects malformed", () => {
  const r = parseReply(goodReply);
  assert.equal(r.kind, "answer");
  assert.ok(replyToHistoryText(r).includes("nitrogen"));
  assert.throws(() => parseReply({ ...goodReply, kind: "poem" }), ReplyFormatError);
  assert.throws(() => parseReply({ ...goodReply, actions: "x" }), ReplyFormatError);
  assert.throws(() => parseReply({ ...goodReply, kind: "followup", followUpQuestions: [] }), ReplyFormatError);
  assert.throws(() => parseReply(null), ReplyFormatError);
  assert.equal(parseReply({ ...goodReply, followUpQuestions: ["a", "b", "c", "d"] }).followUpQuestions.length, 3);
});

test("request validation", () => {
  assert.ok(parseAssistantRequest(req("hello")));
  assert.equal(parseAssistantRequest({ ...req("hi"), lang: "fr" }), null);
  assert.equal(parseAssistantRequest({ ...req("hi"), messages: [] }), null);
  assert.equal(parseAssistantRequest({ ...req("x".repeat(1201)) }), null);
  assert.equal(parseAssistantRequest({ ...req("hi"), messages: [{ role: "user", text: "a" }, { role: "user", text: "b" }] }), null, "roles must alternate");
  assert.equal(parseAssistantRequest({ ...req("hi"), messages: [{ role: "user", text: "a" }, { role: "model", text: "b" }] }), null, "must end with user");
  assert.equal(parseAssistantRequest({ ...req("hi"), location: { state: "Atlantis", district: "x", label: "x", lat: null, lon: null } }), null);
  assert.equal(parseAssistantRequest({ ...req("hi"), location: { state: "Goa", district: "x", label: "x", lat: 51, lon: 0 } }), null);
});

test("prompt: rules present; context includes verified facts and the allowed source ids", () => {
  const sys = systemInstruction("hi");
  assert.match(sys, /Hindi/);
  assert.match(sys, /Never name pesticide/);
  const ctx = buildContext({
    todayIst: "2026-10-26", request: req("x"), weather: { report: parseForecast(makeForecastJson()), fetchedAt: "2026-10-26T08:00:00Z" },
    district: DISTRICT_CROP_DATA[0]!, schemes: SCHEMES,
  });
  assert.match(ctx.text, /Rabi, irrigated: October – December/);
  assert.match(ctx.text, /NOT an official IMD warning/);
  assert.match(ctx.text, /₹6,000/);
  assert.ok(ctx.allowedSourceIds.includes("crida-dehradun"));
  assert.ok(ctx.allowedSourceIds.includes("open-meteo"));
  const noData = buildContext({ todayIst: "2026-10-26", request: req("x", { location: null }), weather: null, district: null, schemes: [] });
  assert.match(noData.text, /Do not state any weather values/);
  assert.match(noData.text, /no verified data/);
});

test("Gemini client: sends key in header, filters thought parts, maps errors", async () => {
  let seen: { url: string; key: string | null; body: Record<string, unknown> } | null = null;
  const spy: typeof fetch = async (u, init) => {
    seen = { url: String(u), key: new Headers(init?.headers).get("x-goog-api-key"), body: JSON.parse(String(init?.body)) };
    return geminiOk(goodReply)(u, init);
  };
  const r = await generateJson(cfg, "sys", [{ role: "user", parts: [{ text: "q" }] }], spy);
  assert.ok(r.ok);
  assert.equal(seen!.key, "test-key");
  assert.ok(!seen!.url.includes("test-key"), "key must not be in the URL");
  assert.match(seen!.url, /models\/gemini-3\.5-flash:generateContent$/);
  assert.equal((seen!.body.generationConfig as Record<string, unknown>).responseMimeType, "application/json");

  const status = (code: number, msg = "") => async () => Response.json({ error: { message: msg } }, { status: code });
  const code = async (f: typeof fetch) => { const x = await generateJson(cfg, "s", [], f); return x.ok ? "OK" : x.error.code; };
  assert.equal(await code(status(403)), "UNAUTHORIZED", "rejected key is distinct from a missing key");
  assert.equal(await code(status(400, "API key not valid")), "UNAUTHORIZED");
  assert.equal(await code(status(404)), "NOT_FOUND");
  assert.equal(await code(status(429)), "RATE_LIMITED");
  assert.equal(await code(status(503)), "UPSTREAM_ERROR");
  assert.equal(await code(hangingFetch), "UPSTREAM_TIMEOUT");
  assert.equal(await code(async () => Response.json({ promptFeedback: { blockReason: "SAFETY" } })), "CONTENT_BLOCKED");
  assert.equal(await code(async () => Response.json({ candidates: [{ finishReason: "SAFETY", content: { parts: [] } }] })), "CONTENT_BLOCKED");
  assert.equal(await code(async () => Response.json({ candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: "{\"kind\":" }] } }] })), "INVALID_UPSTREAM_DATA");
  assert.equal(await code(async () => new Response("<html>", { status: 200 })), "INVALID_UPSTREAM_DATA");
});

test("service: crisis messages never reach the model and work without a key", async () => {
  let called = false;
  const r = await answer(req("I want to end my life"), { config: null, getWeather: async () => null, fetchImpl: async () => { called = true; return new Response(); } });
  assert.ok(r.ok);
  assert.equal(r.data.mode, "safety");
  assert.match(r.data.reply.actions.join(" "), /14416/);
  assert.equal(called, false);
});

test("service: missing key → NOT_CONFIGURED", async () => {
  const r = await answer(req("my wheat is yellow"), { config: null, getWeather: async () => null });
  assert.equal(r.ok ? null : r.error.code, "NOT_CONFIGURED");
});

test("service: drops invented citations, scrubs doses, survives weather failure", async () => {
  const reply = { ...goodReply, actions: ["Spray 2 ml/litre", "Remove sick plants"] };
  const r = await answer(req("my wheat is yellow"), {
    config: cfg,
    getWeather: async () => { throw new Error("weather down"); },
    fetchImpl: geminiOk(reply),
  });
  assert.ok(r.ok);
  assert.deepEqual(r.data.sources.map((s) => s.id), ["kcc-mkisan"]);
  assert.equal(r.data.redacted, true);
  assert.equal(r.data.usedContext.weather, false);
  assert.equal(r.data.usedContext.sowingWindows, true);
});

test("service: malformed model output → INVALID_UPSTREAM_DATA", async () => {
  const r = await answer(req("my wheat is yellow"), { config: cfg, getWeather: async () => null, fetchImpl: geminiOk({ kind: "answer" }) });
  assert.equal(r.ok ? null : r.error.code, "INVALID_UPSTREAM_DATA");
});

test("soil card: validated in requests and included in context with official ratings", () => {
  const good = parseAssistantRequest({ ...req("x"), soil: { values: { ph: 8.2, n: 200 }, testDate: "2025-11-02" } });
  assert.ok(good?.soil);
  assert.equal(parseAssistantRequest({ ...req("x"), soil: { values: { ph: 99 }, testDate: null } }), null);
  const ctx = buildContext({ todayIst: "2026-10-26", request: good!, weather: null, district: null, schemes: [] });
  assert.match(ctx.text, /pH 8.2 = alkaline; Nitrogen \(N\) 200 kg\/ha = low/);
  assert.ok(ctx.allowedSourceIds.includes("iiss-shc-limits"));
});

import { generateJsonWithFallback } from "./gemini.ts";
test("model fallback: a retired model moves on to the next; all missing → NOT_CONFIGURED", async () => {
  const seen: string[] = [];
  const f = (okModel: string | null): typeof fetch => async (u) => {
    const m = /models\/([^:]+):/.exec(String(u))![1]!; seen.push(m);
    return m === okModel ? geminiOk(goodReply)(u) : Response.json({ error: { message: "not found" } }, { status: 404 });
  };
  const c = { ...cfg, model: "gemini-old", fallbackModels: ["gemini-3.8-flash", "gemini-3.6-flash"] };
  const r = await generateJsonWithFallback(c, "s", [], f("gemini-3.8-flash"));
  assert.ok(r.result.ok); assert.equal(r.model, "gemini-3.8-flash"); assert.deepEqual(seen, ["gemini-old", "gemini-3.8-flash"]);
  const none = await generateJsonWithFallback(c, "s", [], f(null));
  assert.equal(none.result.ok ? null : none.result.error.code, "NOT_CONFIGURED");
  const ans = await answer(req("my wheat is yellow"), { config: c, getWeather: async () => null, fetchImpl: f("gemini-3.8-flash") });
  assert.ok(ans.ok && ans.data.model === "gemini-3.8-flash", "reports the model that answered");
});

import { grownInDistrict } from "../crops/grown.ts";
test("context lists the crops grown in the district with their source", () => {
  const ctx = buildContext({ todayIst: "2026-10-27", request: req("x"), weather: null, district: null, schemes: [], grown: grownInDistrict("Uttarakhand", "Almora") });
  assert.match(ctx.text, /Major crops grown in Almora .*Finger millet/);
  assert.ok(ctx.allowedSourceIds.includes("crida-almora"));
});
