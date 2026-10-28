"use client";

import { useLanguage } from "./LanguageProvider";
import { formatDate } from "@/lib/client/format";

interface Src {
  title: string;
  publisher: string;
  url: string;
  documentDate: string | null;
  verifiedOn?: string;
}

const OLD_AFTER_YEARS = 5;

/** Shows where a fact comes from, its date, and a warning when the document is old. */
export function SourceLine({ source }: { source: Src }) {
  const { t, lang } = useLanguage();
  const year = source.documentDate ? Number(source.documentDate.slice(0, 4)) : null;
  const old = year !== null && new Date().getFullYear() - year >= OLD_AFTER_YEARS;
  const d = (iso: string) => formatDate(`${iso}T12:00:00+05:30`, lang);
  return (
    <div className="space-y-1 text-base">
      <p>
        <span className="font-semibold">{t("src.label")}: </span>
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
          {source.publisher}, {source.title}
        </a>
        {source.documentDate && <> ({t("src.documentDate", { date: d(source.documentDate) })})</>}
        {source.verifiedOn && <>, {t("src.checked", { date: d(source.verifiedOn) })}</>}
      </p>
      {old && year !== null && <p className="font-semibold text-caution">{t("src.old", { year })}</p>}
    </div>
  );
}
