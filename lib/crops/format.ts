import type { Lang, StringKey } from "../i18n/strings.ts";
import type { MonthWeek, SowingWindow } from "./types.ts";

type T = (key: StringKey, params?: Record<string, string | number>) => string;

export function monthName(month: number, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, month - 1, 15)));
}

function part(mw: MonthWeek, lang: Lang, t: T): string {
  const m = monthName(mw.month, lang);
  return mw.week ? t(`week.${mw.week}` as StringKey, { month: m }) : m;
}

/** "October – December", "1st week of June – 4th week of July", in either language. */
export function windowText(w: SowingWindow, lang: Lang, t: T): string {
  const same = w.start.month === w.end.month && !w.start.week && !w.end.week;
  const range = same ? part(w.start, lang, t) : `${part(w.start, lang, t)} – ${part(w.end, lang, t)}`;
  return `${t(`season.${w.season}` as StringKey)}: ${range}`;
}
