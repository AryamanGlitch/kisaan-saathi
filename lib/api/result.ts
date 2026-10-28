/**
 * One response shape for every API route, so the UI handles errors the same way everywhere.
 */
export type ApiErrorCode =
  | "BAD_REQUEST"
  | "OUTSIDE_INDIA"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "NOT_CONFIGURED"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_ERROR"
  | "INVALID_UPSTREAM_DATA"
  | "CONTENT_BLOCKED"
  | "UNAUTHORIZED";

export const API_ERROR_CODES: readonly ApiErrorCode[] = [
  "BAD_REQUEST",
  "OUTSIDE_INDIA",
  "NOT_FOUND",
  "RATE_LIMITED",
  "NOT_CONFIGURED",
  "UPSTREAM_TIMEOUT",
  "UPSTREAM_ERROR",
  "INVALID_UPSTREAM_DATA",
  "CONTENT_BLOCKED",
  "UNAUTHORIZED",
];

export interface ApiError {
  code: ApiErrorCode;
  message: string; // developer-facing; the UI shows translated text keyed by `code`
  retryAfterSec?: number;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export function ok<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}

export function fail(
  code: ApiErrorCode,
  message: string,
  extra: { retryAfterSec?: number } = {},
): { ok: false; error: ApiError } {
  return { ok: false, error: { code, message, ...extra } };
}

/** HTTP status for each error code. */
export function statusFor(result: ApiResult<unknown>): number {
  if (result.ok) return 200;
  switch (result.error.code) {
    case "BAD_REQUEST":
      return 400;
    case "UNAUTHORIZED":
      return 401;
    case "NOT_FOUND":
      return 404;
    case "OUTSIDE_INDIA":
    case "CONTENT_BLOCKED":
      return 422;
    case "RATE_LIMITED":
      return 429;
    case "UPSTREAM_ERROR":
    case "INVALID_UPSTREAM_DATA":
      return 502;
    case "NOT_CONFIGURED":
      return 503;
    case "UPSTREAM_TIMEOUT":
      return 504;
  }
}

/** Runtime guard for responses received by the browser. */
export function isApiResult(x: unknown): x is ApiResult<unknown> {
  if (typeof x !== "object" || x === null) return false;
  const r = x as Record<string, unknown>;
  if (r.ok === true) return "data" in r;
  if (r.ok === false) {
    const e = r.error as Record<string, unknown> | undefined;
    return (
      typeof e === "object" &&
      e !== null &&
      typeof e.message === "string" &&
      API_ERROR_CODES.includes(e.code as ApiErrorCode)
    );
  }
  return false;
}
