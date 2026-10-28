import type { SourceId } from "../sources.ts";

export interface Bilingual {
  en: string;
  hi: string;
}

/** A scheme as verified by a person from official sources. */
export interface SchemeRecord {
  id: string;
  level: "central" | "state";
  /** "all" for central schemes, or English state names. */
  states: "all" | string[];
  category: "income" | "insurance" | "credit" | "soil" | "irrigation" | "equipment" | "other";
  name: Bilingual;
  summary: Bilingual;
  benefits: Bilingual | null;
  eligibility: Bilingual | null;
  documents: Bilingual | null;
  howToApply: Bilingual;
  applyUrl: string;
  sourceIds: SourceId[];
  /** Date a person last checked every field against the sources. */
  lastVerified: string;
  /** "needs-verification" when a figure is tied to a period that has passed, or sources conflict. */
  status: "verified" | "needs-verification";
  statusNote: Bilingual | null;
  /** Official pages the daily job fetches to detect changes. */
  watchUrls: string[];
}

/** Monitoring state of one watched URL, written by the daily job. */
export interface SourceStatus {
  url: string;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  lastHash: string | null;
  baselineHash: string | null;
  /** lastVerified date of the records the baseline belongs to; a newer verification re-baselines. */
  baselineFor: string | null;
  changedSinceVerification: boolean;
  lastChangedAt: string | null;
  lastError: string | null;
}

export type Freshness = "current" | "check-overdue" | "source-changed" | "needs-verification" | "not-monitored";
