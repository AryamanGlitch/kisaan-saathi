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

export function formatDate(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale(lang), { timeZone: INDIA_TZ, day: "numeric", month: "long", year: "numeric" }).format(d);
}

/** "2026-10-28" → "Wed, 28 Oct" (date-only strings are calendar dates in IST). */
export function formatWeekday(isoDate: string, lang: Lang): string {
  const d = new Date(`${isoDate}T12:00:00+05:30`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return new Intl.DateTimeFormat(locale(lang), { timeZone: INDIA_TZ, weekday: "short", day: "numeric", month: "short" }).format(d);
}

export const round = (n: number | null) => (n === null ? "—" : String(Math.round(n)));
