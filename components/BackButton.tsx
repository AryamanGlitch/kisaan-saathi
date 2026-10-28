"use client";

import { useLanguage } from "./LanguageProvider";
import { useGoBack } from "./useBack";
import { IconBack } from "./icons";

/** "‹ Back" above each page title: previous screen, or Home when there is none (see useBack.ts). */
export function BackButton() {
  const { t } = useLanguage();
  const goBack = useGoBack();
  return (
    <button
      type="button"
      onClick={goBack}
      className="lift inline-flex min-h-12 items-center gap-1 rounded-xl border border-rule bg-white/70 pl-2 pr-4 text-lg font-bold shadow-sm hover:border-leaf hover:bg-leaf-wash hover:text-leaf"
    >
      <IconBack size={24} strokeWidth={2.5} />
      {t("nav.back")}
    </button>
  );
}
