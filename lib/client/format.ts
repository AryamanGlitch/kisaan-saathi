import type { Lang } from "../i18n/strings.ts";
import { INDIA_TZ } from "../time.ts";

const locale = (lang: Lang) => (lang === "hi" ? "hi-IN" : "en-IN");

export function formatTime(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale(lang), {
    timeZone: INDIA_TZ, day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  }).format(d);
}

const MONTHS: Record<Lang, readonly string[]> = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  hi: ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"],
};
const IST_OFFSET_MS = 330 * 60 * 1000; // India has no daylight saving, so a fixed offset is exact.

/**
 * "26 October 2026" / "26 अक्टूबर 2026" in IST. Built by hand, not with Intl: this runs during server rendering,
 * and Node's and the browser's ICU data format Hindi dates differently ("26 अक्टूबर, 2026"), which broke hydration.
 */
export function formatDate(iso: string, lang: Lang): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "—";
  const d = new Date(ms + IST_OFFSET_MS);
  return `${d.getUTCDate()} ${MONTHS[lang][d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "2026-10-28" → "Wed, 28 Oct" (date-only strings are calendar dates in IST). */
export function formatWeekday(isoDate: string, lang: Lang): string {
  const d = new Date(`${isoDate}T12:00:00+05:30`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return new Intl.DateTimeFormat(locale(lang), { timeZone: INDIA_TZ, weekday: "short", day: "numeric", month: "short" }).format(d);
}

export const round = (n: number | null) => (n === null ? "—" : String(Math.round(n)));
