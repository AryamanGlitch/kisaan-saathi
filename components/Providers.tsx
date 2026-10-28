"use client";

import type { ReactNode } from "react";
import { LanguageProvider } from "./LanguageProvider";
import { LocationProvider } from "./LocationProvider";
import { FarmProvider } from "./FarmProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <LocationProvider>
        <FarmProvider>{children}</FarmProvider>
      </LocationProvider>
    </LanguageProvider>
  );
}
