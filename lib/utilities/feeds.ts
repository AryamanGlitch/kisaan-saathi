import type { Bilingual } from "../schemes/types.ts";

/**
 * Integration boundary for live supply data. No adapters are registered: none of the
 * official utilities checked publish a machine-readable outage or schedule feed.
 * An adapter must return data with its own source URL and timestamp, or null.
 */
export interface SupplyStatus {
  summary: Bilingual;
  sourceUrl: string;
  observedAt: string;
}

export interface LiveFeedAdapter {
  id: string;
  fetchStatus(place: { state: string; district: string; lat: number | null; lon: number | null }): Promise<SupplyStatus | null>;
}

export const FEED_ADAPTERS: Record<string, LiveFeedAdapter> = {};
