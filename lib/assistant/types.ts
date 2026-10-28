export type ReplyKind = "followup" | "answer" | "out_of_scope" | "crisis";

/** Validated shape of one assistant turn (flat, so it maps 1:1 to the JSON schema sent to Gemini). */
export interface AssistantReply {
  kind: ReplyKind;
  followUpQuestions: string[];
  possibleProblem: string;
  why: string;
  checkNext: string[];
  actions: string[];
  warnings: string[];
  whenToSeeExpert: string;
  sourceIds: string[];
  confidence: "low" | "medium" | "high";
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export interface AssistantRequest {
  lang: "en" | "hi";
  messages: ChatMessage[];
  location: { state: string; district: string; label: string; lat: number | null; lon: number | null } | null;
  farm: { water: "irrigated" | "rainfed" | "unknown"; mainCrop: string | null } | null;
  /** Values the farmer typed from their own Soil Health Card. */
  soil?: { values: Partial<Record<string, number>>; testDate: string | null } | null;
}

export interface CitedSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  documentDate: string | null;
}

export interface AssistantResponse {
  reply: AssistantReply;
  sources: CitedSource[];
  /** true when dose-like text was removed from the model's answer */
  redacted: boolean;
  mode: "gemini" | "safety";
  model: string | null;
  usedContext: { weather: boolean; sowingWindows: boolean; schemes: boolean };
}
