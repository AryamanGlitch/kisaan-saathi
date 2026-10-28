"use client";

import { useEffect, useId, useState, type ChangeEvent, type FormEvent } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { useLocation } from "@/components/LocationProvider";
import { useCachedGet } from "@/components/useCachedGet";
import { SourceLine } from "@/components/SourceLine";
import { SOIL_CARD_KEY } from "@/components/Chat";
import { Button, LinkButton, Notice, PageTitle } from "@/components/ui";
import { CONCERN, PARAM_BY_ID, parseSoilNumber, rateAll, SOIL_PARAMS, isSoilCard, type Rating, type SoilCard, type SoilParam, type SoilValues } from "@/lib/soil/shc";
import { isAreaSummary, summariseArea, type AreaSummary } from "@/lib/soil/areaData";
import { findVillages, sampleCount, shares, sumCounts, type SoilDistrictFile, type SoilStateFile } from "@/lib/soil/nutrientStatus";
import { findSoilDistrict, loadSoilDistrict, loadSoilState } from "@/lib/client/soilDataset";
import type { SoilPayload } from "@/lib/server/soilService";
import { readJson, removeKey, writeJson } from "@/lib/client/storage";
import { formatDate, formatTime } from "@/lib/client/format";
import { errorKey } from "@/lib/client/errors";
import { SOURCES } from "@/lib/sources";
import type { StringKey } from "@/lib/i18n/strings";

const AREA_KEY = "ks:soilArea:v1";
const VILLAGE_KEY = "ks:soilVillage:v1";
const MAX_FILE_BYTES = 40 * 1024 * 1024;

function RatingBadge({ rating }: { rating: Rating }) {
  const { t } = useLanguage();
  const bad = CONCERN.includes(rating);
  return (
    <span className={`inline-block rounded border-2 px-2 text-base font-bold ${bad ? "border-caution bg-caution-wash text-caution" : "border-leaf text-leaf"}`}>
      {t(`rating.${rating}` as StringKey)}
    </span>
  );
}

export default function SoilPage() {
  const { t } = useLanguage();
  return (
    <div className="space-y-10">
      <PageTitle>{t("section.soil")}</PageTitle>
      <p className="text-lg">{t("soil.intro")}</p>
      <CardSection />
      <MoistureSection />
      <VillageSection />
      <WhereSection />
    </div>
  );
}

