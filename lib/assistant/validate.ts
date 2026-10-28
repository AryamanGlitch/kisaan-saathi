import { findState } from "../location/states.ts";
import { cleanText, isWithinIndiaBounds } from "../location/validate.ts";
import type { AssistantRequest, ChatMessage } from "./types.ts";
import { isSoilCard } from "../soil/shc.ts";

export const MAX_MESSAGES = 12;
export const MAX_MESSAGE_CHARS = 1200;

/** Strict validation of the browser's request body. Returns null when invalid. */
export function parseAssistantRequest(body: unknown): AssistantRequest | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  if (b.lang !== "en" && b.lang !== "hi") return null;
  if (!Array.isArray(b.messages) || b.messages.length === 0 || b.messages.length > MAX_MESSAGES) return null;

  const messages: ChatMessage[] = [];
  for (const m of b.messages) {
    if (typeof m !== "object" || m === null) return null;
    const r = m as Record<string, unknown>;
    if (r.role !== "user" && r.role !== "model") return null;
    if (typeof r.text !== "string") return null;
    const text = r.text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
    if (!text || text.length > MAX_MESSAGE_CHARS) return null;
    messages.push({ role: r.role, text });
  }
  if (messages[messages.length - 1]?.role !== "user") return null;
  for (let i = 1; i < messages.length; i++) if (messages[i]?.role === messages[i - 1]?.role) return null;
  if (messages[0]?.role !== "user") return null;

  let location: AssistantRequest["location"] = null;
  if (b.location !== null && b.location !== undefined) {
    const l = b.location as Record<string, unknown>;
    const state = findState(typeof l.state === "string" ? l.state : null);
    const district = cleanText(l.district, 80);
    const label = cleanText(l.label, 200);
    if (!state || !district || !label) return null;
    const lat = typeof l.lat === "number" ? l.lat : null;
    const lon = typeof l.lon === "number" ? l.lon : null;
    if ((lat === null) !== (lon === null)) return null;
    if (lat !== null && lon !== null && !isWithinIndiaBounds(lat, lon)) return null;
    location = { state: state.en, district, label, lat, lon };
  }

  let farm: AssistantRequest["farm"] = null;
  if (b.farm !== null && b.farm !== undefined) {
    const f = b.farm as Record<string, unknown>;
    if (f.water !== "irrigated" && f.water !== "rainfed" && f.water !== "unknown") return null;
    const mainCrop = typeof f.mainCrop === "string" ? cleanText(f.mainCrop, 40) : null;
    farm = { water: f.water, mainCrop };
  }

  let soil: AssistantRequest["soil"] = null;
  if (b.soil !== null && b.soil !== undefined) {
    const sc = { version: 1, savedAt: "x", ...(b.soil as object) };
    if (!isSoilCard(sc)) return null;
    soil = { values: sc.values, testDate: sc.testDate };
  }

  return { lang: b.lang, messages, location, farm, soil };
}
