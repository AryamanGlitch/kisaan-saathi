import type { Advisory } from "@/lib/weather/advisories";
import type { Lang, StringKey } from "@/lib/i18n/strings";
import { dayKind } from "@/lib/time";
import { formatWeekday } from "@/lib/client/format";

type T = (key: StringKey, params?: Record<string, string | number>) => string;

export function advisoryText(a: Advisory, t: T, lang: Lang, today: string): string {
  const k = dayKind(a.date, today);
  const day =
    k === "today" ? t("day.todayInline") : k === "tomorrow" ? t("day.tomorrowInline") : t("day.onDate", { date: formatWeekday(a.date, lang) });
  const key: StringKey = a.kind === "spray-rain" ? (a.unit === "pct" ? "adv.spray-rain.pct" : "adv.spray-rain.mm") : `adv.${a.kind}`;
  return t(key, { day, value: a.value });
}
