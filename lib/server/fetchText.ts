import type { FetchText } from "../schemes/refresh.ts";

/** Polite page fetch for the daily monitor: identified, time-limited, size-limited. */
export function createFetchText(opts: { userAgent: string; timeoutMs: number; maxBytes: number; fetchImpl?: typeof fetch }): FetchText {
  const f = opts.fetchImpl ?? fetch;
  return async (url) => {
    try {
      const res = await f(url, {
        headers: { "User-Agent": opts.userAgent, Accept: "text/html,application/xhtml+xml" },
        signal: AbortSignal.timeout(opts.timeoutMs),
        redirect: "follow",
        cache: "no-store",
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      const text = await res.text();
      if (text.length > opts.maxBytes) return { ok: false, error: "Page too large" };
      return { ok: true, text };
    } catch (err) {
      const name = (err as { name?: string })?.name;
      return { ok: false, error: name === "TimeoutError" || name === "AbortError" ? "Timed out" : "Network error" };
    }
  };
}
