/** The 28 states and 8 union territories of India. */
export interface IndianRegion {
  en: string;
  hi: string;
  kind: "state" | "ut";
}

export const INDIA_STATES: readonly IndianRegion[] = [
  { en: "Andhra Pradesh", hi: "आंध्र प्रदेश", kind: "state" },
  { en: "Arunachal Pradesh", hi: "अरुणाचल प्रदेश", kind: "state" },
  { en: "Assam", hi: "असम", kind: "state" },
  { en: "Bihar", hi: "बिहार", kind: "state" },
  { en: "Chhattisgarh", hi: "छत्तीसगढ़", kind: "state" },
  { en: "Goa", hi: "गोवा", kind: "state" },
  { en: "Gujarat", hi: "गुजरात", kind: "state" },
  { en: "Haryana", hi: "हरियाणा", kind: "state" },
  { en: "Himachal Pradesh", hi: "हिमाचल प्रदेश", kind: "state" },
  { en: "Jharkhand", hi: "झारखंड", kind: "state" },
  { en: "Karnataka", hi: "कर्नाटक", kind: "state" },
  { en: "Kerala", hi: "केरल", kind: "state" },
  { en: "Madhya Pradesh", hi: "मध्य प्रदेश", kind: "state" },
  { en: "Maharashtra", hi: "महाराष्ट्र", kind: "state" },
  { en: "Manipur", hi: "मणिपुर", kind: "state" },
  { en: "Meghalaya", hi: "मेघालय", kind: "state" },
  { en: "Mizoram", hi: "मिज़ोरम", kind: "state" },
  { en: "Nagaland", hi: "नागालैंड", kind: "state" },
  { en: "Odisha", hi: "ओडिशा", kind: "state" },
  { en: "Punjab", hi: "पंजाब", kind: "state" },
  { en: "Rajasthan", hi: "राजस्थान", kind: "state" },
  { en: "Sikkim", hi: "सिक्किम", kind: "state" },
  { en: "Tamil Nadu", hi: "तमिलनाडु", kind: "state" },
  { en: "Telangana", hi: "तेलंगाना", kind: "state" },
  { en: "Tripura", hi: "त्रिपुरा", kind: "state" },
  { en: "Uttar Pradesh", hi: "उत्तर प्रदेश", kind: "state" },
  { en: "Uttarakhand", hi: "उत्तराखंड", kind: "state" },
  { en: "West Bengal", hi: "पश्चिम बंगाल", kind: "state" },
  { en: "Andaman and Nicobar Islands", hi: "अंडमान और निकोबार द्वीप समूह", kind: "ut" },
  { en: "Chandigarh", hi: "चंडीगढ़", kind: "ut" },
  { en: "Dadra and Nagar Haveli and Daman and Diu", hi: "दादरा और नगर हवेली और दमन और दीव", kind: "ut" },
  { en: "Delhi", hi: "दिल्ली", kind: "ut" },
  { en: "Jammu and Kashmir", hi: "जम्मू और कश्मीर", kind: "ut" },
  { en: "Ladakh", hi: "लद्दाख", kind: "ut" },
  { en: "Lakshadweep", hi: "लक्षद्वीप", kind: "ut" },
  { en: "Puducherry", hi: "पुडुचेरी", kind: "ut" },
];

/** Lowercase, "&" → "and", drop punctuation and spaces. "Jammu & Kashmir" → "jammuandkashmir". */
export function normalizeRegionName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z]/g, "");
}

// Names that geocoders or people commonly use for the same region.
const ALIASES: Record<string, string> = {
  nctofdelhi: "Delhi",
  nationalcapitalterritoryofdelhi: "Delhi",
  orissa: "Odisha",
  pondicherry: "Puducherry",
  uttaranchal: "Uttarakhand",
};

export function findState(name: string | null | undefined): IndianRegion | null {
  if (!name) return null;
  const key = normalizeRegionName(name);
  if (!key) return null;
  const aliased = ALIASES[key];
  const target = aliased ? normalizeRegionName(aliased) : key;
  return INDIA_STATES.find((s) => normalizeRegionName(s.en) === target) ?? null;
}
