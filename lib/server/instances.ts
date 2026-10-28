import { getCronSecret, getDatabaseUrl, getGeminiConfig, getGeocodeConfig, getMonitorUserAgent, getWeatherConfig } from "./config.ts";
import { createGeocodeService } from "./geocodeService.ts";
import { createRateLimiter } from "./rateLimit.ts";
import { createWeatherService } from "./weatherService.ts";
import { createSoilService } from "./soilService.ts";
import { createFetchText } from "./fetchText.ts";
import { createPgStore } from "./pgStore.ts";
import { createMemoryStore, type StatusStore } from "../schemes/refresh.ts";
import type { AssistantDeps } from "../assistant/service.ts";

// Server-only singletons. Never import this file from a client component.
const env = process.env;

export const weatherService = createWeatherService({ config: getWeatherConfig(env) });
export const soilService = createSoilService({ baseUrl: getWeatherConfig(env).baseUrl });
export const geocodeService = createGeocodeService({ config: getGeocodeConfig(env) });

export const weatherLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });
export const locationLimiter = createRateLimiter({ limit: 10, windowMs: 60_000 });
export const assistantLimiter = createRateLimiter({ limit: 6, windowMs: 60_000 });
/** Protects the Gemini quota across all users of one server instance. */
export const assistantGlobalLimiter = createRateLimiter({ limit: 60, windowMs: 60_000 });
export const readLimiter = createRateLimiter({ limit: 60, windowMs: 60_000 });

export const databaseUrl = getDatabaseUrl(env);
export const schemeStore: StatusStore = databaseUrl ? createPgStore(databaseUrl) : createMemoryStore();
export const cronSecret = getCronSecret(env);
export const fetchPageText = createFetchText({ userAgent: getMonitorUserAgent(env), timeoutMs: 15_000, maxBytes: 3_000_000 });

export const assistantDeps: AssistantDeps = {
  config: getGeminiConfig(env),
  async getWeather(lat, lon) {
    const r = await weatherService.get(lat, lon);
    return r.ok ? { report: r.data.report, fetchedAt: r.data.fetchedAt } : null;
  },
};
