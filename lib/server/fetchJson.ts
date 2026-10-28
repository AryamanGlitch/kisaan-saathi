export type FetchFailure =
  | { kind: "timeout" }
  | { kind: "network"; message: string }
  | { kind: "http"; status: number; body: unknown }
  | { kind: "invalid-json" };

export type FetchOutcome = { ok: true; json: unknown } | { ok: false; failure: FetchFailure };

/** fetch + timeout + JSON parse, with every failure turned into a value instead of a throw. */
export async function fetchJson(
  url: string,
  opts: { timeoutMs: number; headers?: Record<string, string>; fetchImpl?: typeof fetch },
): Promise<FetchOutcome> {
  const f = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await f(url, {
      headers: { Accept: "application/json", ...opts.headers },
      signal: AbortSignal.timeout(opts.timeoutMs),
      cache: "no-store",
    });
  } catch (err) {
    const name = (err as { name?: string } | null)?.name;
    if (name === "TimeoutError" || name === "AbortError") return { ok: false, failure: { kind: "timeout" } };
    return { ok: false, failure: { kind: "network", message: String((err as Error)?.message ?? err) } };
  }

  let text: string;
  try {
    text = await res.text();
  } catch (err) {
    const name = (err as { name?: string } | null)?.name;
    if (name === "TimeoutError" || name === "AbortError") return { ok: false, failure: { kind: "timeout" } };
    return { ok: false, failure: { kind: "network", message: "Failed reading body" } };
  }

  let json: unknown = undefined;
  let parsed = true;
  try {
    json = JSON.parse(text);
  } catch {
    parsed = false;
  }

  if (!res.ok) return { ok: false, failure: { kind: "http", status: res.status, body: parsed ? json : null } };
  if (!parsed) return { ok: false, failure: { kind: "invalid-json" } };
  return { ok: true, json };
}
