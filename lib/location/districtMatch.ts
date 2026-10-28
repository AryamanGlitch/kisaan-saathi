import { DISTRICTS, DISTRICT_ALIASES } from "./districts.ts";
import { findState } from "./states.ts";

/** Lowercase letters only; drops "district" and brackets content handled separately. */
export function normDistrict(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\bdistrict\b|\bzila\b|\bjila\b/g, "")
    .replace(/[^a-z]/g, "");
}

/** "Mysuru (Mysore)" → ["mysuru", "mysore"] */
function keysOf(listed: string): string[] {
  const m = /^(.*?)\s*\((.*)\)\s*$/.exec(listed);
  return (m ? [m[1]!, m[2]!] : [listed]).map(normDistrict).filter(Boolean);
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]!;
      dp[j] = Math.min(dp[j]! + 1, dp[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length]!;
}

export function districtsFor(state: string | null | undefined): string[] {
  const st = findState(state);
  return st ? DISTRICTS[st.en] ?? [] : [];
}

/**
 * Finds the listed district for a name from GPS/maps or typing. Tries each candidate in order
 * (maps may give district, tehsil or city names). Returns null when nothing is close enough.
 */
export function matchDistrict(state: string | null | undefined, candidates: Array<string | null | undefined>): string | null {
  const st = findState(state);
  if (!st) return null;
  const list = DISTRICTS[st.en] ?? [];
  const aliases = DISTRICT_ALIASES[st.en] ?? {};
  // A name exactly as listed (from the district menu), e.g. "Mysuru (Mysore)".
  const listed = list.find((d) => candidates.some((c) => c?.trim() === d));
  if (listed) return listed;
  const names = candidates.map((c) => (c ? normDistrict(c) : "")).filter(Boolean);
  for (const n of names) {
    const exact = list.find((d) => keysOf(d).includes(n));
    if (exact) return exact;
    if (aliases[n]) return list.find((d) => d === aliases[n]) ?? null;
  }
  for (const n of names) {
    if (n.length < 5) continue;
    let best: { d: string; dist: number } | null = null;
    for (const d of list) {
      for (const k of keysOf(d)) {
        const dist = editDistance(n, k);
        if (dist <= Math.max(1, Math.floor(k.length / 6)) && (!best || dist < best.dist)) best = { d, dist };
      }
    }
    if (best) return best.d;
  }
  return null;
}