function CardSection() {
  const { t, lang } = useLanguage();
  const id = useId();
  const [card, setCard] = useState<SoilCard | null>(null);
  const [editing, setEditing] = useState(false);
  const [inputs, setInputs] = useState<Partial<Record<SoilParam, string>>>({});
  const [testDate, setTestDate] = useState("");
  const [errors, setErrors] = useState<Partial<Record<SoilParam | "form", string>>>({});

  useEffect(() => {
    const c = readJson(SOIL_CARD_KEY);
    if (isSoilCard(c)) setCard(c);
    else setEditing(true);
  }, []);

  function startEdit() {
    const vals: Partial<Record<SoilParam, string>> = {};
    for (const [k, v] of Object.entries(card?.values ?? {})) vals[k as SoilParam] = String(v);
    setInputs(vals);
    setTestDate(card?.testDate ?? "");
    setErrors({});
    setEditing(true);
  }

  function save(e: FormEvent) {
    e.preventDefault();
    const values: SoilValues = {};
    const errs: typeof errors = {};
    for (const d of SOIL_PARAMS) {
      const raw = inputs[d.id]?.trim();
      if (!raw) continue;
      const v = parseSoilNumber(raw);
      if (v === null || v < d.min || v > d.max) errs[d.id] = t("soil.errValue", { min: d.min, max: d.max });
      else values[d.id] = v;
    }
    if (!Object.keys(errs).length && !Object.keys(values).length) errs.form = t("soil.errNone");
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const c: SoilCard = { version: 1, values, testDate: /^\d{4}-\d{2}-\d{2}$/.test(testDate) ? testDate : null, savedAt: new Date().toISOString() };
    writeJson(SOIL_CARD_KEY, c);
    setCard(c);
    setEditing(false);
  }

  function remove() {
    removeKey(SOIL_CARD_KEY);
    setCard(null);
    setInputs({});
    setTestDate("");
    setEditing(true);
  }

  const name = (p: SoilParam) => (lang === "hi" ? PARAM_BY_ID[p].hi : PARAM_BY_ID[p].en);
  const input = "min-h-14 w-full rounded-lg border-2 border-ink bg-paper px-3 text-lg";

  return (
    <section aria-labelledby={`${id}-t`} className="space-y-4">
      <h2 id={`${id}-t`} className="text-2xl font-extrabold">{t("soil.cardTitle")}</h2>
      {editing ? (
        <form onSubmit={save} noValidate className="space-y-4">
          <p className="text-lg">{t("soil.cardHelp")}</p>
          <div className="grid grid-cols-2 gap-3">
            {SOIL_PARAMS.map((d) => (
              <div key={d.id} className="space-y-1">
                <label htmlFor={`${id}-${d.id}`} className="block text-base font-bold">{name(d.id)}{d.unit ? ` (${d.unit})` : ""}</label>
                <input id={`${id}-${d.id}`} inputMode="decimal" className={input} value={inputs[d.id] ?? ""}
                  onChange={(e) => setInputs({ ...inputs, [d.id]: e.target.value })} aria-invalid={Boolean(errors[d.id])}
                  aria-describedby={errors[d.id] ? `${id}-${d.id}-e` : undefined} />
                {errors[d.id] && <p id={`${id}-${d.id}-e`} className="text-sm font-semibold text-alert">{errors[d.id]}</p>}
              </div>
            ))}
          </div>
          <p className="text-base">{t("soil.unitNote")}</p>
          <div className="space-y-1">
            <label htmlFor={`${id}-date`} className="block text-lg font-bold">{t("soil.testDate")}</label>
            <input id={`${id}-date`} type="date" className={input} value={testDate} onChange={(e) => setTestDate(e.target.value)} />
          </div>
          {errors.form && <Notice tone="error">{errors.form}</Notice>}
          <button type="submit" className="inline-flex min-h-14 w-full items-center justify-center lift rounded-lg bg-leaf px-5 shadow-sm text-lg font-bold text-white hover:bg-leaf-dark">
            {t("soil.save")}
          </button>
          {card && <Button variant="secondary" onClick={() => setEditing(false)}>{t("common.cancel")}</Button>}
        </form>
      ) : card ? (
        <div className="space-y-4">
          <h3 className="text-xl font-extrabold">{t("soil.resultsTitle")}</h3>
          {card.testDate && <p className="text-lg">{t("soil.tested", { date: formatDate(`${card.testDate}T12:00:00+05:30`, lang) })}</p>}
          {card.testDate && Date.now() - Date.parse(card.testDate) > 3 * 365 * 864e5 && <Notice tone="caution">{t("soil.oldTest")}</Notice>}
          {(() => {
            const rated = rateAll(card.values);
            const concern = rated.filter((r) => CONCERN.includes(r.rating));
            const fine = rated.filter((r) => !CONCERN.includes(r.rating));
            const list = (items: typeof rated) => (
              <ul className="divide-y divide-rule border-y border-rule">
                {items.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                    <span className="text-lg"><span className="font-bold">{name(r.id)}</span>: {r.value}{PARAM_BY_ID[r.id].unit ? ` ${PARAM_BY_ID[r.id].unit}` : ""}</span>
                    <RatingBadge rating={r.rating} />
                  </li>
                ))}
              </ul>
            );
            return (
              <>
                {concern.length > 0 && <div className="space-y-2"><h4 className="text-lg font-extrabold">{t("soil.attention")}</h4>{list(concern)}</div>}
                {fine.length > 0 && <div className="space-y-2"><h4 className="text-lg font-extrabold">{t("soil.ok")}</h4>{list(fine)}</div>}
              </>
            );
          })()}
          <Notice>{t("soil.followCard")}</Notice>
          <p className="text-base">{t("soil.usedByAssistant")}</p>
          <p className="text-base font-semibold">{t("soil.limitsSource")}</p>
          <SourceLine source={SOURCES["iiss-shc-limits"]} />
          <Button onClick={startEdit}>{t("soil.edit")}</Button>
          <Button variant="secondary" onClick={remove}>{t("soil.delete")}</Button>
        </div>
      ) : null}
    </section>
  );
}

