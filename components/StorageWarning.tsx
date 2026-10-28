"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { onStorageFailed, probeStorage, storageHealthy } from "@/lib/client/storage";

export function useStorageHealthy(): boolean {
  const [ok, setOk] = useState(true);
  useEffect(() => {
    setOk(probeStorage() && storageHealthy());
    return onStorageFailed(() => setOk(false));
  }, []);
  return ok;
}

/** Tells the farmer when the browser won't keep their data (private mode, blocked or full storage). */
export function StorageWarning() {
  const { t } = useLanguage();
  const ok = useStorageHealthy();
  if (ok) return null;
  return (
    <div role="status" className="bg-caution-wash px-4 py-3 text-lg font-bold text-caution">
      {t("storage.warning")}
    </div>
  );
}
