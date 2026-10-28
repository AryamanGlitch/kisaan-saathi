import type { SchemeRecord } from "./types.ts";

/**
 * VERIFIED SCHEME REGISTRY. Every figure here is from the cited official source.
 * Do not add amounts, deadlines or eligibility rules without a source. See docs/DATA_SOURCES.md.
 * No state schemes are included yet: none were verified in this build.
 */
export const SCHEMES: SchemeRecord[] = [
  {
    id: "pm-kisan",
    level: "central",
    states: "all",
    category: "income",
    name: { en: "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)", hi: "पीएम-किसान (प्रधानमंत्री किसान सम्मान निधि)" },
    summary: {
      en: "Income support paid directly into the bank accounts of eligible landholding farmer families.",
      hi: "पात्र भूमिधारक किसान परिवारों के बैंक खाते में सीधे आय सहायता।",
    },
    benefits: {
      en: "₹6,000 per year, paid in three equal instalments of ₹2,000, every four months.",
      hi: "हर साल ₹6,000, चार-चार महीने पर ₹2,000 की तीन बराबर किस्तों में।",
    },
    eligibility: {
      en: "Landholding farmer families, except those in the scheme's exclusion categories (for example, institutional landholders and some higher-income groups). Your state or UT government identifies eligible families.",
      hi: "भूमिधारक किसान परिवार, योजना की अपवर्जन श्रेणियों को छोड़कर (जैसे संस्थागत भूमिधारक और कुछ अधिक आय वाले वर्ग)। पात्र परिवारों की पहचान राज्य/केंद्र शासित प्रदेश सरकार करती है।",
    },
    documents: {
      en: "Aadhaar number and bank account details. No payment is made without bank details.",
      hi: "आधार नंबर और बैंक खाते का विवरण। बैंक विवरण के बिना भुगतान नहीं होता।",
    },
    howToApply: {
      en: "Use 'New Farmer Registration' on the PM-KISAN portal, or ask your local agriculture office. You can check your status on the portal.",
      hi: "पीएम-किसान पोर्टल पर 'New Farmer Registration' से पंजीकरण करें, या अपने कृषि कार्यालय से पूछें। अपनी स्थिति पोर्टल पर देख सकते हैं।",
    },
    applyUrl: "https://pmkisan.gov.in/RegistrationFormnew.aspx",
    sourceIds: ["pmkisan-pib-faq", "pmkisan-portal"],
    lastVerified: "2026-10-26",
    status: "verified",
    statusNote: null,
    watchUrls: ["https://pmkisan.gov.in/"],
  },
  {
    id: "pmfby",
    level: "central",
    states: "all",
    category: "insurance",
    name: { en: "PMFBY (Pradhan Mantri Fasal Bima Yojana)", hi: "पीएमएफबीवाई (प्रधानमंत्री फसल बीमा योजना)" },
    summary: {
      en: "Crop insurance for notified crops in notified areas.",
      hi: "अधिसूचित क्षेत्रों में अधिसूचित फसलों का बीमा।",
    },
    benefits: {
      en: "You pay at most 2% of the sum insured for Kharif food and oilseed crops, 1.5% for Rabi food and oilseed crops, and 5% for annual commercial and horticultural crops (or the actuarial rate if lower). The government pays the rest of the premium.",
      hi: "आप बीमित राशि का अधिकतम 2% (खरीफ खाद्यान्न व तिलहन), 1.5% (रबी खाद्यान्न व तिलहन) और 5% (वार्षिक व्यावसायिक व बागवानी फसलें) देते हैं, या बीमांकिक दर अगर कम हो। बाकी प्रीमियम सरकार देती है।",
    },
    eligibility: {
      en: "Farmers growing notified crops in notified areas. Which crops and areas are notified is decided each season — check on the portal or with your bank.",
      hi: "अधिसूचित क्षेत्रों में अधिसूचित फसल उगाने वाले किसान। कौन सी फसलें व क्षेत्र अधिसूचित हैं, यह हर मौसम तय होता है — पोर्टल या अपने बैंक से जाँचें।",
    },
    documents: null,
    howToApply: {
      en: "Enrol on pmfby.gov.in, or ask your bank or agriculture office. Enrolment last dates differ by state and season — confirm them before the season starts.",
      hi: "pmfby.gov.in पर नामांकन करें, या अपने बैंक या कृषि कार्यालय से पूछें। अंतिम तिथि राज्य और मौसम के हिसाब से अलग होती है — मौसम शुरू होने से पहले पता कर लें।",
    },
    applyUrl: "https://pmfby.gov.in/",
    sourceIds: ["pmfby-pib-faq", "pmfby-portal"],
    lastVerified: "2026-10-26",
    status: "verified",
    statusNote: null,
    watchUrls: ["https://pmfby.gov.in/"],
  },
  {
    id: "kcc-miss",
    level: "central",
    states: "all",
    category: "credit",
    name: { en: "Kisan Credit Card — interest support (MISS)", hi: "किसान क्रेडिट कार्ड — ब्याज सहायता (MISS)" },
    summary: {
      en: "Short-term crop loans through a Kisan Credit Card at a reduced interest rate.",
      hi: "किसान क्रेडिट कार्ड से कम ब्याज पर अल्पकालिक फसल ऋण।",
    },
    benefits: {
      en: "For FY 2025-26: loans up to ₹3 lakh at 7% interest; repaying on time earns a further 3% incentive, so the effective rate is 4%.",
      hi: "वित्त वर्ष 2025-26 के लिए: ₹3 लाख तक का ऋण 7% ब्याज पर; समय पर चुकाने पर 3% प्रोत्साहन, यानी असल दर 4%।",
    },
    eligibility: null,
    documents: null,
    howToApply: {
      en: "Apply at your bank. Ask the bank for the current loan limit and interest rate.",
      hi: "अपने बैंक में आवेदन करें। मौजूदा ऋण सीमा और ब्याज दर बैंक से पूछें।",
    },
    applyUrl: "https://www.pmindia.gov.in/en/news_updates/cabinet-approves-continuation-of-modified-interest-subvention-scheme-miss-for-fy-2025-26-with-existing-1-5-interest-subvention-is/",
    sourceIds: ["miss-pmindia-2025"],
    lastVerified: "2026-10-26",
    status: "needs-verification",
    statusNote: {
      en: "The verified figures are for FY 2025-26. We have not confirmed the figures for the current year.",
      hi: "जाँचे गए आँकड़े वित्त वर्ष 2025-26 के हैं। इस साल के आँकड़ों की पुष्टि नहीं हुई है।",
    },
    watchUrls: [],
  },
  {
    id: "soil-health-card",
    level: "central",
    states: "all",
    category: "soil",
    name: { en: "Soil Health Card", hi: "मृदा स्वास्थ्य कार्ड" },
    summary: {
      en: "Your farm's soil is tested and you get a card with its nutrient status and fertilizer recommendations.",
      hi: "आपके खेत की मिट्टी की जाँच होती है और पोषक तत्वों की स्थिति व खाद की सलाह वाला कार्ड मिलता है।",
    },
    benefits: {
      en: "A card with your soil test results and fertilizer recommendations for your soil.",
      hi: "मिट्टी जाँच के नतीजों और आपकी मिट्टी के लिए खाद की सलाह वाला कार्ड।",
    },
    eligibility: {
      en: "Farm holdings across India. Official documents mention a new card every 2 years and also every 3 years — ask your agriculture office about the current cycle.",
      hi: "पूरे भारत की कृषि जोतें। सरकारी दस्तावेज़ों में हर 2 साल और हर 3 साल, दोनों लिखे हैं — मौजूदा चक्र अपने कृषि कार्यालय से पूछें।",
    },
    documents: null,
    howToApply: {
      en: "Contact your block agriculture office or KVK for soil sampling. You can view your card on the Soil Health Card portal.",
      hi: "मिट्टी का नमूना लेने के लिए अपने ब्लॉक कृषि कार्यालय या KVK से संपर्क करें। अपना कार्ड मृदा स्वास्थ्य कार्ड पोर्टल पर देख सकते हैं।",
    },
    applyUrl: "https://soilhealth.dac.gov.in/",
    sourceIds: ["shc-pib-2025", "shc-portal"],
    lastVerified: "2026-10-26",
    status: "verified",
    statusNote: {
      en: "Sources disagree on how often a new card is issued (2 or 3 years).",
      hi: "नया कार्ड कितने समय में मिलता है (2 या 3 साल), इस पर स्रोत अलग-अलग हैं।",
    },
    watchUrls: ["https://soilhealth.dac.gov.in/"],
  },
];

export function schemesForState(state: string | null): SchemeRecord[] {
  return SCHEMES.filter((s) => s.states === "all" || (state !== null && s.states.includes(state)));
}
