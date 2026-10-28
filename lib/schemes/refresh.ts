import type { SchemeRecord, SourceStatus } from "./types.ts";

/**
 * Daily change detection for official scheme pages.
 *
 * Government pages have no common API, and their layouts change, so we do NOT scrape figures.
 * Instead we fingerprint each page's visible text. When it changes after a person verified the
 * record, the scheme is flagged "source changed — needs re-verification" and the old verified
 * text stays, labelled. Failures never erase the last successful check.
 */

export type FetchText = (url: string) => Promise<{ ok: true; text: string } | { ok: false; error: string }>;

export interface StatusStore {
  readonly persistent: boolean;
  load(): Promise<Map<string, SourceStatus>>;
  save(statuses: SourceStatus[]): Promise<void>;
  recordRun(run: RefreshReport): Promise<void>;
}

export interface RefreshReport {
  startedAt: string;
  finishedAt: string;
  checked: number;
  changed: string[];
  failed: Array<{ url: string; error: string }>;
}

/** Visible text only: drop scripts, styles, tags, comments; collapse whitespace. */
export function normalizePageText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** For each watched URL: the newest lastVerified date among records watching it. */
export function watchedUrls(registry: SchemeRecord[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of registry) {
    for (const u of r.watchUrls) {
      const prev = m.get(u);
      if (!prev || r.lastVerified > prev) m.set(u, r.lastVerified);
    }
  }
  return m;
}

export function emptyStatus(url: string): SourceStatus {
  return {
    url,
    lastCheckedAt: null,
    lastSuccessAt: null,
    lastHash: null,
    baselineHash: null,
    baselineFor: null,
    changedSinceVerification: false,
    lastChangedAt: null,
    lastError: null,
  };
}

/** Pure state transition for one URL. */
export function nextStatus(
  prev: SourceStatus,
  result: { ok: true; hash: string } | { ok: false; error: string },
  verifiedOn: string,
  nowIso: string,
): SourceStatus {
  if (!result.ok) {
    return { ...prev, lastCheckedAt: nowIso, lastError: result.error.slice(0, 300) };
  }
  // A newer human verification (or the first ever check) sets a new baseline.
  const rebaseline = prev.baselineHash === null || prev.baselineFor !== verifiedOn;
  const baselineHash = rebaseline ? result.hash : prev.baselineHash;
  return {
    ...prev,
    lastCheckedAt: nowIso,
    lastSuccessAt: nowIso,
    lastHash: result.hash,
    baselineHash,
    baselineFor: verifiedOn,
    changedSinceVerification: rebaseline ? false : result.hash !== baselineHash,
    lastChangedAt: prev.lastHash !== null && prev.lastHash !== result.hash ? nowIso : prev.lastChangedAt,
    lastError: null,
  };
}

export async function runRefresh(deps: {
  registry: SchemeRecord[];
  store: StatusStore;
  fetchText: FetchText;
  now?: () => Date;
}): Promise<RefreshReport> {
  const now = deps.now ?? (() => new Date());
  const startedAt = now().toISOString();
  const statuses = await deps.store.load();
  const updated: SourceStatus[] = [];
  const report: RefreshReport = { startedAt, finishedAt: startedAt, checked: 0, changed: [], failed: [] };

  for (const [url, verifiedOn] of watchedUrls(deps.registry)) {
    const prev = statuses.get(url) ?? emptyStatus(url);
    let result: { ok: true; hash: string } | { ok: false; error: string };
    try {
      const r = await deps.fetchText(url);
      result = r.ok ? { ok: true, hash: await sha256Hex(normalizePageText(r.text)) } : r;
    } catch (err) {
      result = { ok: false, error: String((err as Error)?.message ?? err) };
    }
    const next = nextStatus(prev, result, verifiedOn, now().toISOString());
    report.checked += 1;
    if (!result.ok) report.failed.push({ url, error: result.error });
    if (next.changedSinceVerification && !prev.changedSinceVerification) report.changed.push(url);
    updated.push(next);
  }

  await deps.store.save(updated);
  report.finishedAt = now().toISOString();
  await deps.store.recordRun(report);
  return report;
}

/** In-memory store: for development and tests. Not persistent across server instances. */
export function createMemoryStore(): StatusStore & { runs: RefreshReport[] } {
  const map = new Map<string, SourceStatus>();
  const runs: RefreshReport[] = [];
  return {
    persistent: false,
    runs,
    async load() {
      return new Map(map);
    },
    async save(list) {
      for (const s of list) map.set(s.url, s);
    },
    async recordRun(run) {
      runs.push(run);
      if (runs.length > 30) runs.shift();
    },
  };
}
