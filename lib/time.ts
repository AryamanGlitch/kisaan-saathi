/** Date helpers pinned to India Standard Time, whatever the server or phone timezone. */
export const INDIA_TZ = "Asia/Kolkata";

/** "YYYY-MM-DD" for `now` in IST. */
export function todayInIndia(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: INDIA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type DayKind = "today" | "tomorrow" | "other";

export function dayKind(isoDate: string, today: string): DayKind {
  if (isoDate === today) return "today";
  if (isoDate === addDays(today, 1)) return "tomorrow";
  return "other";
}

export const WEATHER_STALE_AFTER_MS = 3 * 60 * 60 * 1000;

/** Invalid timestamps count as stale. */
export function isStale(iso: string, nowMs: number, maxAgeMs: number): boolean {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return true;
  return nowMs - t > maxAgeMs;
}

/** "YYYY-MM-DDTHH:mm" in IST — matches Open-Meteo hourly timestamps with timezone=Asia/Kolkata. */
export function nowInIndiaLocal(now: Date): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: INDIA_TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(now).map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
