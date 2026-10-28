"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { Chat } from "@/components/Chat";
import { PageTitle } from "@/components/ui";

export default function AskPage() {
  const { t } = useLanguage();
  // Read ?q= after mount (avoids a Suspense boundary for useSearchParams); the text is only pre-filled, never auto-sent.
  const [seed, setSeed] = useState<string | null>(null);
  useEffect(() => {
    // ?q= on the server build; #/ask?q= on the single-file build
    const q = new URLSearchParams(window.location.search).get("q") ?? new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("q");
    setSeed(q ? q.slice(0, 1200) : "");
  }, []);

  return (
    <div className="space-y-6">
      <PageTitle>{t("section.ask")}</PageTitle>
      <p className="text-lg">{t("ask.intro")}</p>
      {seed !== null && <Chat seed={seed} showExamples />}
    </div>
  );
}
