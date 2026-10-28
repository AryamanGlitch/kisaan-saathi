/**
 * Cleans up a pasted Gemini API key and checks its shape.
 * Since June 2026 Google AI Studio issues "auth keys" starting with "AQ." (they contain dots);
 * older "standard" keys start with "AIza" and are rejected by the Gemini API from September 2026.
 * Source: https://ai.google.dev/gemini-api/docs/api-key
 * The real test is a call to Google; this only catches obvious paste mistakes.
 */
export type KeyKind = "auth" | "standard" | "unknown";
export type KeyCheck = { ok: true; key: string; kind: KeyKind } | { ok: false; reason: "empty" | "not-a-key" };

export function normalizeApiKey(raw: string): KeyCheck {
  let k = raw
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\u2060\uFEFF\u00A0]/g, "") // invisible characters from copy/paste
    .replace(/\s+/g, "") // spaces and line breaks (wrapped text)
    .trim();
  k = k.replace(/^(?:export)?(?:GEMINI_API_KEY|GOOGLE_API_KEY|API_KEY|key)[:=]/i, "");
  k = k.replace(/^["'`]+|["'`;,]+$/g, "");
  if (!k) return { ok: false, reason: "empty" };
  if (k.length < 20 || k.length > 512 || /^https?:/i.test(k) || !/^[A-Za-z0-9._~+/=-]+$/.test(k)) return { ok: false, reason: "not-a-key" };
  const kind: KeyKind = k.startsWith("AQ.") ? "auth" : k.startsWith("AIza") ? "standard" : "unknown";
  return { ok: true, key: k, kind };
}