function MoistureSection() {
  const { t, lang } = useLanguage();
  const { location, ready } = useLocation();
  const id = useId();
  const coords = location && location.lat !== null && location.lon !== null ? location : null;
  const { state, data, fromCache, retry } = useCachedGet<SoilPayload>(ready && coords ? `/api/soil?lat=${coords.lat}&lon=${coords.lon}` : null, "ks:soilNow:v1");
  const pct = (v: number | null) => (v === null ? "—" : String(Math.round(v * 100)));
  return (
    <section aria-labelledby={`${id}-t`} className="space-y-3 glass-card">
      <h2 id={`${id}-t`} className="text-2xl font-extrabold">{t("soil.moistTitle")}</h2>
      {!coords ? (
        <>
          <Notice>{t("soil.needCoords")}</Notice>
          <LinkButton href="/my-farm" variant="secondary">{t("nav.setLocation")}</LinkButton>
        </>
      ) : (
        <>
          {state.status === "loading" && !data && <Notice>{t("common.loading")}</Notice>}
          {state.status === "error" && !data && (
            <>
              <Notice tone="error">{t(errorKey(state.code))}</Notice>
              <Button variant="secondary" onClick={retry}>{t("common.tryAgain")}</Button>
            </>
          )}
          {data && (
            <>
              {(fromCache || data.stale) && <Notice tone="caution">{t("weather.stale")}</Notice>}
              <ul className="space-y-1 text-lg">
                {data.soil.moisture0to1 !== null && <li>{t("soil.moistTop", { v: pct(data.soil.moisture0to1) })}</li>}
                {data.soil.moisture3to9 !== null && <li className="font-bold">{t("soil.moistRoot", { v: pct(data.soil.moisture3to9) })}</li>}
                {data.soil.moisture9to27 !== null && <li>{t("soil.moistDeep", { v: pct(data.soil.moisture9to27) })}</li>}
                {data.soil.temp6cmC !== null && <li>{t("soil.temp", { v: Math.round(data.soil.temp6cmC) })}</li>}
              </ul>
              {data.soil.trend3to9 !== null && (
                <p className="text-lg">{t(data.soil.trend3to9 >= 0.005 ? "soil.wetter" : data.soil.trend3to9 <= -0.005 ? "soil.drier" : "soil.steady")}</p>
              )}
              <p className="text-base">{t("soil.moistNote")}</p>
              <p className="text-base">{t("weather.updated", { time: formatTime(data.fetchedAt, lang) })}</p>
              <SourceLine source={SOURCES["open-meteo"]} />
            </>
          )}
        </>
      )}
    </section>
  );
}

type DistrictEntry = SoilStateFile["districts"][number];
type VillagePick = { district: string; block: number | null; village: number | null };

