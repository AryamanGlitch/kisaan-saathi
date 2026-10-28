"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { useLocation } from "@/components/LocationProvider";
import { useFarm } from "@/components/FarmProvider";
import { displayed, useWeather } from "@/components/useWeather";
import { advisoryText } from "@/components/advisoryText";
import { SourceLine } from "@/components/SourceLine";
import { KccHelp } from "@/components/KccHelp";
import { AreaCrops } from "@/components/AreaCrops";
import { CropSelect } from "@/components/CropSelect";
import { useAreaCrops } from "@/components/useAreaCrops";
import { LinkButton, Notice, PageTitle } from "@/components/ui";
import { CROPS, type CropId } from "@/lib/crops/catalog";
import { DISTRICT_CROP_DATA } from "@/lib/crops/data";
import { recommendCrops, type RecommendResult } from "@/lib/crops/engine";
import { windowText } from "@/lib/crops/format";
import type { WaterRegime } from "@/lib/crops/types";
import { deriveAdvisories } from "@/lib/weather/advisories";
import { SOURCES } from "@/lib/sources";
import { todayInIndia } from "@/lib/time";
import { formatWeekday } from "@/lib/client/format";

export default function GrowPage() {
  const { t, lang } = useLanguage();
  const { location, ready } = useLocation();
  const { profile } = useFarm();
  const { state: weatherState } = useWeather(location, ready);
  const area = useAreaCrops(location?.state, location?.district);
  const id = useId();
  const [date, setDate] = useState(() => todayInIndia(new Date()));
  const [water, setWater] = useState<WaterRegime | "">("");
  const [previous, setPrevious] = useState<CropId | "">("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ res: RecommendResult; date: string; water: WaterRegime } | null>(null);
  const effectiveWater: WaterRegime | "" = water || (profile.water === "unknown" ? "" : profile.water);

  if (!ready) return <Notice>{t("common.loading")}</Notice>;
  if (!location) {
    return (
      <div className="space-y-6">
        <PageTitle>{t("section.grow")}</PageTitle>
        <Notice>{t("grow.needLocation")}</Notice>
        <LinkButton href="/my-farm">{t("nav.setLocation")}</LinkButton>
      </div>
    );
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError(t("grow.errDate"));
    if (!effectiveWater) return setError(t("grow.chooseWater"));
    setError(null);
    const shown = displayed(weatherState);
    const advisories = shown ? deriveAdvisories(shown.payload.report) : [];
    const res = recommendCrops(
      { state: location!.state, district: location!.district, sowingDate: date, water: effectiveWater, previousCrop: previous || null },
      DISTRICT_CROP_DATA,
      advisories,
    );
    setResult({ res, date, water: effectiveWater });
  }

  const cropName = (c: CropId) => CROPS[c][lang];
  const input = "min-h-14 w-full rounded-lg border-2 border-ink bg-paper px-3 text-lg";
  const today = todayInIndia(new Date());

  return (
    <div className="space-y-8">
      <PageTitle>{t("section.grow")}</PageTitle>
      <p className="text-lg">{t("grow.intro")}</p>
      <AreaCrops district={location.district} data={area} />

      <form onSubmit={submit} noValidate className="space-y-5">
        <div className="space-y-1">
          <label htmlFor={`${id}-date`} className="block text-lg font-bold">{t("grow.date")}</label>
          <input id={`${id}-date`} type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <fieldset className="space-y-2">
          <legend className="text-lg font-bold">{t("farm.water")}</legend>
          {(["irrigated", "rainfed"] as const).map((w) => (
            <label key={w} className={`flex min-h-14 items-center gap-3 rounded-lg border-2 px-4 ${effectiveWater === w ? "border-leaf bg-leaf-wash" : "border-ink bg-white/60"}`}>
              <input type="radio" name="water" className="h-6 w-6 accent-leaf" checked={effectiveWater === w} onChange={() => setWater(w)} />
              <span className="text-lg">{t(`farm.water.${w}`)}</span>
            </label>
          ))}
        </fieldset>
        <div className="space-y-1">
          <label htmlFor={`${id}-prev`} className="block text-lg font-bold">{t("grow.previous")}</label>
          <CropSelect id={`${id}-prev`} className={input} value={previous} onChange={setPrevious} areaCropIds={area.cropIds} areaName={area.cropArea} emptyLabel={t("farm.noCrop")} />
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        <button type="submit" className="inline-flex min-h-14 w-full items-center justify-center lift rounded-lg bg-leaf px-5 shadow-sm text-lg font-bold text-white hover:bg-leaf-dark">
          {t("grow.show")}
        </button>
      </form>

      {result && result.res.kind === "no-data" && (
        <div className="space-y-4">
          <Notice tone="caution">{t("grow.noData", { district: location.district })}</Notice>
          <p className="text-lg">{t("grow.noDataHelp")}</p>
          <KccHelp />
        </div>
      )}

      {result && result.res.kind === "ok" && (() => {
        const r = result.res;
        const src = SOURCES[r.data.sourceId];
        const dateLabel = formatWeekday(result.date, lang);
        return (
          <section aria-labelledby="results-title" className="space-y-6 glass-card">
            <h2 id="results-title" className="text-2xl font-extrabold">{t("grow.resultsTitle", { date: dateLabel })}</h2>
            {r.suggestions.length === 0 && <Notice>{t("grow.none")}</Notice>}
            <ol className="space-y-6">
              {r.suggestions.map((s) => (
                <li key={s.cropId} className="space-y-2 border-l-4 border-leaf pl-4">
                  <h3 className="text-2xl font-extrabold">{cropName(s.cropId)}</h3>
                  <p className="text-xl font-bold text-leaf">
                    {s.timing.status === "open"
                      ? s.timing.daysLeft === 0 ? t("grow.openLastDay") : t("grow.open", { n: s.timing.daysLeft })
                      : t("grow.soon", { n: s.timing.daysUntil })}
                  </p>
                  <p className="text-lg">{t("grow.window", { regime: t(`regime.${s.window.regime}`), window: windowText(s.window, lang, t) })}</p>
                  {s.usesRainfedWindow && <p className="text-base">{t("grow.rainfedWindow")}</p>}
                  {s.sameAsPrevious && <Notice tone="caution">{t("grow.samePrevious")}</Notice>}
                  {s.forecastRisks.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-base font-bold">{t("grow.risk")}</p>
                      <ul className="list-disc space-y-1 pl-6 text-base">
                        {s.forecastRisks.map((a) => <li key={a.kind}>{advisoryText(a, t, lang, today)}</li>)}
                      </ul>
                    </div>
                  )}
                  <p className="text-base">{t("grow.durationUnknown")}</p>
                  <Link
                    className="inline-block min-h-12 py-2 text-lg font-bold text-leaf underline underline-offset-4"
                    href={`/ask?q=${encodeURIComponent(t("grow.askPrompt", { crop: cropName(s.cropId), date: dateLabel, water: t(`regime.${result.water}`) }))}`}
                  >
                    {t("grow.ask", { crop: cropName(s.cropId) })}
                  </Link>
                </li>
              ))}
            </ol>

            {r.notNow.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xl font-extrabold">{t("grow.notNowTitle")}</h3>
                <ul className="list-disc space-y-1 pl-6 text-lg">
                  {r.notNow.map((n) => (
                    <li key={n.cropId}>
                      {n.reason === "needs-irrigation"
                        ? t("grow.notNow.irrigation", { crop: cropName(n.cropId) })
                        : t("grow.notNow.closed", { crop: cropName(n.cropId), n: n.nextOpensInDays ?? "?" })}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold">{t("grow.verifyTitle")}</h3>
              <ul className="list-disc space-y-1 pl-6 text-lg">
                <li>{t("grow.verify1")}</li>
                <li>{t("grow.verify2")}</li>
                <li>{t("grow.verify3")}</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold">{t("grow.assumptions")}</h3>
              <ul className="list-disc space-y-1 pl-6 text-base">
                <li>{t("grow.assume.district")}</li>
                <li>{t("grow.assume.soil")}</li>
                <li>{t("grow.assume.noGuarantee")}</li>
              </ul>
              <SourceLine source={src} />
              <p className="text-base">{t("src.section", { s: r.data.sourceSection })}</p>
            </div>

            {r.data.kvk && (
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold">{t("grow.kvk")}</h3>
                <p className="text-lg">{r.data.kvk.name}</p>
                {r.data.kvk.phone && <a className="block min-h-12 py-2 text-lg font-bold text-leaf underline" href={`tel:${r.data.kvk.phone.replace(/\D/g, "")}`}>{r.data.kvk.phone}</a>}
                {r.data.kvk.email && <a className="block text-lg underline" href={`mailto:${r.data.kvk.email}`}>{r.data.kvk.email}</a>}
                {r.data.kvk.sourceId !== r.data.sourceId && <SourceLine source={SOURCES[r.data.kvk.sourceId]} />}
              </div>
            )}
          </section>
        );
      })()}
    </div>
  );
}
