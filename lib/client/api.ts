import { isApiResult, type ApiErrorCode, type ApiResult } from "../api/result.ts";

/** Errors the browser can see: server codes plus "no connection" and "server sent garbage". */
export type ClientErrorCode = ApiErrorCode | "NETWORK" | "SERVER";
export type ClientResult<T> = { ok: true; data: T } | { ok: false; code: ClientErrorCode; retryAfterSec?: number };

export async function getApi<T>(path: string, signal?: AbortSignal): Promise<ClientResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, { signal, headers: { Accept: "application/json" } });
  } catch (err) {
    if ((err as { name?: string })?.name === "AbortError") throw err;
    return { ok: false, code: "NETWORK" };
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { ok: false, code: "SERVER" };
  }
  if (!isApiResult(body)) return { ok: false, code: "SERVER" };
  const r = body as ApiResult<T>;
  return r.ok ? { ok: true, data: r.data } : { ok: false, code: r.error.code, retryAfterSec: r.error.retryAfterSec };
}

export async function postApi<T>(path: string, body: unknown, signal?: AbortSignal): Promise<ClientResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, { method: "POST", signal, headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) });
  } catch (err) {
    if ((err as { name?: string })?.name === "AbortError") throw err;
    return { ok: false, code: "NETWORK" };
  }
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return { ok: false, code: "SERVER" };
  }
  if (!isApiResult(data)) return { ok: false, code: "SERVER" };
  const r = data as ApiResult<T>;
  return r.ok ? { ok: true, data: r.data } : { ok: false, code: r.error.code, retryAfterSec: r.error.retryAfterSec };
}
