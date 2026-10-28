"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { useLocation } from "@/components/LocationProvider";
import { useFarm } from "@/components/FarmProvider";
import { Chat } from "@/components/Chat";
import { CropSelect } from "@/components/CropSelect";
import { useAreaCrops } from "@/components/useAreaCrops";
import { SourceLine } from "@/components/SourceLine";
import { Notice, PageTitle } from "@/components/ui";
import { CROPS, type CropId } from "@/lib/crops/catalog";
import { findDistrictProblems, GROWTH_STAGES, PLANT_PARTS, type GrowthStage, type PlantPart } from "@/lib/cropcare/data";
import { SOURCES } from "@/lib/sources";
import type { StringKey } from "@/lib/i18n/strings";

export default function CropCarePage() {
  const { t, lang } = useLanguage();
  const { location } = useLocation();
  const { profile } = useFarm();
  const id = useId();
  const area = useAreaCrops(location?.state, location?.district);
  const [crop, setCrop] = useState<CropId | "">(profile.mainCrop ?? "");
  const [stage, setStage] = useState<GrowthStage>("unknown");
  const [parts, setParts] = useState<PlantPart[]>([]);
  const [symptoms, setSymptoms] = useState("");
  const [recent, setRecent] = useState("");
  const [errors, setErrors] = useState<{ crop?: string; symptoms?: string }>({});
  const [submitted, setSubmitted] = useState<{ crop: CropId; prompt: string; key: number } | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!crop) errs.crop = t("care.errCrop");
    if (!symptoms.trim()) errs.symptoms = t("care.errSymptoms");
    setErrors(errs);
    if (Object.keys(errs).length || !crop) return;
    const prompt = t("care.prompt", {
      crop: CROPS[crop][lang],
      stage: t(`stage.${stage}` as StringKey),
      parts: parts.length ? parts.map((p) => t(`part.${p}` as StringKey)).join(", ") : t("stage.unknown"),
      symptoms: symptoms.trim().slice(0, 600),
      recent: recent.trim().slice(0, 200) || t("care.none"),
    });
    setSubmitted({ crop, prompt, key: Date.now() });
  }

  const problems = location ? findDistrictProblems(location.state, location.district) : null;
  const known = submitted && problems ? problems.byCrop[submitted.crop] ?? [] : [];
  const input = "min-h-14 w-full rounded-lg border-2 border-ink bg-paper px-3 text-lg";

  return (
    <div className="space-y-8">
      <PageTitle>{t("section.cropCare")}</PageTitle>
      <p className="text-lg">{t("care.intro")}</p>

      <form onSubmit={submit} noValidate className="space-y-5">
        <div className="space-y-1">
          <label htmlFor={`${id}-crop`} className="block text-lg font-bold">{t("care.crop")}</label>
          <CropSelect id={`${id}-crop`} className={input} value={crop} onChange={setCrop} areaCropIds={area.cropIds} areaName={area.cropArea}
            emptyLabel={t("care.chooseCrop")} invalid={Boolean(errors.crop)} describedBy={errors.crop ? `${id}-crop-err` : undefined} />
          {errors.crop && <p id={`${id}-crop-err`} className="text-base font-semibold text-alert">{errors.crop}</p>}
        </div>
        <div className="space-y-1">
          <label htmlFor={`${id}-stage`} className="block text-lg font-bold">{t("care.stage")}</label>
          <select id={`${id}-stage`} className={input} value={stage} onChange={(e) => setStage(e.target.value as GrowthStage)}>
            {GROWTH_STAGES.map((s) => <option key={s} value={s}>{t(`stage.${s}` as StringKey)}</option>)}
          </select>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-lg font-bold">{t("care.parts")}</legend>
          <div className="grid grid-cols-2 gap-2">
            {PLANT_PARTS.map((p) => (
              <label key={p} className={`flex min-h-14 items-center gap-3 rounded-lg border-2 px-3 ${parts.includes(p) ? "border-leaf bg-leaf-wash" : "border-ink bg-white/60"}`}>
                <input type="checkbox" className="h-6 w-6 accent-leaf" checked={parts.includes(p)}
                  onChange={() => setParts(parts.includes(p) ? parts.filter((x) => x !== p) : [...parts, p])} />
                <span className="text-lg">{t(`part.${p}` as StringKey)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="space-y-1">
          <label htmlFor={`${id}-sym`} className="block text-lg font-bold">{t("care.symptoms")}</label>
          <p id={`${id}-sym-hint`} className="text-base">{t("care.symptomsHint")}</p>
          <textarea id={`${id}-sym`} rows={4} maxLength={600} className="w-full rounded-lg border-2 border-ink p-3 text-lg" value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)} aria-invalid={Boolean(errors.symptoms)}
            aria-describedby={`${id}-sym-hint${errors.symptoms ? ` ${id}-sym-err` : ""}`} />
          {errors.symptoms && <p id={`${id}-sym-err`} className="text-base font-semibold text-alert">{errors.symptoms}</p>}
        </div>
        <div className="space-y-1">
          <label htmlFor={`${id}-recent`} className="block text-lg font-bold">{t("care.recent")}</label>
          <input id={`${id}-recent`} className={input} maxLength={200} value={recent} onChange={(e) => setRecent(e.target.value)} />
        </div>
        <button type="submit" className="inline-flex min-h-14 w-full items-center justify-center lift rounded-lg bg-leaf px-5 shadow-sm text-lg font-bold text-white hover:bg-leaf-dark">
          {t("care.submit")}
        </button>
      </form>

      {submitted && (
        <>
          <section aria-labelledby="known-title" className="space-y-3 glass-card">
            <h2 id="known-title" className="text-2xl font-extrabold">
              {t("care.knownTitle", { crop: CROPS[submitted.crop][lang], district: location?.district ?? "—" })}
            </h2>
            {problems && known.length > 0 ? (
              <>
                <p className="text-base">{t("care.knownNote")}</p>
                <ul className="divide-y divide-rule border-y border-rule">
                  {known.map((p) => (
                    <li key={p.id} className="flex items-baseline justify-between gap-3 py-2 text-lg">
                      <span>{lang === "hi" ? `${p.hi} (${p.en})` : p.en}</span>
                      <span className="text-base">{t(p.type === "pest" ? "care.pest" : "care.disease")}</span>
                    </li>
                  ))}
                </ul>
                <SourceLine source={SOURCES[problems.sourceId]} />
                <p className="text-base">{t("src.section", { s: problems.sourceSection })}</p>
              </>
            ) : (
              <Notice>{t("care.noKnown")}</Notice>
            )}
          </section>

          <section aria-labelledby="assist-title" className="space-y-3 glass-card">
            <h2 id="assist-title" className="text-2xl font-extrabold">{t("section.ask")}</h2>
            <Chat key={submitted.key} seed={submitted.prompt} autoSend />
          </section>
        </>
      )}

      <section aria-labelledby="fert-title" className="space-y-2 glass-card">
        <h2 id="fert-title" className="text-2xl font-extrabold">{t("care.fertTitle")}</h2>
        <p className="text-lg">{t("care.fertBody")}</p>
        <Link href="/soil" className="inline-block min-h-12 py-2 text-lg font-bold text-leaf underline underline-offset-4">{t("care.soilLink")}</Link>
        <a href={SOURCES["shc-portal"].url} target="_blank" rel="noopener noreferrer" className="inline-block min-h-12 py-2 text-lg font-bold text-leaf underline underline-offset-4">
          {t("care.fertLink")}
        </a>
      </section>

      <section aria-labelledby="safety-title" className="space-y-2 rounded-xl border-2 border-caution bg-caution-wash p-4 text-caution">
        <h2 id="safety-title" className="text-2xl font-extrabold">{t("care.safetyTitle")}</h2>
        <ul className="list-disc space-y-1 pl-6 text-lg">
          <li>{t("care.safety1")}</li>
          <li>{t("care.safety2")}</li>
          <li>{t("care.safety3")}</li>
          <li>{t("care.safety4")}</li>
        </ul>
        <p className="text-base">{t("care.safetyNote")}</p>
      </section>
    </div>
  );
}
