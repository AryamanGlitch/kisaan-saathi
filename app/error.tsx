"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { Button, LinkButton, Notice } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      <Notice tone="error">{t("error.page")}</Notice>
      <Button onClick={reset}>{t("common.tryAgain")}</Button>
      <LinkButton href="/" variant="secondary">{t("notFound.home")}</LinkButton>
    </div>
  );
}
