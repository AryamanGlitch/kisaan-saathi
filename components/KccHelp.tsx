"use client";

import { useLanguage } from "./LanguageProvider";
import { IconPhone } from "./icons";
import { formatDate } from "@/lib/client/format";

/**
 * Verified official helpline. Source: https://mkisan.gov.in/Home/AboutKCC
 * Re-verify KCC_VERIFIED_ON before each release.
 */
export const KCC_NUMBER = "18001801551";
export const KCC_SOURCE_URL = "https://mkisan.gov.in/Home/AboutKCC";
export const KCC_VERIFIED_ON = "2026-10-26";

export function KccHelp() {
  const { t, lang } = useLanguage();
  return (
    <section aria-labelledby="kcc-title" className="space-y-3 border-t border-rule pt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 id="kcc-title" className="text-xl font-extrabold">{t("help.kccTitle")}</h2>
          <p className="text-base text-muted">{t("help.kccBody")}</p>
        </div>
        <a href={`tel:${KCC_NUMBER}`} className="lift inline-flex min-h-14 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-leaf px-5 text-lg font-bold text-white shadow-sm hover:bg-leaf-dark sm:w-auto">
          <IconPhone size={20} />
          {t("help.kccCall")}
        </a>
      </div>
      <p className="text-sm text-muted">
        <a href={KCC_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
          {t("help.kccSource", { date: formatDate(`${KCC_VERIFIED_ON}T12:00:00+05:30`, lang) })}
        </a>
      </p>
    </section>
  );
}
