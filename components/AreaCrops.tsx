"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLanguage } from "./LanguageProvider";
import { SourceLine } from "./SourceLine";
import { Notice } from "./ui";
import { IconChevron } from "./icons";
import type { AreaCrops as AreaCropsData } from "./useAreaCrops";
import { CROPS } from "@/lib/crops/catalog";
import { SOURCES } from "@/lib/sources";

/** "Crops grown in <district>": official plan list and/or uploaded crop statistics, each with its source. */
export function AreaCrops({ district, data, compact = false }: { district: string; data: AreaCropsData; compact?: boolean }) {
  const { t, lang } = useLanguage();
  const { verified, dataset } = data;
  if (!verified && !dataset) {
    return compact ? null : <Notice>{t("area.none", { district })}</Notice>;
  }
  const names = verified ? verified.crops.map((c) => CROPS[c][lang]) : [];
  const fromData = dataset ? dataset.crops.map((c) => (c.cropId ? CROPS[c.cropId][lang] : c.crop)) : [];
  const shown = compact ? [...new Set([...names, ...fromData])].slice(0, 8) : null;
  return (
    <section className={`glass-card ${compact ? "flex flex-col justify-between gap-4" : "space-y-2"}`} aria-label={t(compact ? "area.dashTitle" : "area.title", { district })}>
      <h2 className="text-xl font-extrabold leading-tight">{t(compact ? "area.dashTitle" : "area.title", { district })}</h2>
      {shown ? (
        <>
          <p className="flex-1 text-lg font-medium text-muted">{shown.join(", ")}</p>
          <CardLink href="/grow">{t("area.seeAll")}</CardLink>
        </>
      ) : (
        <>
          {verified && (
            <div className="space-y-1">
              <ul className="flex flex-wrap gap-2">
                {names.map((n) => <li key={n} className="rounded-full border border-leaf bg-leaf-wash px-3 text-base font-bold text-leaf">{n}</li>)}
              </ul>
              <p className="text-base">{t("area.fromPlan", { sections: verified.sections })}</p>
              <SourceLine source={SOURCES[verified.sourceId]} />
            </div>
          )}
          {dataset && (
            <div className="space-y-1">
              <ul className="divide-y divide-rule border-y border-rule">
                {dataset.crops.slice(0, 25).map((c) => (
                  <li key={c.crop} className="flex justify-between gap-3 py-2 text-lg">
                    <span>{c.cropId ? CROPS[c.cropId][lang] : c.crop}</span>
                    {c.areaHa !== null && <span className="text-base">{t("area.areaHa", { n: c.areaHa.toLocaleString(lang === "hi" ? "hi-IN" : "en-IN") })}</span>}
                  </li>
                ))}
              </ul>
              <p className="text-base">{t("area.fromData", { source: dataset.source, year: dataset.crops[0]?.latestYear ?? "—" })}</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/** Card footer link with an arrow, separated from the card body by a hairline. */
export function CardLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <div className="border-t border-rule pt-3">
      <Link href={href} className="group inline-flex min-h-12 items-center gap-2 text-lg font-bold text-leaf underline-offset-4 hover:text-leaf-dark hover:underline">
        {children}
        <IconChevron size={18} strokeWidth={2.5} className="nudge shrink-0" />
      </Link>
    </div>
  );
}
