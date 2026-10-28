import type { Freshness, SchemeRecord, SourceStatus } from "./types.ts";

export const REVERIFY_AFTER_DAYS = 180;
export const CHECK_OVERDUE_AFTER_HOURS = 72;

const DAY = 86_400_000;

/**
 * Honest freshness label for a scheme.
 * `statuses === null` means monitoring isn't persisted (no database), so we can't claim it was checked.
 */
export function schemeFreshness(rec: SchemeRecord, statuses: Map<string, SourceStatus> | null, nowMs: number): Freshness {
  const verifiedAt = Date.parse(`${rec.lastVerified}T00:00:00+05:30`);
  if (rec.status === "needs-verification" || Number.isNaN(verifiedAt) || nowMs - verifiedAt > REVERIFY_AFTER_DAYS * DAY) {
    return "needs-verification";
  }
  if (rec.watchUrls.length === 0 || statuses === null) return "not-monitored";
  const sts = rec.watchUrls.map((u) => statuses.get(u));
  if (sts.some((s) => s?.changedSinceVerification)) return "source-changed";
  const okRecently = sts.every((s) => s?.lastSuccessAt && nowMs - Date.parse(s.lastSuccessAt) <= CHECK_OVERDUE_AFTER_HOURS * 3_600_000);
  return okRecently ? "current" : "check-overdue";
}

/** Latest successful check across a scheme's watched URLs. */
export function lastCheckedOk(rec: SchemeRecord, statuses: Map<string, SourceStatus> | null): string | null {
  if (!statuses) return null;
  const times = rec.watchUrls.map((u) => statuses.get(u)?.lastSuccessAt).filter((t): t is string => Boolean(t));
  return times.sort().at(-1) ?? null;
}
