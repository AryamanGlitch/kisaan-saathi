// Builds lib/location/districtCoords.ts: a centre point for every district in lib/location/districts.ts,
// from OpenStreetMap district boundaries (via Nominatim). With it, choosing a district never depends on a
// live text search: Open-Meteo's place search only knows towns, so districts like "North Goa" found nothing.
//
// One-time task, kept within the Nominatim usage policy: one request at a time, at most 1 per second,
// results cached in the output file (re-runs only look up districts that are missing).
//
// Usage: NOMINATIM_USER_AGENT="KisaanSaathi/1.0 (contact)" node --experimental-strip-types scripts/build-district-coords.ts
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { DISTRICTS } from "../lib/location/districts.ts";
import { findState } from "../lib/location/states.ts";
import { normDistrict } from "../lib/location/districtMatch.ts";
import { isWithinIndiaBounds } from "../lib/location/validate.ts";

const OUT = "lib/location/districtCoords.ts";
const UA = process.env.NOMINATIM_USER_AGENT ?? "KisaanSaathi/1.0 (district centre table, one-time build script)";
const BASE = process.env.NOMINATIM_BASE_URL ?? "https://nominatim.openstreetmap.org";

type Entry = [lat: number, lon: number];
const previous: Record<string, Record<string, Entry>> = {};
if (existsSync(OUT)) {
  const m = /= (\{[\s\S]*\});\s*$/m.exec(readFileSync(OUT, "utf8"));
  if (m) Object.assign(previous, JSON.parse(m[1]!));
}

let last = 0;
async function search(q: string): Promise<Array<Record<string, unknown>>> {
  const wait = last + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const u = new URL("/search", BASE);
  for (const [k, v] of Object.entries({ q, format: "jsonv2", countrycodes: "in", addressdetails: "1", limit: "10", "accept-language": "en" })) u.searchParams.set(k, v);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(u, { headers: { "User-Agent": UA } });
      if (r.ok) return (await r.json()) as Array<Record<string, unknown>>;
      if (r.status === 429 || r.status === 403) throw new Error(`Nominatim refused the request (HTTP ${r.status}); stop and try later.`);
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("Nominatim refused")) throw e;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  return [];
}

const ADMIN = new Set(["state_district", "county", "district"]);

/** Spellings OpenStreetMap uses where they differ from the district list, or the headquarters town of a new district. */
const OSM_NAMES: Record<string, string[]> = {
  "Andhra Pradesh/Ananthapuramu": ["Anantapur", "Anantapuram"],
  "Chhattisgarh/Balrampur-Ramanujganj": ["Balrampur", "Ramanujganj"],
  "Chhattisgarh/Manendragarh-Chirmiri-Bharatpur": ["Manendragarh-Chirmiri-Bharatpur", "Manendragarh"],
  "Gujarat/Devbhumi Dwarka": ["Devbhoomi Dwarka", "Devbhumi Dwaraka", "Khambhalia"],
  "Gujarat/Kutch": ["Kachchh", "Kachchh District"],
  "Gujarat/Mehsana": ["Mahesana", "Mehsana"],
  "Haryana/Gurugram": ["Gurgaon", "Gurugram"],
  "Karnataka/Bagalkot": ["Bagalkote", "Bagalkot"],
  "Karnataka/Bengaluru Rural": ["Bangalore Rural", "Bengaluru Rural"],
  "Karnataka/Chikkaballapur": ["Chikkaballapura", "Chikballapur"],
  "Maharashtra/Gondia": ["Gondiya", "Gondia"],
  "Odisha/Nabarangpur": ["Nabarangapur", "Nabarangpur"],
  "Punjab/Shahid Bhagat Singh Nagar": ["Nawanshahr", "Shaheed Bhagat Singh Nagar"],
  "Rajasthan/Dholpur": ["Dhaulpur", "Dholpur"],
  "Tamil Nadu/Tiruvarur": ["Thiruvarur", "Tiruvarur"],
  "Telangana/Jayashankar Bhupalpally": ["Jayashankar Bhupalapally", "Bhupalpally"],
  "Tripura/Sepahijala": ["Sipahijala", "Sepahijala"],
  "Uttar Pradesh/Bagpat": ["Baghpat", "Bagpat"],
  "Uttar Pradesh/Shravasti": ["Shrawasti", "Shravasti", "Bhinga"], // Bhinga: headquarters town
  "Ladakh/Changthang": ["Nyoma"], // created 2024; headquarters town
};

/** Very large mountain districts whose geometric centre is far from where people farm: use the headquarters town. */
const USE_TOWN: Record<string, string> = { "Ladakh/Leh": "Leh", "Ladakh/Kargil": "Kargil" };

