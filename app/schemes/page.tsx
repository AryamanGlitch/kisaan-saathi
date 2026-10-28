"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { useLocation } from "@/components/LocationProvider";
import { useCachedGet } from "@/components/useCachedGet";
import { SourceLine } from "@/components/SourceLine";
import { Button, Notice, PageTitle } from "@/components/ui";
import type { Freshness, SchemeRecord } from "@/lib/schemes/types";
import type { SourceRef } from "@/lib/sources";
import type { StringKey } from "@/lib/i18n/strings";
import { formatDate, formatTime } from "@/lib/client/format";
import { errorKey } from "@/lib/client/errors";

type SchemeView = SchemeRecord & { freshness: Freshness; lastCheckedOk: string | null; sources: SourceRef[] };
interface SchemesPayload {
  schemes: SchemeView[];
  monitoring: { persistent: boolean; error: boolean };
  stateCovered: string | null;
}

export default function SchemesPage() {
  const { t, lang } = useLanguage();
  const { location, ready } = useLocation();
  const path = ready ? `/api/schemes${location ? `?state=${encodeURIComponent(location.state)}` : ""}` : null;
  const { state, data, fromCache, retry } = useCachedGet<SchemesPayload>(path, "ks:schemes:v1");

  const field = (title: string, v: { en: string; hi: string } | null) => (
    <div className="space-y-1">
      <h4 className="text-lg font-extrabold">{title}</h4>
      <p className="text-lg">{v ? v[lang] : t("schemes.notVerifiedField")}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageTitle>{t("section.schemes")}</PageTitle>
      <p className="text-lg">{t("schemes.intro")}</p>
      {location && !data?.schemes.some((s) => s.level === "state") && <Notice>{t("schemes.noState", { state: location.state })}</Notice>}

      {(state.status === "idle" || (state.status === "loading" && !data)) && <Notice>{t("schemes.loading")}</Notice>}
      {state.status === "error" && !data && (
        <div className="space-y-3">
          <Notice tone="error">{t(errorKey(state.code))}</Notice>
          <Button variant="secondary" onClick={retry}>{t("common.tryAgain")}</Button>
        </div>
      )}
      {fromCache && state.status === "error" && <Notice tone="caution">{t("schemes.savedCopy")}</Notice>}

      {data && (
        <ul className="space-y-4">
          {data.schemes.map((s) => (
            <li key={s.id}>
              <details className="group glass-box overflow-hidden">
                <summary className="cursor-pointer list-none space-y-1 p-4">
                  <span className="block text-xl font-extrabold">{s.name[lang]}</span>
                  <span className="block text-lg">{s.summary[lang]}</span>
                  <span className={`block text-base font-semibold ${s.freshness === "current" ? "" : "text-caution"}`}>
                    {t(`fresh.${s.freshness}` as StringKey, { time: s.lastCheckedOk ? formatTime(s.lastCheckedOk, lang) : "—" })}
                  </span>
                  <span className="block text-base font-bold text-leaf underline underline-offset-4">{t("schemes.details")}</span>
                </summary>
                <div className="space-y-4 border-t border-rule p-4">
                  {s.statusNote && <Notice tone="caution">{s.statusNote[lang]}</Notice>}
                  {field(t("schemes.benefits"), s.benefits)}
                  {field(t("schemes.eligibility"), s.eligibility)}
                  {field(t("schemes.documents"), s.documents)}
                  {field(t("schemes.howToApply"), s.howToApply)}
                  <a href={s.applyUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex min-h-14 w-full items-center justify-center lift rounded-lg bg-leaf px-5 shadow-sm text-lg font-bold text-white hover:bg-leaf-dark">
                    {t("schemes.apply")}
                  </a>
                  <p className="text-base">{t("schemes.verifiedOn", { date: formatDate(`${s.lastVerified}T12:00:00+05:30`, lang) })}</p>
                  {s.sources.map((src) => <SourceLine key={src.id} source={src} />)}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
