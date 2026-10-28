import type { AssistantReply } from "./types.ts";

/**
 * Safety checks around the model.
 * - classifyMessage: routes self-harm / poisoning messages to a fixed help response (no model call).
 * - scrubDoses: removes dose-like text (amount + unit per area/volume) from model output,
 *   because the app has no verified pesticide/fertilizer dosage database.
 */
export type MessageClass = "crisis" | "poisoning" | "chemical" | "normal";

const CRISIS = [
  /\b(kill|end)\s+(myself|my life)\b/i,
  /\bsuicid/i,
  /\bwant to die\b/i,
  /आत्महत्या/,
  /ख़ुदकुशी|खुदकुशी/,
  /जान\s*दे\s*(दूँ|दूं|दूंगा|दूँगा|दूंगी|दूँगी|दे)/,
  /मरना\s*चाहत/,
  /जीना\s*नहीं\s*चाहत/,
  /\b(khudkushi|aatmahatya|atmahatya)\b/i,
];

const POISONING = [
  /\b(drank|swallowed|ate|drink|swallow)\b.*\b(pesticide|insecticide|poison|weedicide|herbicide)\b/i,
  /\b(pesticide|insecticide|chemical)\s+poisoning\b/i,
  /(कीटनाशक|ज़हर|जहर|दवा).*(पी\s*लिया|पी\s*ली|पी\s*गया|पी\s*गई|निगल)/,
  /(पी\s*लिया|पी\s*ली|निगल\s*लिया).*(कीटनाशक|ज़हर|जहर)/,
  /\bzeh?ar\s+pi\b/i,
];

const CHEMICAL = [
  /\b(pesticide|insecticide|fungicide|herbicide|weedicide|spray|dose|dosage|ml|litre|liter|mix|tank)\b/i,
  /कीटनाशक|फफूंदनाशक|खरपतवारनाशक|दवा|छिड़काव|स्प्रे|मात्रा|घोल|मिलाकर/,
];

export function classifyMessage(text: string): MessageClass {
  if (CRISIS.some((r) => r.test(text))) return "crisis";
  if (POISONING.some((r) => r.test(text))) return "poisoning";
  if (CHEMICAL.some((r) => r.test(text))) return "chemical";
  return "normal";
}

const UNIT = "(?:ml|मिली|मि\\.ली\\.|g|gm|gms|gram|grams|ग्राम|kg|किलो|किग्रा|l|lt|ltr|litre|liter|litres|liters|लीटर|%|ppm|tablet|packet|पैकेट)";
const PER = "(?:/|per|प्रति|पर)";
const AREA_OR_VOL = "(?:l|lt|ltr|litre|liter|लीटर|acre|acres|एकड़|ha|hectare|hectares|हेक्टेयर|bigha|बीघा|nali|नाली|tank|टंकी|pump|पंप|plant|पौधा|पौधे|tree|पेड़|kg\\s*seed|किलो\\s*बीज)";

/** amount + unit + "per" + area/volume, e.g. "2 ml/litre", "120 kg per hectare", "2 मिली प्रति लीटर", "@ 0.2% घोल" */
const DOSE_PATTERNS = [
  new RegExp(`\\d+(?:[.,]\\d+)?\\s*${UNIT}\\s*${PER}\\s*${AREA_OR_VOL}`, "i"),
  new RegExp(`@\\s*\\d+(?:[.,]\\d+)?\\s*${UNIT}`, "i"),
  /\d+(?:[.,]\d+)?\s*%\s*(?:solution|spray|w\/v|ec|sc|wp|घोल|छिड़काव)/i,
];

export function containsDose(s: string): boolean {
  return DOSE_PATTERNS.some((r) => r.test(s));
}