/** A district boundary in the right state, whose name matches; failing that, a town of that name in the state. */
function pick(results: Array<Record<string, unknown>>, state: string, names: string[], townOnly = false): { entry: Entry; kind: string } | null {
  const want = new Set(names.map(normDistrict));
  const inState = results.filter((r) => findState((r.address as Record<string, string> | undefined)?.state)?.en === state);
  const point = (r: Record<string, unknown>): Entry | null => {
    const lat = Number(r.lat), lon = Number(r.lon);
    return Number.isFinite(lat) && Number.isFinite(lon) && isWithinIndiaBounds(lat, lon) ? [Math.round(lat * 1000) / 1000, Math.round(lon * 1000) / 1000] : null;
  };
  const named = (r: Record<string, unknown>) => want.has(normDistrict(String(r.name ?? "")));
  // "Kamrup Metro" vs "Kamrup Metropolitan": one name contains the other. Reported for review.
  const similar = (r: Record<string, unknown>) => {
    const n = normDistrict(String(r.name ?? ""));
    return n.length >= 4 && [...want].some((w) => w.length >= 4 && (n.includes(w) || w.includes(n)));
  };
  const rules: Array<[string, (r: Record<string, unknown>) => boolean]> = [
    ["boundary", (r) => ADMIN.has(String(r.addresstype)) && named(r)],
    ["similar-name boundary", (r) => ADMIN.has(String(r.addresstype)) && similar(r)],
    ["town", (r) => named(r) && ["city", "town", "village", "municipality", "suburb"].includes(String(r.addresstype))],
  ];
  for (const [kind, ok] of townOnly ? rules.filter(([k]) => k === "town") : rules) {
    const r = inState.find(ok);
    const p = r && point(r);
    if (p) return { entry: p, kind: kind === "boundary" ? kind : `${kind} "${String(r.name)}"` };
  }
  return null;
}

const result: Record<string, Record<string, Entry>> = {};
const report: string[] = [];
let looked = 0;
for (const [state, list] of Object.entries(DISTRICTS)) {
  result[state] = {};
  for (const district of list) {
    let found: { entry: Entry; kind: string } | null = null;
    const town = USE_TOWN[`${state}/${district}`];
    const cached = previous[state]?.[district];
    if (cached && !town) { result[state][district] = cached; continue; }
    if (town) {
      found = pick(await search(`${town}, ${state}, India`), state, [town], true);
      looked++;
      if (found) { result[state][district] = found.entry; report.push(`${state} / ${district}: used headquarters ${found.kind}`); continue; }
    }
    // "Mysuru (Mysore)": try the current name, then the old one.
    const m = /^(.*?)\s*\((.*)\)\s*$/.exec(district);
    const names = [...(m ? [m[1]!, m[2]!] : [district]), ...(OSM_NAMES[`${state}/${district}`] ?? [])];
    for (const n of names) {
      for (const q of [`${n} district, ${state}, India`, `${n}, ${state}, India`]) {
        found = pick(await search(q), state, names);
        looked++;
        if (found) break;
      }
      if (found) break;
    }
    // A UT that is a single district (e.g. Chandigarh) is a "state" boundary in OpenStreetMap.
    if (!found && list.length === 1) {
      const r = (await search(`${state}, India`)).find((x) => findState(String(x.name)) !== null);
      if (r) found = { entry: [Math.round(Number(r.lat) * 1000) / 1000, Math.round(Number(r.lon) * 1000) / 1000], kind: "state" };
    }
    if (found) {
      result[state][district] = found.entry;
      if (found.kind !== "boundary") report.push(`${state} / ${district}: used ${found.kind} point`);
    } else report.push(`${state} / ${district}: NOT FOUND`);
    if (looked % 50 === 0) console.log(`${looked} lookups…`);
  }
}

const body = `/**
 * Centre point (latitude, longitude; 3 decimals, about 100 m) of every district in districts.ts, so a farmer who
 * picks a district always gets a location for weather and area data, without depending on a live place search.
 * Generated by scripts/build-district-coords.ts from OpenStreetMap district boundaries via Nominatim
 * (built ${new Date().toISOString().slice(0, 10)}). Data © OpenStreetMap contributors, ODbL 1.0 (openstreetmap.org/copyright).
 * A centre is an approximation for a whole district; a typed village refines it.
 */
export const DISTRICT_COORDS: Record<string, Record<string, [number, number]>> = ${JSON.stringify(result, null, 1)};
`;
writeFileSync(OUT, body);
const total = Object.values(result).reduce((a, d) => a + Object.keys(d).length, 0);
console.log(`Done: ${total} of ${Object.values(DISTRICTS).flat().length} districts (${looked} new lookups). Written to ${OUT}`);
for (const line of report) console.log(" -", line);
