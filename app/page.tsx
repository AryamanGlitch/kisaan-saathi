"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { useLocation } from "@/components/LocationProvider";
import { LanguagePicker } from "@/components/LanguagePicker";
import { TodayOnFarm } from "@/components/TodayOnFarm";
import { SowNow } from "@/components/SowNow";
import { SectionList } from "@/components/SectionList";
import { KccHelp } from "@/components/KccHelp";
import { LinkButton, Notice } from "@/components/ui";

export default function HomePage() {
  const { t, chosen, ready: langReady } = useLanguage();
  const { location, ready } = useLocation();

  if (!langReady || !ready) return <Notice>{t("common.loading")}</Notice>;
  if (!chosen) return <LanguagePicker />;

  return (
    <div className="space-y-9">
      {location ? (
        <>
          <TodayOnFarm />
          <SowNow />
        </>
      ) : (
        <section className="glass-card space-y-4">
          <h1 className="text-3xl font-extrabold tracking-tight">{t("home.setLocationTitle")}</h1>
          <p className="text-lg">{t("home.setLocationBody")}</p>
          <LinkButton href="/my-farm">{t("nav.setLocation")}</LinkButton>
        </section>
      )}
      <section aria-labelledby="sections-title" className="space-y-4">
        <h2 id="sections-title" className="text-xl font-extrabold sm:text-2xl">{t("home.sectionsTitle")}</h2>
        <SectionList />
      </section>
      <KccHelp />
    </div>
  );
}