/** Soil Health Card test results for the farmer's district, block or village, from the bundled national data. */
function VillageSection() {
  const { t, lang } = useLanguage();
  const { location } = useLocation();
  const id = useId();
  const [stateFile, setStateFile] = useState<SoilStateFile | null>(null);
  const [entry, setEntry] = useState<DistrictEntry | null>(null);
  const [file, setFile] = useState<SoilDistrictFile | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "none" | "ready">("idle");
  const [pick, setPick] = useState<VillagePick | null>(null);

  const state = location?.state ?? null;
  const district = location?.district ?? null;
  const place = location?.place ?? null;
  useEffect(() => {
    setStateFile(null); setEntry(null); setFile(null); setPick(null);
    if (!state || !district) { setStatus("idle"); return; }
    let alive = true;
    setStatus("loading");
    void (async () => {
      const sf = await loadSoilState(state);
      const e = sf ? findSoilDistrict(sf, district) : null;
      const df = e ? await loadSoilDistrict(e.file) : null;
      if (!alive) return;
      setStateFile(sf); setEntry(e); setFile(df);
      setStatus(e ? "ready" : "none");
      if (!df) return;
      // A saved choice for this district wins; otherwise try the farm's village name.
      const saved = readJson(VILLAGE_KEY) as { district?: string; block?: string; village?: string } | null;
      if (saved?.district === df.district && saved.block) {
        const b = df.blocks.indexOf(saved.block);
        const v = saved.village ? df.villages.findIndex((x) => x[0] === b && x[1] === saved.village) : -1;
        if (b >= 0) { setPick({ district: df.district, block: b, village: v >= 0 ? v : null }); return; }
      }
      const found = findVillages(df, place);
      if (found.length) setPick({ district: df.district, block: df.villages[found[0]!]![0], village: found[0]! });
    })();
    return () => { alive = false; };
  }, [state, district, place]);

  function choose(block: number | null, village: number | null) {
    if (!file) return;
    setPick({ district: file.district, block, village });
    if (block === null) removeKey(VILLAGE_KEY);
    else writeJson(VILLAGE_KEY, { district: file.district, block: file.blocks[block], village: village === null ? null : file.villages[village]![1] });
  }

  const block = pick?.block ?? null;
  const village = pick?.village ?? null;
  const inBlock = file && block !== null ? file.villages.map((v, i) => [v, i] as const).filter(([v]) => v[0] === block) : [];
  const counts = !entry ? null
    : file && village !== null ? file.villages[village]![2]
      : file && block !== null ? sumCounts(inBlock.map(([v]) => v[2]))
        : entry.counts;
  const where = !entry ? "" : file && village !== null ? t("soil.vVillage", { name: file.villages[village]![1], block: file.blocks[file.villages[village]![0]]! })
    : file && block !== null ? t("soil.vBlock", { name: file.blocks[block]! }) : t("soil.vDistrict", { name: entry.name });
  const name = (p: SoilParam) => (lang === "hi" ? PARAM_BY_ID[p].hi : PARAM_BY_ID[p].en);
  const select = "min-h-14 w-full rounded-lg border-2 border-ink bg-paper px-3 text-lg";
  const n = (x: number) => x.toLocaleString(lang === "hi" ? "hi-IN" : "en-IN");

  return (
    <section aria-labelledby={`${id}-t`} className="space-y-3 glass-card">
      <h2 id={`${id}-t`} className="text-2xl font-extrabold">{t("soil.vTitle")}</h2>
      <p className="text-lg">{t("soil.vHelp")}</p>
      {!location ? (
        <LinkButton href="/my-farm" variant="secondary">{t("nav.setLocation")}</LinkButton>
      ) : status === "loading" ? (
        <Notice>{t("common.loading")}</Notice>
      ) : status === "none" || !entry || !counts ? (
        <Notice>{t(stateFile ? "soil.vNoDistrict" : "soil.vNoState", { district: location.district, state: location.state })}</Notice>
      ) : (
        <div className="space-y-3">
          {file && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor={`${id}-b`} className="block text-base font-bold">{t("soil.vBlockLabel")}</label>
                <select id={`${id}-b`} className={select} value={block ?? ""} onChange={(e) => choose(e.target.value === "" ? null : Number(e.target.value), null)}>
                  <option value="">{t("soil.vAllDistrict")}</option>
                  {file.blocks.map((b, i) => <option key={b} value={i}>{b}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor={`${id}-v`} className="block text-base font-bold">{t("soil.vVillageLabel")}</label>
                <select id={`${id}-v`} className={select} value={village ?? ""} disabled={block === null}
                  onChange={(e) => choose(block, e.target.value === "" ? null : Number(e.target.value))}>
                  <option value="">{t("soil.vAllBlock")}</option>
                  {inBlock.map(([v, i]) => <option key={i} value={i}>{v[1]}</option>)}
                </select>
              </div>
            </div>
          )}
          <p className="text-lg font-bold">{t("soil.vSamples", { n: n(sampleCount(counts)), where })}</p>
          <ul className="divide-y divide-rule border-y border-rule">
            {shares(counts).map((s) => (
              <li key={s.id} className="space-y-2 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-lg font-bold">{name(s.id)}</span>
                  {s.concernPct > 0 && <span className={`text-base font-bold ${s.concernPct >= 50 ? "text-caution" : ""}`}>{t("soil.areaShare", { p: s.concernPct })}</span>}
                </div>
                <div className="flex h-3 overflow-hidden rounded-full bg-leaf-wash" aria-hidden="true">
                  {s.levels.map((l) => l.pct > 0 && (
                    <span key={l.rating} style={{ width: `${l.pct}%` }} className={CONCERN.includes(l.rating) ? "bg-caution" : "bg-leaf"} />
                  ))}
                </div>
                <p className="text-base">{s.levels.map((l) => `${t(`rating.${l.rating}` as StringKey)} ${l.pct}%`).join(" · ")} ({t("soil.vTests", { n: n(s.total) })})</p>
              </li>
            ))}
          </ul>
          <Notice tone="caution">{t("soil.areaCaution")}</Notice>
          {stateFile && <p className="text-base">{t("soil.vSource", { source: stateFile.source, years: (file?.years ?? stateFile.years).join(", ") })}</p>}
          <SourceLine source={SOURCES["shc-portal"]} />
        </div>
      )}
      <details className="space-y-3">
        <summary className="cursor-pointer text-lg font-bold underline underline-offset-4">{t("soil.vOwnFile")}</summary>
        <FileSection />
      </details>
    </section>
  );
}

/** Older option: the farmer loads their own soil test CSV with measured values. */
function FileSection() {
  const { t, lang } = useLanguage();
  const { location } = useLocation();
  const [summary, setSummary] = useState<AreaSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = readJson(AREA_KEY);
    if (isAreaSummary(s)) setSummary(s);
  }, []);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !location) return;
    if (f.size > MAX_FILE_BYTES) return setError(t("soil.areaTooBig"));
    setBusy(true);
    setError(null);
    try {
      const text = await f.text();
      const r = summariseArea(text, f.name, { lat: location.lat, lon: location.lon, place: location.place, district: location.district });
      if (r.ok) {
        setSummary(r.summary);
        writeJson(AREA_KEY, r.summary);
      } else setError(t(`soil.area.${r.reason}` as StringKey));
    } catch {
      setError(t("err.SERVER"));
    } finally {
      setBusy(false);
    }
  }

  const name = (p: SoilParam) => (lang === "hi" ? PARAM_BY_ID[p].hi : PARAM_BY_ID[p].en);
  return (
    <div className="space-y-3 pt-3">
      <p className="text-lg">{t("soil.areaHelp")}</p>
      {!location ? (
        <LinkButton href="/my-farm" variant="secondary">{t("nav.setLocation")}</LinkButton>
      ) : (
        <label className="inline-flex min-h-14 w-full cursor-pointer items-center justify-center lift rounded-lg border-2 border-ink bg-white/60 px-5 text-lg font-bold shadow-sm hover:bg-ink hover:text-white">
          {t("soil.areaChoose")}
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => void onFile(e)} />
        </label>
      )}
      {busy && <Notice>{t("soil.areaReading")}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      {summary && (
        <div className="space-y-3">
          <p className="text-lg font-bold">
            {summary.match.kind === "radius"
              ? t("soil.areaRadius", { n: summary.samples, km: summary.match.km })
              : summary.match.kind === "village"
                ? t("soil.areaVillage", { n: summary.samples, name: summary.match.name })
                : t("soil.areaDistrict", { n: summary.samples, name: summary.match.name })}
          </p>
          {summary.years.length > 0 && <p className="text-base">{t("soil.areaYears", { years: summary.years.join(", ") })}</p>}
          <ul className="divide-y divide-rule border-y border-rule">
            {summary.params.map((p) => (
              <li key={p.id} className="space-y-1 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-lg"><span className="font-bold">{name(p.id)}</span> — {t("soil.areaMedian")}: {p.median}{PARAM_BY_ID[p.id].unit ? ` ${PARAM_BY_ID[p.id].unit}` : ""}</span>
                  <RatingBadge rating={p.rating} />
                </div>
                {p.lowShare > 0 && <p className="text-base">{t("soil.areaShare", { p: p.lowShare })}</p>}
              </li>
            ))}
          </ul>
          <Notice tone="caution">{t("soil.areaCaution")}</Notice>
          <p className="text-base">{t("soil.areaFile", { name: summary.fileName, date: formatDate(summary.loadedAt, lang) })}</p>
          <Button variant="secondary" onClick={() => { removeKey(AREA_KEY); setSummary(null); }}>{t("soil.areaRemove")}</Button>
        </div>
      )}
    </div>
  );
}

function WhereSection() {
  const { t } = useLanguage();
  const id = useId();
  return (
    <section aria-labelledby={`${id}-t`} className="space-y-3 glass-card">
      <h2 id={`${id}-t`} className="text-2xl font-extrabold">{t("soil.whereTitle")}</h2>
      <ul className="list-disc space-y-1 pl-6 text-lg">
        <li>{t("soil.where1")}</li>
        <li>{t("soil.where2")}</li>
      </ul>
      <a href={SOURCES["shc-download"].url} target="_blank" rel="noopener noreferrer"
        className="inline-flex min-h-14 w-full items-center justify-center lift rounded-lg bg-leaf px-5 shadow-sm text-lg font-bold text-white hover:bg-leaf-dark">
        {t("soil.downloadCard")}
      </a>
      <SourceLine source={SOURCES["shc-download"]} />
    </section>
  );
}
