"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { SavedLocation } from "@/lib/location/types";
import { isSavedLocation } from "@/lib/location/validate";
import { readJson, removeKey, writeJson } from "@/lib/client/storage";

const KEY = "ks:location:v1";

interface LocationCtx {
  location: SavedLocation | null;
  ready: boolean;
  saveLocation: (loc: SavedLocation) => void;
  clearLocation: () => void;
}

const Ctx = createContext<LocationCtx | null>(null);

/** The single source of truth for the farmer's location, shared by every page. */
export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<SavedLocation | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = readJson(KEY);
    if (isSavedLocation(saved)) setLocation(saved);
    else if (saved !== null) removeKey(KEY); // corrupt or old format: discard rather than guess
    setReady(true);
  }, []);

  const saveLocation = useCallback((loc: SavedLocation) => {
    setLocation(loc);
    writeJson(KEY, loc);
  }, []);

  const clearLocation = useCallback(() => {
    setLocation(null);
    removeKey(KEY);
  }, []);

  const value = useMemo(() => ({ location, ready, saveLocation, clearLocation }), [location, ready, saveLocation, clearLocation]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocation(): LocationCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLocation must be used inside LocationProvider");
  return v;
}
