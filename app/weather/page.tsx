"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { WeatherView } from "@/components/WeatherView";
import { PageTitle } from "@/components/ui";

export default function WeatherPage() {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <PageTitle>{t("section.weather")}</PageTitle>
      <WeatherView />
    </div>
  );
}
