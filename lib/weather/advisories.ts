import type { WeatherReport } from "./openMeteo.ts";

/**
 * Turns a forecast into plain farm advisories.
 *
 * IMPORTANT: these are app rules applied to a model forecast, NOT official IMD warnings,
 * and the UI says so. Every threshold below must be reviewed by an agronomist / KVK
 * before public release (tracked in TASKS.md).
 */
export interface AdvisoryThresholds {
  /** Skip spraying/fertilizer top-dressing if rain this likely within sprayWindowDays. App heuristic. */
  sprayRainProbPct: number;
  /** ...or if this much rain is forecast (used when probability is unavailable). App heuristic. */
  sprayRainMm: number;
  /** Max wind for spraying (drift risk). App heuristic; daily max includes afternoon gusts. */
  sprayWindKmh: number;
  /** 24-h rain ≥ 64.5 mm is the lower bound of IMD's "heavy rainfall" category. */
  heavyRainMm: number;
  /** Very hot day. App heuristic (IMD heatwave criteria also depend on local normals, which we don't have). */
  heatC: number;
  /** Frost-risk night. App heuristic. */
  coldC: number;
  sprayWindowDays: number;
  lookaheadDays: number;
}

export const DEFAULT_THRESHOLDS: AdvisoryThresholds = {
  sprayRainProbPct: 60,
  sprayRainMm: 5,
  sprayWindKmh: 15,
  heavyRainMm: 64.5,
  heatC: 40,
  coldC: 4,
  sprayWindowDays: 2,
  lookaheadDays: 3,
};

export type AdvisoryKind = "heavy-rain" | "heat" | "cold" | "spray-rain" | "spray-wind";
export type AdvisoryUnit = "mm" | "pct" | "c" | "kmh";

export interface Advisory {
  kind: AdvisoryKind;
  date: string; // first day it applies
  value: number;
  unit: AdvisoryUnit;
}

const PRIORITY: AdvisoryKind[] = ["heavy-rain", "heat", "cold", "spray-rain", "spray-wind"];

/** One advisory per kind (earliest day), most serious first. */
export function deriveAdvisories(report: WeatherReport, t: AdvisoryThresholds = DEFAULT_THRESHOLDS): Advisory[] {
  const found = new Map<AdvisoryKind, Advisory>();
  const add = (a: Advisory) => {
    if (!found.has(a.kind)) found.set(a.kind, a);
  };

  report.daily.slice(0, t.lookaheadDays).forEach((d, i) => {
    if (d.precipMm !== null && d.precipMm >= t.heavyRainMm) {
      add({ kind: "heavy-rain", date: d.date, value: Math.round(d.precipMm), unit: "mm" });
    }
    if (d.maxC !== null && d.maxC >= t.heatC) {
      add({ kind: "heat", date: d.date, value: Math.round(d.maxC), unit: "c" });
    }
    if (d.minC !== null && d.minC <= t.coldC) {
      add({ kind: "cold", date: d.date, value: Math.round(d.minC), unit: "c" });
    }
    if (i < t.sprayWindowDays) {
      if (d.precipProbPct !== null && d.precipProbPct >= t.sprayRainProbPct) {
        add({ kind: "spray-rain", date: d.date, value: Math.round(d.precipProbPct), unit: "pct" });
      } else if (d.precipMm !== null && d.precipMm >= t.sprayRainMm) {
        add({ kind: "spray-rain", date: d.date, value: Math.round(d.precipMm), unit: "mm" });
      }
      if (d.windMaxKmh !== null && d.windMaxKmh >= t.sprayWindKmh) {
        add({ kind: "spray-wind", date: d.date, value: Math.round(d.windMaxKmh), unit: "kmh" });
      }
    }
  });

  return PRIORITY.flatMap((k) => {
    const a = found.get(k);
    return a ? [a] : [];
  });
}
