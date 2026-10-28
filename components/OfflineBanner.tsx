"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";

export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

export function OfflineBanner() {
  const online = useOnline();
  const { t } = useLanguage();
  if (online) return null;
  return (
    <div role="status" className="bg-ink px-4 py-3 text-center text-lg font-bold text-paper">
      {t("offline.banner")}
    </div>
  );
}
