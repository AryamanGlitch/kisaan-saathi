/** Builds complaint text the farmer sends THEMSELVES (call/email). The app never claims submission. */
export type ComplaintIssue = "no-power" | "low-voltage" | "billing" | "no-water" | "dirty-water" | "other";
export const ELECTRICITY_ISSUES: ComplaintIssue[] = ["no-power", "low-voltage", "billing", "other"];
export const WATER_ISSUES: ComplaintIssue[] = ["no-water", "dirty-water", "billing", "other"];

const ISSUE_TEXT: Record<ComplaintIssue, { en: string; hi: string }> = {
  "no-power": { en: "No electricity supply", hi: "बिजली नहीं आ रही" },
  "low-voltage": { en: "Low voltage", hi: "कम वोल्टेज" },
  billing: { en: "Billing problem", hi: "बिल की समस्या" },
  "no-water": { en: "No water supply", hi: "पानी नहीं आ रहा" },
  "dirty-water": { en: "Dirty water", hi: "गंदा पानी" },
  other: { en: "Other problem", hi: "अन्य समस्या" },
};

export interface ComplaintInput {
  lang: "en" | "hi";
  utilityName: string;
  issue: ComplaintIssue;
  consumerNumber: string;
  place: string;
  since: string;
  details: string;
}

export function issueLabel(issue: ComplaintIssue, lang: "en" | "hi"): string {
  return ISSUE_TEXT[issue][lang];
}

export function buildComplaint(c: ComplaintInput): { subject: string; body: string } {
  const issue = ISSUE_TEXT[c.issue][c.lang];
  const L = c.lang === "hi"
    ? { to: "सेवा में", subj: "शिकायत", place: "स्थान", consumer: "उपभोक्ता संख्या", since: "कब से", details: "विवरण", end: "कृपया जल्द समाधान करें।" }
    : { to: "To", subj: "Complaint", place: "Location", consumer: "Consumer number", since: "Since", details: "Details", end: "Please resolve this soon." };
  const lines = [
    `${L.to}: ${c.utilityName}`,
    `${L.subj}: ${issue}`,
    `${L.place}: ${c.place}`,
    c.consumerNumber.trim() ? `${L.consumer}: ${c.consumerNumber.trim()}` : null,
    c.since.trim() ? `${L.since}: ${c.since.trim()}` : null,
    c.details.trim() ? `${L.details}: ${c.details.trim()}` : null,
    "",
    L.end,
  ].filter((x): x is string => x !== null);
  return { subject: `${L.subj}: ${issue} — ${c.place}`.slice(0, 150), body: lines.join("\n") };
}

/** mailto: link, body trimmed so the URL stays short enough for phone mail apps. */
export function buildMailto(to: string, subject: string, body: string, maxLen = 1800): string {
  let b = body;
  let url = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(b)}`;
  while (url.length > maxLen && b.length > 0) {
    b = b.slice(0, Math.floor(b.length * 0.8));
    url = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(b)}`;
  }
  return url;
}
