"use client";

import { useLanguage } from "./LanguageProvider";

/** First screen on a new phone: one tap to choose a language. */
export function LanguagePicker() {
  const { t, setLang } = useLanguage();
  return (
    <section className="space-y-6 py-6">
      <h1 className="text-3xl font-extrabold tracking-tight">{t("lang.pickTitle")}</h1>
      <div className="grid gap-4">
        <button type="button" lang="hi" onClick={() => setLang("hi")}
          className="lift min-h-20 rounded-2xl border-2 border-ink bg-white/60 text-3xl font-extrabold hover:bg-leaf-wash">
          हिंदी
        </button>
        <button type="button" lang="en" onClick={() => setLang("en")}
          className="lift min-h-20 rounded-2xl border-2 border-ink bg-white/60 text-3xl font-extrabold hover:bg-leaf-wash">
          English
        </button>
      </div>
    </section>
  );
}
