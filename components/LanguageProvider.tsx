"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { LANGS, translate, type Lang, type StringKey } from "@/lib/i18n/strings";
import { readJson, writeJson } from "@/lib/client/storage";

const KEY = "ks:lang:v1";

interface LanguageCtx {
  lang: Lang;
  chosen: boolean; // has the user picked a language yet?
  ready: boolean; // finished reading device storage
  setLang: (l: Lang) => void;
  t: (key: StringKey, params?: Record<string, string | number>) => string;
}

const Ctx = createContext<LanguageCtx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("hi");
  const [chosen, setChosen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = readJson(KEY);
    if (typeof saved === "string" && LANGS.includes(saved as Lang)) {
      setLangState(saved as Lang);
      setChosen(true);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    setChosen(true);
    writeJson(KEY, l);
  }, []);

  const t = useCallback((key: StringKey, params?: Record<string, string | number>) => translate(lang, key, params), [lang]);

  const value = useMemo(() => ({ lang, chosen, ready, setLang, t }), [lang, chosen, ready, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLanguage(): LanguageCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLanguage must be used inside LanguageProvider");
  return v;
}
