"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { EMPTY_PROFILE, isFarmProfile, type FarmProfile } from "@/lib/farm/profile";
import { readJson, writeJson } from "@/lib/client/storage";

const KEY = "ks:farm:v1";

interface FarmCtx {
  profile: FarmProfile;
  ready: boolean;
  saveProfile: (p: FarmProfile) => void;
}

const Ctx = createContext<FarmCtx | null>(null);

export function FarmProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<FarmProfile>(EMPTY_PROFILE);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const saved = readJson(KEY);
    if (isFarmProfile(saved)) setProfile(saved);
    setReady(true);
  }, []);
  const saveProfile = useCallback((p: FarmProfile) => {
    setProfile(p);
    writeJson(KEY, p);
  }, []);
  const value = useMemo(() => ({ profile, ready, saveProfile }), [profile, ready, saveProfile]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFarm(): FarmCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useFarm must be used inside FarmProvider");
  return v;
}
