"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { useLocation } from "@/components/LocationProvider";
import { useCachedGet } from "@/components/useCachedGet";
import { SourceLine } from "@/components/SourceLine";
import { Button, LinkButton, Notice, PageTitle } from "@/components/ui";
import type { UtilityRecord } from "@/lib/utilities/data";
import type { SupplyStatus } from "@/lib/utilities/feeds";
import type { SourceRef } from "@/lib/sources";
import { buildComplaint, buildMailto, ELECTRICITY_ISSUES, issueLabel, WATER_ISSUES, type ComplaintIssue } from "@/lib/utilities/complaint";
import { readJson, writeJson } from "@/lib/client/storage";
import { errorKey } from "@/lib/client/errors";
import { formatTime } from "@/lib/client/format";

type UtilityView = UtilityRecord & { source: SourceRef; live: SupplyStatus | null; liveAvailable: boolean; liveError: boolean };
interface Draft { id: string; utilityId: string; subject: string; body: string; createdAt: string; emailOpened: boolean }

const DRAFTS_KEY = "ks:complaints:v1";
const isDraftList = (x: unknown): x is Draft[] =>
  Array.isArray(x) && x.every((d) => d && typeof d.id === "string" && typeof d.body === "string" && typeof d.subject === "string");

export default function UtilitiesPage() {
  const { t, lang } = useLanguage();
  const { location, ready } = useLocation();
  const id = useId();
  const path = ready && location ? `/api/utilities?state=${encodeURIComponent(location.state)}&district=${encodeURIComponent(location.district)}` : null;
  const { state, data, fromCache, retry } = useCachedGet<{ utilities: UtilityView[] }>(path, "ks:utilities:v1");

  const [utilityId, setUtilityId] = useState("");
  const [issue, setIssue] = useState<ComplaintIssue | "">("");
  const [consumer, setConsumer] = useState("");
  const [since, setSince] = useState("");
  const [details, setDetails] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [current, setCurrent] = useState<Draft | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  useEffect(() => {
    const saved = readJson(DRAFTS_KEY);
    if (isDraftList(saved)) setDrafts(saved);
  }, []);

  const persist = (list: Draft[]) => {
    setDrafts(list);
    writeJson(DRAFTS_KEY, list);
  };

  if (!ready) return <Notice>{t("common.loading")}</Notice>;
  if (!location) {
    return (
      <div className="space-y-6">
        <PageTitle>{t("section.utilities")}</PageTitle>
        <LinkButton href="/my-farm">{t("nav.setLocation")}</LinkButton>
      </div>
    );
  }

  const utilities = data?.utilities ?? [];
  const chosen = utilities.find((u) => u.id === utilityId) ?? null;
  const issues = chosen ? (chosen.kind === "electricity" ? ELECTRICITY_ISSUES : WATER_ISSUES) : [];

  function prepare(e: FormEvent) {
    e.preventDefault();
    if (!chosen || !issue) return;
    const c = buildComplaint({
      lang, utilityName: chosen.name[lang], issue, consumerNumber: consumer.slice(0, 40), place: location!.label,
      since: since.slice(0, 60), details: details.slice(0, 600),
    });
    const d: Draft = { id: String(Date.now()), utilityId: chosen.id, subject: c.subject, body: c.body, createdAt: new Date().toISOString(), emailOpened: false };
    setCurrent(d);
    setCopyMsg(null);
    persist([d, ...drafts].slice(0, 10));
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMsg(t("util.copied"));
    } catch {
      setCopyMsg(t("util.copyFailed"));
    }
  }

  function markEmailOpened(d: Draft) {
    const updated = { ...d, emailOpened: true };
    setCurrent(current?.id === d.id ? updated : current);
    persist(drafts.map((x) => (x.id === d.id ? updated : x)));
  }

  const input = "min-h-14 w-full rounded-lg border-2 border-ink bg-paper px-3 text-lg";

  const draftActions = (d: Draft) => {
    const u = utilities.find((x) => x.id === d.utilityId);
    const email = u?.contacts.find((c) => c.type === "email");
    return (
      <div className="space-y-3">
        <p className="text-base font-semibold">{d.emailOpened ? t("util.emailOpened") : t("util.draftStatus")}</p>
        <p className="whitespace-pre-wrap rounded-xl border border-rule bg-white/60 p-3 text-lg">{d.body}</p>
        <Button variant="secondary" onClick={() => void copy(d.body)}>{t("util.copy")}</Button>
        {copyMsg && current?.id === d.id && <p role="status" className="text-base">{copyMsg}</p>}
        {email && (
          <a href={buildMailto(email.value, d.subject, d.body)} onClick={() => markEmailOpened(d)}
            className="inline-flex min-h-14 w-full items-center justify-center lift rounded-lg border-2 border-ink bg-white/60 px-5 text-lg font-bold shadow-sm hover:bg-ink hover:text-white">
            {t("util.email")}
          </a>
        )}
        {u?.contacts.filter((c) => c.type === "phone").map((c) => (
          <a key={c.value} href={`tel:${c.value}`} className="inline-flex min-h-14 w-full items-center justify-center lift rounded-lg bg-leaf px-5 shadow-sm text-lg font-bold text-white hover:bg-leaf-dark">
            {t("util.callToComplain", { n: c.value })}
          </a>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <PageTitle>{t("section.utilities")}</PageTitle>
      <p className="text-lg">{t("util.intro")}</p>

      {(state.status === "idle" || (state.status === "loading" && !data)) && <Notice>{t("util.loading")}</Notice>}
      {state.status === "error" && !data && (
        <div className="space-y-3">
          <Notice tone="error">{t(errorKey(state.code))}</Notice>
          <Button variant="secondary" onClick={retry}>{t("common.tryAgain")}</Button>
        </div>
      )}
      {fromCache && state.status === "error" && <Notice tone="caution">{t("schemes.savedCopy")}</Notice>}

      {data && utilities.length === 0 && (
        <div className="space-y-3">
          <Notice tone="caution">{t("util.noData", { state: location.state })}</Notice>
          <p className="text-lg">{t("util.noDataHelp")}</p>
        </div>
      )}

      {utilities.map((u) => (
        <section key={u.id} aria-labelledby={`${id}-${u.id}`} className="space-y-3 glass-card">
          <p className="text-lg font-bold text-leaf">{t(u.kind === "electricity" ? "util.electricity" : "util.water")}</p>
          <h2 id={`${id}-${u.id}`} className="text-2xl font-extrabold">{u.name[lang]}</h2>
          <p className="text-lg">{u.coverage[lang]}</p>
          {u.live ? (
            <Notice>{u.live.summary[lang]} ({formatTime(u.live.observedAt, lang)})</Notice>
          ) : (
            <Notice tone="caution">{t("util.noLive")}</Notice>
          )}
          <div className="space-y-2">
            {u.contacts.map((c) => {
              const href = c.type === "phone" ? `tel:${c.value}` : c.type === "email" ? `mailto:${c.value}` : c.value;
              const ext = c.type === "web" ? { target: "_blank", rel: "noopener noreferrer" } : {};
              return (
                <a key={c.value} href={href} {...ext}
                  className={`inline-flex min-h-14 w-full items-center justify-center rounded-lg px-5 text-lg font-bold ${c.type === "phone" ? "bg-leaf text-white hover:bg-leaf-dark" : "border-2 border-ink bg-white/60 shadow-sm hover:bg-ink hover:text-white"}`}>
                  {c.label[lang]}{c.type === "email" ? `: ${c.value}` : ""}
                </a>
              );
            })}
          </div>
          <SourceLine source={u.source} />
        </section>
      ))}

      {utilities.length > 0 && (
        <section aria-labelledby={`${id}-complaint`} className="space-y-4 glass-card">
          <h2 id={`${id}-complaint`} className="text-2xl font-extrabold">{t("util.complaintTitle")}</h2>
          <Notice>{t("util.complaintIntro")}</Notice>
          <form onSubmit={prepare} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor={`${id}-u`} className="block text-lg font-bold">{t("util.chooseUtility")}</label>
              <select id={`${id}-u`} className={input} value={utilityId} required onChange={(e) => { setUtilityId(e.target.value); setIssue(""); }}>
                <option value="">—</option>
                {utilities.map((u) => <option key={u.id} value={u.id}>{u.name[lang]}</option>)}
              </select>
            </div>
            {chosen && (
              <div className="space-y-1">
                <label htmlFor={`${id}-i`} className="block text-lg font-bold">{t("util.issue")}</label>
                <select id={`${id}-i`} className={input} value={issue} required onChange={(e) => setIssue(e.target.value as ComplaintIssue)}>
                  <option value="">—</option>
                  {issues.map((i) => <option key={i} value={i}>{issueLabel(i, lang)}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <label htmlFor={`${id}-c`} className="block text-lg font-bold">{t("util.consumer")}</label>
              <input id={`${id}-c`} className={input} maxLength={40} value={consumer} onChange={(e) => setConsumer(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label htmlFor={`${id}-s`} className="block text-lg font-bold">{t("util.since")}</label>
              <input id={`${id}-s`} className={input} maxLength={60} value={since} onChange={(e) => setSince(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label htmlFor={`${id}-d`} className="block text-lg font-bold">{t("util.details")}</label>
              <textarea id={`${id}-d`} rows={3} maxLength={600} className="w-full rounded-lg border-2 border-ink p-3 text-lg" value={details} onChange={(e) => setDetails(e.target.value)} />
            </div>
            <button type="submit" disabled={!chosen || !issue}
              className="inline-flex min-h-14 w-full items-center justify-center lift rounded-lg bg-leaf px-5 shadow-sm text-lg font-bold text-white hover:bg-leaf-dark disabled:opacity-50">
              {t("util.prepare")}
            </button>
          </form>

          {current && (
            <div className="space-y-3 glass-card">
              <h3 className="text-xl font-extrabold">{t("util.draftTitle")}</h3>
              {draftActions(current)}
            </div>
          )}

          {drafts.filter((d) => d.id !== current?.id).length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xl font-extrabold">{t("util.savedDrafts")}</h3>
              {drafts.filter((d) => d.id !== current?.id).map((d) => (
                <details key={d.id} className="rounded-xl border border-rule bg-white/60 p-3">
                  <summary className="min-h-12 cursor-pointer py-2 text-lg font-bold">{d.subject} — {formatTime(d.createdAt, lang)}</summary>
                  <div className="space-y-3 pt-2">
                    {draftActions(d)}
                    <Button variant="secondary" onClick={() => persist(drafts.filter((x) => x.id !== d.id))}>{t("util.deleteDraft")}</Button>
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
