"use client";

import { useLanguage } from "./LanguageProvider";
import { SourceLine } from "./SourceLine";
import { Notice } from "./ui";
import { IconPhone } from "./icons";
import type { AssistantResponse } from "@/lib/assistant/types";
import type { StringKey } from "@/lib/i18n/strings";

function Section({ title, items }: { title: string; items: string[] }) {
  const list = items.filter(Boolean);
  if (list.length === 0) return null;
  return (
    <div className="space-y-1">
      <h4 className="text-lg font-extrabold">{title}</h4>
      {list.length === 1 ? (
        <p className="text-lg">{list[0]}</p>
      ) : (
        <ul className="list-disc space-y-1 pl-6 text-lg">
          {list.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      )}
    </div>
  );
}

function CallButton({ number, label }: { number: string; label: string }) {
  return (
    <a href={`tel:${number}`} className="inline-flex min-h-14 w-full items-center justify-center gap-2 lift rounded-lg bg-leaf px-5 shadow-sm text-lg font-bold text-white hover:bg-leaf-dark">
      <IconPhone size={22} /> {label}
    </a>
  );
}

export function AssistantAnswer({ response, onPickQuestion }: { response: AssistantResponse; onPickQuestion?: (q: string) => void }) {
  const { t } = useLanguage();
  const r = response.reply;

  if (r.kind === "crisis") {
    return (
      <div role="alert" className="space-y-3 rounded-xl border-2 border-alert bg-alert-wash p-4">
        <h3 className="text-2xl font-extrabold">{t("ask.crisisTitle")}</h3>
        <p className="text-xl font-semibold">{r.possibleProblem}</p>
        <ul className="list-disc space-y-1 pl-6 text-lg">{r.actions.map((a, i) => <li key={i}>{a}</li>)}</ul>
        <CallButton number="14416" label={t("common.call", { n: "14416" })} />
        <CallButton number="112" label={t("common.call", { n: "112" })} />
        {r.warnings.map((w, i) => <p key={i} className="text-lg">{w}</p>)}
      </div>
    );
  }

  if (r.kind === "followup") {
    return (
      <div className="space-y-2">
        <p className="text-lg font-bold">{t("ask.followup")}</p>
        <ul className="space-y-2">
          {r.followUpQuestions.map((q, i) => (
            <li key={i}>
              <button type="button" onClick={() => onPickQuestion?.(q)} className="min-h-12 w-full rounded-lg border-2 border-ink px-4 py-2 text-left text-lg hover:bg-leaf-wash">
                {q}
              </button>
            </li>
          ))}
        </ul>
        {onPickQuestion && <p className="text-base">{t("ask.tapToAnswer")}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-base font-semibold">{t("ask.aiLabel")}</p>
      {r.kind === "out_of_scope" ? (
        <p className="text-lg">{[r.possibleProblem, r.why].filter(Boolean).join(" ")}</p>
      ) : (
        <>
          <Section title={t("ask.possible")} items={[r.possibleProblem]} />
          <Section title={t("ask.why")} items={[r.why]} />
          <Section title={t("ask.check")} items={r.checkNext} />
          <Section title={t("ask.actions")} items={r.actions} />
          <Section title={t("ask.warnings")} items={r.warnings} />
          <Section title={t("ask.expert")} items={[r.whenToSeeExpert]} />
          <p className="text-base">{t(`ask.confidence.${r.confidence}` as StringKey)}</p>
        </>
      )}
      {response.redacted && <Notice tone="caution">{t("ask.redacted")}</Notice>}
      <div className="space-y-2 border-t border-rule pt-3">
        <h4 className="text-lg font-extrabold">{t("ask.sources")}</h4>
        {response.sources.length === 0 ? <p className="text-base">{t("ask.noSources")}</p> : response.sources.map((s) => <SourceLine key={s.id} source={s} />)}
      </div>
    </div>
  );
}
