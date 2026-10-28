/**
 * Fixed-window rate limiter keyed by client. In-memory, so on serverless platforms each
 * instance counts separately — basic abuse protection, not a guarantee (see TASKS.md).
 */
export interface RateLimiter {
  check(key: string, now?: number): { allowed: boolean; retryAfterMs: number };
  readonly size: number;
}

export function createRateLimiter(opts: { limit: number; windowMs: number; maxKeys?: number }): RateLimiter {
  const hits = new Map<string, { count: number; windowStart: number }>();
  const maxKeys = opts.maxKeys ?? 10_000;

  function prune(now: number) {
    for (const [k, v] of hits) {
      if (now - v.windowStart >= opts.windowMs) hits.delete(k);
    }
    while (hits.size >= maxKeys) {
      const oldest = hits.keys().next().value;
      if (oldest === undefined) break;
      hits.delete(oldest);
    }
  }

  return {
    check(key: string, now: number = Date.now()) {
      let e = hits.get(key);
      if (!e || now - e.windowStart >= opts.windowMs) {
        if (!e && hits.size >= maxKeys) prune(now);
        e = { count: 0, windowStart: now };
        hits.set(key, e);
      }
      e.count += 1;
      if (e.count > opts.limit) {
        return { allowed: false, retryAfterMs: e.windowStart + opts.windowMs - now };
      }
      return { allowed: true, retryAfterMs: 0 };
    },
    get size() {
      return hits.size;
    },
  };
}
