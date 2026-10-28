"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { LinkButton, PageTitle } from "@/components/ui";

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <PageTitle>{t("notFound.title")}</PageTitle>
      <LinkButton href="/">{t("notFound.home")}</LinkButton>
    </div>
  );
}
