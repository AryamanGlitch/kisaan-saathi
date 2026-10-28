import { NOMINATIM_DEFAULT_BASE } from "../location/nominatim.ts";
import { OPEN_METEO_DEFAULT_BASE } from "../weather/openMeteo.ts";

export type Env = Record<string, string | undefined>;

export interface GeocodeConfig {
  baseUrl: string;
  userAgent: string;
  timeoutMs: number;
}

export interface WeatherConfig {
  baseUrl: string;
  apiKey: string | null;
  timeoutMs: number;
}

/** Returns a normalized https URL (or localhost for development); anything else falls back to the default. */
function validUrl(raw: string | undefined, fallback: string): string {
  const normalizedFallback = new URL(fallback).toString();
  if (!raw?.trim()) return normalizedFallback;
  try {
    const u = new URL(raw.trim());
    return u.protocol === "https:" || u.hostname === "localhost" ? u.toString() : normalizedFallback;
  } catch {
    return normalizedFallback;
  }
}

/** null = not configured. The placeholder from .env.example is treated as not configured. */
export function getGeocodeConfig(env: Env): GeocodeConfig | null {
  const ua = env.NOMINATIM_USER_AGENT?.trim();
  if (!ua || ua.includes("replace-with")) return null;
  return { baseUrl: validUrl(env.NOMINATIM_BASE_URL, NOMINATIM_DEFAULT_BASE), userAgent: ua, timeoutMs: 8000 };
}

/** Open-Meteo needs no key for non-commercial use, so weather is always configured. */
export function getWeatherConfig(env: Env): WeatherConfig {
  return {
    baseUrl: validUrl(env.OPEN_METEO_BASE_URL, OPEN_METEO_DEFAULT_BASE),
    apiKey: env.OPEN_METEO_API_KEY?.trim() || null,
    timeoutMs: 8000,
  };
}

export const GEMINI_DEFAULT_MODEL = "gemini-3.5-flash";
/** Newer ids shown in Google's own examples (ai.google.dev/gemini-api/docs/api-key, Oct 2026). */
export const GEMINI_FALLBACK_MODELS = ["gemini-3.8-flash", "gemini-3.6-flash"];
export const GEMINI_DEFAULT_BASE = "https://generativelanguage.googleapis.com";

/** null = assistant disabled (no key). The model id is configurable because Google retires models. */
export function getGeminiConfig(env: Env): { apiKey: string; model: string; fallbackModels: string[]; baseUrl: string; timeoutMs: number } | null {
  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  const model = env.GEMINI_MODEL?.trim() || GEMINI_DEFAULT_MODEL;
  if (!/^[a-z0-9][a-z0-9.\-]{1,80}$/i.test(model)) return null;
  return { apiKey, model, fallbackModels: GEMINI_FALLBACK_MODELS, baseUrl: validUrl(env.GEMINI_BASE_URL, GEMINI_DEFAULT_BASE), timeoutMs: 25_000 };
}

/** Cron endpoints refuse to run without a secret of reasonable length. */
export function getCronSecret(env: Env): string | null {
  const s = env.CRON_SECRET?.trim();
  return s && s.length >= 16 ? s : null;
}

export function getDatabaseUrl(env: Env): string | null {
  const u = env.DATABASE_URL?.trim();
  return u && /^postgres(ql)?:\/\//.test(u) ? u : null;
}

export function getMonitorUserAgent(env: Env): string {
  return env.MONITOR_USER_AGENT?.trim() || env.NOMINATIM_USER_AGENT?.trim() || "KisaanSaathi/1.0 (scheme source monitor)";
}

/** Constant-time comparison for secrets. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
