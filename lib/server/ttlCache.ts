/**
 * Small in-memory cache that keeps stale entries for a while, so we can still serve
 * the last good answer (clearly marked stale) when an upstream service fails.
 * Per server instance only — see TASKS.md for the shared-cache follow-up.
 */
export interface CacheHit<V> {
  value: V;
  storedAt: number;
  fresh: boolean;
}

export class TtlCache<V> {
  private readonly store = new Map<string, { value: V; storedAt: number }>();
  private readonly ttlMs: number;
  private readonly maxStaleMs: number;
  private readonly maxEntries: number;

  constructor(opts: { ttlMs: number; maxStaleMs: number; maxEntries: number }) {
    this.ttlMs = opts.ttlMs;
    this.maxStaleMs = Math.max(opts.maxStaleMs, opts.ttlMs);
    this.maxEntries = opts.maxEntries;
  }

  get(key: string, now: number = Date.now()): CacheHit<V> | null {
    const e = this.store.get(key);
    if (!e) return null;
    const age = now - e.storedAt;
    if (age > this.maxStaleMs) {
      this.store.delete(key);
      return null;
    }
    return { value: e.value, storedAt: e.storedAt, fresh: age <= this.ttlMs };
  }

  set(key: string, value: V, now: number = Date.now()): void {
    this.store.delete(key); // re-insert so Map order = insertion age
    this.store.set(key, { value, storedAt: now });
    while (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest === undefined) break;
      this.store.delete(oldest);
    }
  }

  get size(): number {
    return this.store.size;
  }
}
