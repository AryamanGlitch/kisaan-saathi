"use client";

import Link from "next/link";
import { useLanguage } from "./LanguageProvider";
import { useLocation } from "./LocationProvider";
import { useTrackVisits } from "./useBack";
import { IconPin, IconSprout } from "./icons";

/** Always visible: way home, language switch, and the current location (tap to change). */
export function AppHeader() {
  const { t, lang, setLang } = useLanguage();
  const { location, ready } = useLocation();
  useTrackVisits(); // for the Back button above each page title

  return (
    <header className="glass-header sticky top-0 z-10 rounded-t-3xl border-b border-rule px-4 pb-3 pt-3 sm:px-10 sm:pb-5 sm:pt-7">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="flex min-h-12 min-w-0 items-center gap-3 py-2 text-2xl font-extrabold tracking-tight sm:text-3xl" aria-label={`${t("app.name")}, ${t("nav.home")}`}>
          <span className="brand-badge"><IconSprout size={20} strokeWidth={2.2} /></span>
          <span className="truncate">{t("app.name")}</span>
        </Link>
        <button
          type="button"
          onClick={() => setLang(lang === "hi" ? "en" : "hi")}
          aria-label={t("lang.switchAria")}
          className="lift min-h-12 shrink-0 rounded-xl border border-rule bg-white/70 px-4 text-lg font-bold shadow-sm hover:border-leaf hover:bg-leaf-wash hover:text-leaf"
        >
          {t("lang.switch")}
        </button>
      </div>
      <Link
        href="/my-farm"
        className="flex min-h-12 items-center gap-2 text-lg font-semibold text-leaf underline-offset-4 hover:underline"
        aria-label={location ? t("nav.locationAria", { place: location.label }) : t("nav.setLocation")}
      >
        <IconPin size={20} className="shrink-0" />
        <span className="truncate text-ink">{!ready ? "…" : location ? location.label : t("nav.setLocation")}</span>
        {ready && location && <span className="hidden shrink-0 text-sm font-normal text-muted sm:inline">· {t("nav.tapToChange")}</span>}
      </Link>
    </header>
  );
}
