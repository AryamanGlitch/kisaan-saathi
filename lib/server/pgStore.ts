import type { RefreshReport, StatusStore } from "../schemes/refresh.ts";
import type { SourceStatus } from "../schemes/types.ts";

/**
 * PostgreSQL store for scheme monitoring (schema in db/migrations).
 * `pg` is loaded lazily so the app runs without a database (monitoring is then reported as not persisted).
 * NOT EXECUTED in the build environment — verify with `npm run db:migrate` and `npm run schemes:refresh`.
 */
interface Queryable {
  query(text: string, params?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
}

let poolPromise: Promise<Queryable> | null = null;

async function getPool(url: string): Promise<Queryable> {
  if (!poolPromise) {
    poolPromise = import("pg").then((mod) => {
      // pg is CommonJS: depending on the bundler, Pool is on the namespace or on `default`.
      const m = mod as unknown as { Pool?: new (cfg: object) => Queryable; default?: { Pool: new (cfg: object) => Queryable } };
      const Pool = m.Pool ?? m.default?.Pool;
      if (!Pool) throw new Error("pg.Pool not found");
      return new Pool({ connectionString: url, max: 3 });
    });
  }
  return poolPromise;
}

const iso = (v: unknown): string | null => (v instanceof Date ? v.toISOString() : typeof v === "string" ? v : null);

export function rowToStatus(r: Record<string, unknown>): SourceStatus {
  return {
    url: String(r.url),
    lastCheckedAt: iso(r.last_checked_at),
    lastSuccessAt: iso(r.last_success_at),
    lastHash: (r.last_hash as string | null) ?? null,
    baselineHash: (r.baseline_hash as string | null) ?? null,
    baselineFor: (r.baseline_for as string | null) ?? null,
    changedSinceVerification: r.changed_since_verification === true,
    lastChangedAt: iso(r.last_changed_at),
    lastError: (r.last_error as string | null) ?? null,
  };
}

export function createPgStore(databaseUrl: string, getDb: (url: string) => Promise<Queryable> = getPool): StatusStore {
  return {
    persistent: true,
    async load() {
      const db = await getDb(databaseUrl);
      const { rows } = await db.query("SELECT * FROM scheme_source_status");
      return new Map(rows.map((r) => [String(r.url), rowToStatus(r)]));
    },
    async save(list: SourceStatus[]) {
      const db = await getDb(databaseUrl);
      for (const s of list) {
        await db.query(
          `INSERT INTO scheme_source_status
             (url, last_checked_at, last_success_at, last_hash, baseline_hash, baseline_for,
              changed_since_verification, last_changed_at, last_error, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
           ON CONFLICT (url) DO UPDATE SET
             last_checked_at = EXCLUDED.last_checked_at, last_success_at = EXCLUDED.last_success_at,
             last_hash = EXCLUDED.last_hash, baseline_hash = EXCLUDED.baseline_hash,
             baseline_for = EXCLUDED.baseline_for, changed_since_verification = EXCLUDED.changed_since_verification,
             last_changed_at = EXCLUDED.last_changed_at, last_error = EXCLUDED.last_error, updated_at = now()`,
          [s.url, s.lastCheckedAt, s.lastSuccessAt, s.lastHash, s.baselineHash, s.baselineFor, s.changedSinceVerification, s.lastChangedAt, s.lastError],
        );
      }
    },
    async recordRun(run: RefreshReport) {
      const db = await getDb(databaseUrl);
      await db.query(
        "INSERT INTO scheme_refresh_runs (started_at, finished_at, checked, changed, failed) VALUES ($1,$2,$3,$4,$5)",
        [run.startedAt, run.finishedAt, run.checked, JSON.stringify(run.changed), JSON.stringify(run.failed)],
      );
    },
  };
}

export async function lastRun(databaseUrl: string, getDb: (url: string) => Promise<Queryable> = getPool): Promise<{ finishedAt: string; failed: number } | null> {
  const db = await getDb(databaseUrl);
  const { rows } = await db.query("SELECT finished_at, failed FROM scheme_refresh_runs ORDER BY finished_at DESC LIMIT 1");
  const r = rows[0];
  if (!r) return null;
  const failed = Array.isArray(r.failed) ? r.failed.length : 0;
  return { finishedAt: iso(r.finished_at) ?? "", failed };
}
