import type { AssistantReply, ReplyKind } from "./types.ts";

/** JSON Schema passed to Gemini as responseJsonSchema. */
export const REPLY_JSON_SCHEMA = {
  type: "object",
  properties: {
    kind: { type: "string", enum: ["followup", "answer", "out_of_scope"] },
    followUpQuestions: { type: "array", items: { type: "string" }, maxItems: 3 },
    possibleProblem: { type: "string" },
    why: { type: "string" },
    checkNext: { type: "array", items: { type: "string" } },
    actions: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } },
    whenToSeeExpert: { type: "string" },
    sourceIds: { type: "array", items: { type: "string" } },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
  },
  required: ["kind", "followUpQuestions", "possibleProblem", "why", "checkNext", "actions", "warnings", "whenToSeeExpert", "sourceIds", "confidence"],
} as const;

export class ReplyFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReplyFormatError";
  }
}

const MAX_STR = 700;
const MAX_ITEMS = 6;

function str(v: unknown, field: string): string {
  if (typeof v !== "string") throw new ReplyFormatError(`${field} must be a string`);
  return v.trim().slice(0, MAX_STR);
}

function strList(v: unknown, field: string, max = MAX_ITEMS): string[] {
  if (!Array.isArray(v)) throw new ReplyFormatError(`${field} must be an array`);
  return v
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim().slice(0, MAX_STR))
    .filter(Boolean)
    .slice(0, max);
}

/** Validates model output. Throws ReplyFormatError instead of guessing missing parts. */
export function parseReply(raw: unknown): AssistantReply {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new ReplyFormatError("not an object");
  const r = raw as Record<string, unknown>;
  const kinds: ReplyKind[] = ["followup", "answer", "out_of_scope"];
  if (!kinds.includes(r.kind as ReplyKind)) throw new ReplyFormatError("bad kind");
  const confidence = r.confidence === "medium" || r.confidence === "high" ? r.confidence : "low";
  const reply: AssistantReply = {
    kind: r.kind as ReplyKind,
    followUpQuestions: strList(r.followUpQuestions, "followUpQuestions", 3),
    possibleProblem: str(r.possibleProblem, "possibleProblem"),
    why: str(r.why, "why"),
    checkNext: strList(r.checkNext, "checkNext"),
    actions: strList(r.actions, "actions"),
    warnings: strList(r.warnings, "warnings"),
    whenToSeeExpert: str(r.whenToSeeExpert, "whenToSeeExpert"),
    sourceIds: strList(r.sourceIds, "sourceIds", 10),
    confidence,
  };
  if (reply.kind === "followup" && reply.followUpQuestions.length === 0) throw new ReplyFormatError("followup without questions");
  if (reply.kind === "answer" && !reply.possibleProblem && reply.actions.length === 0 && reply.checkNext.length === 0) {
    throw new ReplyFormatError("empty answer");
  }
  return reply;
}

/** Plain-text version of a reply, sent back as history on the next turn. */
export function replyToHistoryText(r: AssistantReply): string {
  if (r.kind === "followup") return r.followUpQuestions.join(" ");
  return [r.possibleProblem, r.why, ...r.checkNext, ...r.actions, ...r.warnings, r.whenToSeeExpert].filter(Boolean).join(" ").slice(0, 1500);
}
