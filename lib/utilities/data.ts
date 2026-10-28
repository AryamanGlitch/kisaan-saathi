import type { Bilingual } from "../schemes/types.ts";
import type { SourceId } from "../sources.ts";

/**
 * Verified utility contacts per state. Contacts are copied from the utility's own website.
 * `liveFeed` is null everywhere: no verified machine-readable supply schedule was found.
 * To add a live integration, implement a LiveFeedAdapter (lib/utilities/feeds.ts) and set its id here.
 */
export interface Contact {
  type: "phone" | "email" | "web";
  value: string;
  label: Bilingual;
}

export interface UtilityRecord {
  id: string;
  kind: "electricity" | "water";
  state: string;
  name: Bilingual;
  coverage: Bilingual;
  contacts: Contact[];
  sourceId: SourceId;
  liveFeed: string | null;
}

export const UTILITIES: UtilityRecord[] = [
  {
    id: "upcl",
    kind: "electricity",
    state: "Uttarakhand",
    name: { en: "Uttarakhand Power Corporation Ltd (UPCL)", hi: "उत्तराखंड पावर कॉर्पोरेशन लिमिटेड (UPCL)" },
    coverage: { en: "The state's electricity distribution company.", hi: "राज्य की बिजली वितरण कंपनी।" },
    contacts: [
      { type: "phone", value: "1912", label: { en: "Toll-free complaints: 1912", hi: "टोल-फ्री शिकायत: 1912" } },
      { type: "email", value: "customercare@upcl.org", label: { en: "Customer care email", hi: "ग्राहक सेवा ईमेल" } },
      { type: "web", value: "https://upcl.uk.gov.in/", label: { en: "UPCL website", hi: "UPCL वेबसाइट" } },
    ],
    sourceId: "upcl-contact",
    liveFeed: null,
  },
  {
    id: "ujs",
    kind: "water",
    state: "Uttarakhand",
    name: { en: "Uttarakhand Jal Sansthan", hi: "उत्तराखंड जल संस्थान" },
    coverage: {
      en: "State water supply agency. If your village water is run by the gram panchayat or another body, contact them too.",
      hi: "राज्य की जल आपूर्ति संस्था। अगर आपके गाँव का पानी ग्राम पंचायत या किसी और संस्था के पास है, तो उनसे भी संपर्क करें।",
    },
    contacts: [
      { type: "phone", value: "18001804100", label: { en: "Toll-free: 1800-180-4100", hi: "टोल-फ्री: 1800-180-4100" } },
      { type: "phone", value: "1916", label: { en: "Complaints: 1916", hi: "शिकायत: 1916" } },
      { type: "web", value: "https://ujs.uk.gov.in/", label: { en: "Jal Sansthan website", hi: "जल संस्थान वेबसाइट" } },
    ],
    sourceId: "ujs-customer-care",
    liveFeed: null,
  },
];

export function utilitiesForState(state: string | null): UtilityRecord[] {
  return state ? UTILITIES.filter((u) => u.state === state) : [];
}
