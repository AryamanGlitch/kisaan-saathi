import type { WeatherReport } from "../weather/openMeteo.ts";
import type { DistrictCropData } from "../crops/types.ts";
import { CROPS, isCropId } from "../crops/catalog.ts";
import type { SchemeRecord } from "../schemes/types.ts";
import { SOURCES, type SourceId } from "../sources.ts";
import type { AssistantRequest } from "./types.ts";
import type { DistrictGrown } from "../crops/grown.ts";
import { rateAll, PARAM_BY_ID, type SoilParam } from "../soil/shc.ts";

export function systemInstruction(lang: "en" | "hi"): string {
  const language = lang === "hi" ? "simple Hindi (Devanagari script)" : "simple English";
  return [
    `You are Kisaan Saathi, a farming assistant for Indian farmers. Reply in ${language}, in short sentences a first-time smartphone user can understand.`,
    "Scope: crops, soil, irrigation, how weather affects farm work, pests and diseases, fertilizer basics, farm government schemes, and where to get help. For anything else set kind to out_of_scope and say what you can help with.",
    "RULES:",
    "1. Facts about weather, sowing windows, schemes, phone numbers and offices must come from the CONTEXT block. Never invent weather, scheme amounts, deadlines, eligibility rules, phone numbers or electricity/water timings. If CONTEXT does not have it, say you do not know and point to the official source or the Kisan Call Centre 1800-180-1551.",
    "2. Never name pesticide, fungicide or herbicide products or active ingredients, and never give doses, mixing ratios, spray intervals or waiting periods. Give non-chemical steps (monitoring, removing badly affected plants, field sanitation, drainage, resistant varieties, timely sowing). If a chemical may be needed, say so and tell the farmer to use only a product whose label lists that crop and pest, follow the label, and confirm with the KVK or Kisan Call Centre.",
    "3. Never give fertilizer quantities. Recommend a soil test (Soil Health Card) and asking the KVK for amounts.",
    "4. A diagnosis from a description is only a possibility. Use 'may be'. Put the specific things to look at in checkNext.",
    "5. If important facts are missing (crop, growth stage, which plant part, how many plants, recent weather, recent sprays or fertilizer), set kind to followup and ask at most 3 short questions. Do not ask for anything already given in CONTEXT or the conversation. Fill unused fields with empty strings or empty arrays.",
    "6. Never promise yield, income or results.",
    "7. In sourceIds, list only ids of CONTEXT items you actually used. Never cite anything else.",
    "8. Always tell the farmer when they should contact the KVK, an agriculture officer or the Kisan Call Centre (whenToSeeExpert).",
  ].join("\n");
}

export interface ContextParts {
  todayIst: string;
  request: AssistantRequest;
  weather: { report: WeatherReport; fetchedAt: string } | null;
  district: DistrictCropData | null;
  schemes: SchemeRecord[];
  grown?: DistrictGrown | null;
}

/** Builds the CONTEXT block and the list of source ids the model may cite. */
export function buildContext(p: ContextParts): { text: string; allowedSourceIds: SourceId[] } {
  const lines: string[] = [`CONTEXT (date in India: ${p.todayIst})`];
  const allowed = new Set<SourceId>(["kcc-mkisan"]);
  const loc = p.request.location;
  lines.push(loc ? `Farmer location: ${loc.label} (state ${loc.state}, district ${loc.district}).` : "Farmer location: not given.");
  const farm = p.request.farm;
  if (farm) {
    const crop = farm.mainCrop && isCropId(farm.mainCrop) ? CROPS[farm.mainCrop].en : "not given";
    lines.push(`Farm: water = ${farm.water}; main crop = ${crop}.`);
  }

  const soil = p.request.soil;
  if (soil && Object.keys(soil.values).length) {
    allowed.add("iiss-shc-limits");
    const rated = rateAll(soil.values).map((r) => `${PARAM_BY_ID[r.id as SoilParam].en} ${r.value}${PARAM_BY_ID[r.id as SoilParam].unit ? " " + PARAM_BY_ID[r.id as SoilParam].unit : ""} = ${r.rating}`);
    lines.push(`[iiss-shc-limits] Farmer's own Soil Health Card${soil.testDate ? ` (tested ${soil.testDate})` : ""}, rated with ICAR-IISS critical limits: ${rated.join("; ")}. The card itself lists crop-wise fertilizer doses and amendments: tell the farmer to follow the card or ask the KVK; never give amounts yourself.`);
  }

  if (p.weather) {
    allowed.add("open-meteo");
    const c = p.weather.report.current;
    lines.push(`[open-meteo] Weather forecast model data fetched ${p.weather.fetchedAt} (a forecast, NOT an official IMD warning). Now: ${c.temperatureC}°C, humidity ${c.humidityPct ?? "unknown"}%, wind ${c.windKmh ?? "unknown"} km/h.`);
    for (const d of p.weather.report.daily.slice(0, 3)) {
      lines.push(`  ${d.date}: max ${d.maxC ?? "?"}°C, min ${d.minC ?? "?"}°C, rain ${d.precipMm ?? "?"} mm, rain chance ${d.precipProbPct ?? "unknown"}%, max wind ${d.windMaxKmh ?? "?"} km/h.`);
    }
  } else {
    lines.push("Weather: not available. Do not state any weather values.");
  }

  if (p.district) {
    allowed.add(p.district.sourceId);
    const src = SOURCES[p.district.sourceId];
    lines.push(`[${p.district.sourceId}] ${src.title} (${src.publisher}, ${src.documentDate ?? "undated"}), normal sowing windows:`);
    for (const r of p.district.records) {
      lines.push(`  ${CROPS[r.cropId].en}: ${r.windows.map((w) => w.sourceText).join("; ")}.`);
    }
    if (p.district.kvk) lines.push(`  KVK listed in that plan: ${p.district.kvk.name}${p.district.kvk.phone ? `, phone ${p.district.kvk.phone}` : ""} (contact from ${src.documentDate ?? "undated"} document; may have changed).`);
  } else {
    lines.push("District sowing windows: no verified data for this district. Do not state sowing dates as facts.");
  }

  if (p.grown) {
    allowed.add(p.grown.sourceId);
    lines.push(`[${p.grown.sourceId}] Major crops grown in ${p.grown.district} (official district plan): ${p.grown.crops.map((c) => CROPS[c].en).join(", ")}. Prefer these when suggesting crops; say so if a crop is not on this list.`);
  }

  for (const s of p.schemes) {
    for (const id of s.sourceIds) allowed.add(id);
    lines.push(`[${s.sourceIds.join(",")}] Scheme ${s.name.en}: ${s.summary.en} ${s.benefits?.en ?? ""} Apply/info: ${s.applyUrl}${s.status === "needs-verification" ? " (figures not confirmed for the current year)" : ""}`);
  }

  lines.push("[kcc-mkisan] Kisan Call Centre (Government of India): toll-free 1800-180-1551, answers farming questions in local languages.");
  return { text: lines.join("\n"), allowedSourceIds: [...allowed] };
}