/** Replace any list item or field containing a dose with `replacement`. */
export function scrubDoses(reply: AssistantReply, replacement: string): { reply: AssistantReply; redacted: boolean } {
  let redacted = false;
  const fix = (s: string) => {
    if (containsDose(s)) {
      redacted = true;
      return replacement;
    }
    return s;
  };
  const dedupe = (xs: string[]) => [...new Set(xs.map(fix))];
  const out: AssistantReply = {
    ...reply,
    possibleProblem: fix(reply.possibleProblem),
    why: fix(reply.why),
    checkNext: dedupe(reply.checkNext),
    actions: dedupe(reply.actions),
    warnings: dedupe(reply.warnings),
    whenToSeeExpert: fix(reply.whenToSeeExpert),
    followUpQuestions: reply.followUpQuestions.map(fix),
  };
  return { reply: out, redacted };
}

export const SAFE_DOSE_TEXT = {
  en: "For the exact product and amount, use only a product whose label lists your crop and pest, follow its label, and confirm with your KVK or Kisan Call Centre (1800-180-1551).",
  hi: "सही दवा और मात्रा के लिए केवल वही उत्पाद लें जिसके लेबल पर आपकी फसल और कीट/रोग लिखा हो, लेबल के अनुसार ही उपयोग करें, और अपने KVK या किसान कॉल सेंटर (1800-180-1551) से पुष्टि करें।",
};

export function crisisReply(kind: "crisis" | "poisoning", lang: "en" | "hi"): AssistantReply {
  const en = {
    crisis: {
      problem: "It sounds like you are going through something very hard. You do not have to face it alone.",
      actions: [
        "Call Tele-MANAS, the government's free mental health helpline, any time: 14416 (or 1-800-891-4416).",
        "If you are in danger right now, call 112.",
        "Talk to someone you trust today — a family member, friend or the village ASHA worker.",
      ],
      warnings: ["Keep pesticides and other poisons locked away and out of reach."],
    },
    poisoning: {
      problem: "Pesticide poisoning is a medical emergency.",
      actions: [
        "Call 112 now, or take the person to the nearest hospital immediately.",
        "Take the pesticide container or label with you to show the doctor.",
        "Do not wait for symptoms to get worse.",
      ],
      warnings: ["Do not give anything by mouth unless a doctor tells you to."],
    },
  } as const;
  const hi = {
    crisis: {
      problem: "लगता है आप बहुत मुश्किल समय से गुज़र रहे हैं। आपको यह अकेले नहीं झेलना है।",
      actions: [
        "सरकार की मुफ़्त मानसिक स्वास्थ्य हेल्पलाइन टेली-मानस पर कभी भी कॉल करें: 14416 (या 1-800-891-4416)।",
        "अगर अभी खतरा है तो 112 पर कॉल करें।",
        "आज ही किसी भरोसेमंद व्यक्ति से बात करें — परिवार, दोस्त या गाँव की आशा कार्यकर्ता।",
      ],
      warnings: ["कीटनाशक और दूसरे ज़हर ताले में और पहुँच से दूर रखें।"],
    },
    poisoning: {
      problem: "कीटनाशक से ज़हर होना एक मेडिकल इमरजेंसी है।",
      actions: [
        "अभी 112 पर कॉल करें, या व्यक्ति को तुरंत नज़दीकी अस्पताल ले जाएँ।",
        "डॉक्टर को दिखाने के लिए कीटनाशक का डिब्बा या लेबल साथ ले जाएँ।",
        "लक्षण बढ़ने का इंतज़ार न करें।",
      ],
      warnings: ["डॉक्टर के कहे बिना मुँह से कुछ न दें।"],
    },
  } as const;
  const t = (lang === "hi" ? hi : en)[kind];
  return {
    kind: "crisis",
    followUpQuestions: [],
    possibleProblem: t.problem,
    why: "",
    checkNext: [],
    actions: [...t.actions],
    warnings: [...t.warnings],
    whenToSeeExpert: "",
    sourceIds: ["telemanas-vikaspedia"],
    confidence: "high",
  };
}
