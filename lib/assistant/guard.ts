import type { AssistantReply } from "./types.ts";

/**
 * Safety checks around the model.
 * - classifyMessage: routes self-harm / poisoning messages to a fixed help response (no model call).
 * - scrubDoses: removes dose-like text (amount + unit per area/volume) from model output,
 *   because the app has no verified pesticide/fertilizer dosage database.
 */
export type MessageClass = "crisis" | "poisoning" | "chemical" | "normal";

/**
 * CRISIS and POISONING run on normalize()d text: lower case, nukta removed (ज़हर → जहर), chandrabindu → anusvara
 * (हूँ → हूं). So patterns are written without nukta or chandrabindu. \b does not work next to Devanagari, so
 * Hindi patterns don't use it. Missing a real crisis is far worse than showing a helpline by mistake, but
 * ordinary farm questions ("Can I eat vegetables after spraying?", "फसल मर रही है") must not match.
 */
const POISON_EN = "(?:pesticides?|insecticides?|poison|weedicides?|herbicides?|rat\\s*poison|sulphas|sulfas|celphos|phosphide)";
const POISON_HI = "(?:कीटनाशक|जहर|सल्फास|सेल्फास|सेल्फॉस|चूहे\\s*मार)";
const POISON_ROMAN = "(?:zeh?e?r|zahar|jahar|keetnashak|kitnashak|sulphas|sulfas|celphos|selfas)";

const CRISIS = [
  /\b(kill|hang|hurt|harm|end)(ing)?\s+(myself|my\s*self|my\s+life)\b/,
  /\bsuicid/,
  /\b(want|wanna)\s+(to\s+)?die\b/,
  /\bi\s*('?m|am)?\s+(going|ready|wish)\s+to\s+die\b|\bwish\s+i\s+(was|were)\s+dead\b/,
  /\b(don'?t|do not|no longer)\s+want\s+to\s+(live|be alive)\b/,
  /\b(take|end)\s+my\s+(own\s+)?life\b/,
  /\b(better off dead|end it all|no reason to live)\b/,
  new RegExp(`\\b(i'?ll|i will|i am going to|i'?m going to|gonna)\\s+(drink|eat|swallow|take|consume)\\s+(some\\s+|the\\s+)?${POISON_EN}`),
  /आत्महत्या|खुदकुशी/,
  /जान\s+दे|जान\s*दे(ना|नी|ने|\s*दू)|अपनी\s+जान\s+ले/,
  /मरना\s*चाह|मर\s*जाना\s*चाह|मर\s*जाऊं|मरने\s*(का|की)\s*(मन|इच्छा|सोच)/,
  /जीना\s*नहीं\s*चाह|जीने\s*(का|की)\s*(मन|इच्छा)\s*नहीं|जीने\s*का\s*कोई\s*(मतलब|फायदा)\s*नहीं/,
  /फांसी\s*(लगा|पर\s*लटक)|खुद\s*को\s*(मार|खत्म)/,
  new RegExp(`${POISON_HI}\\s*(खा|पी)\\s*(लूंगा|लूंगी|लूं|लेना\\s*चाह)`),
  /\b(khudkh?ushi|aa?tmahatya)\b/,
  /\bmar\s*(jaa?(un|oon|on|u)(ga|gi)?|jaa?na\s*chah|na\s*chah)/,
  /\b(jeena|jina|jeene|jine)\s*(ka\s*(man|mann)\s*)?nahi/,
  /\bjaan\s*(de\s*(du|doon|dun)|dena|dedu)|\bapni\s+jaan\s+le/,
  /\b(f|ph)aa?nsi\s*(laga|par\s*latak)/,
  new RegExp(`\\b${POISON_ROMAN}\\s*(pi|pee|kha)\\s*(lunga|lungi|loonga|lu|loon)\\b`),
];

// The poison must follow the verb closely: "insects ate leaves after pesticide" or "पानी पी लिया फिर दवा छिड़की"
// are not poisoning. "दवा खा ली" / "dawa kha li" usually means taking medicine, so दवा/spray only count with "drink".
const DET_EN = "(?:some\\s+|the\\s+|a\\s+|a\\s+little\\s+|little\\s+|that\\s+)?";
const NEAR_HI = "\\s*(?:\\S+\\s+)?";

const POISONING = [
  new RegExp(`\\b(drank|drunk|swallowed|consumed|ate|eaten)\\s+${DET_EN}${POISON_EN}`),
  // "took pesticide to the field" is ordinary; "took poison / sulphas" is not.
  new RegExp(`\\b(took|taken)\\s+${DET_EN}(poison|rat\\s*poison|sulphas|sulfas|celphos|phosphide)\\b`),
  new RegExp(`\\b(drank|drunk|swallowed)\\s+${DET_EN}(spray|chemical|dawa|dawai)\\b`),
  /\b(pesticide|insecticide|chemical)\s+poisoning\b/,
  new RegExp(`(${POISON_HI}|दवा|दवाई|स्प्रे)${NEAR_HI}(पी\\s*(लिया|ली|लिए|गया|गई)|पीकर|निगल)`),
  new RegExp(`(पी|निगल)\\s*(लिया|ली)${NEAR_HI}${POISON_HI}`),
  new RegExp(`${POISON_HI}${NEAR_HI}(खा\\s*(लिया|ली|लिए|गया|गई)|खाकर)`),
  new RegExp(`\\b${POISON_ROMAN}\\s*(pi|pee|kha)\\s*(liya|li|liye|gaya|gayi|gai|kar)\\b`),
  /\b(dawa|dawai|spray)\s*(pi|pee)\s*(liya|li|liye|gaya|gayi|gai|kar)\b/,
  /\bzeh?ar\s+pi\b/,
];

/** Lower case, NFC, nukta removed, chandrabindu → anusvara, zero-width joiners removed, curly apostrophes straightened. */
export function normalize(text: string): string {
  return text
    .normalize("NFC")
    .replace(/़/g, "")
    .replace(/ँ/g, "ं")
    .replace(/[‌‍]/g, "")
    .replace(/[‘’]/g, "'")
    .toLowerCase();
}

const CHEMICAL = [
  /\b(pesticide|insecticide|fungicide|herbicide|weedicide|spray|dose|dosage|ml|litre|liter|mix|tank)\b/i,
  /कीटनाशक|फफूंदनाशक|खरपतवारनाशक|दवा|छिड़काव|स्प्रे|मात्रा|घोल|मिलाकर/,
];

export function classifyMessage(text: string): MessageClass {
  const n = normalize(text);
  if (CRISIS.some((r) => r.test(n))) return "crisis";
  if (POISONING.some((r) => r.test(n))) return "poisoning";
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
