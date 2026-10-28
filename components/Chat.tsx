"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useLanguage } from "./LanguageProvider";
import { useLocation } from "./LocationProvider";
import { useFarm } from "./FarmProvider";
import { useOnline } from "./OfflineBanner";
import { AssistantAnswer } from "./AssistantAnswer";
import { KccHelp } from "./KccHelp";
import { Button, Notice } from "./ui";
import { postApi, type ClientErrorCode } from "@/lib/client/api";
import { errorKey } from "@/lib/client/errors";
import type { AssistantResponse, ChatMessage } from "@/lib/assistant/types";
import { replyToHistoryText } from "@/lib/assistant/schema";
import { MAX_MESSAGE_CHARS, MAX_MESSAGES } from "@/lib/assistant/validate";
import { readJson } from "@/lib/client/storage";
import { isSoilCard } from "@/lib/soil/shc";

export const SOIL_CARD_KEY = "ks:soil:v1";

type Turn = { role: "user"; text: string } | { role: "model"; response: AssistantResponse };

const toMessage = (turn: Turn): ChatMessage =>
  turn.role === "user" ? { role: "user", text: turn.text } : { role: "model", text: replyToHistoryText(turn.response.reply) || "…" };

/** Conversation with the server-side assistant. `seed` pre-fills (and with autoSend, sends) the first question. */
export function Chat({ seed, autoSend = false, showExamples = false }: { seed?: string; autoSend?: boolean; showExamples?: boolean }) {
  const { t, lang } = useLanguage();
  const { location } = useLocation();
  const { profile } = useFarm();
  const online = useOnline();
  const id = useId();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState(seed ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ClientErrorCode | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const sentSeed = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const atLimit = turns.length + 1 > MAX_MESSAGES;

  async function send(text: string) {
    const q = text.trim();
    if (!q) return setInputError(t("ask.errEmpty"));
    if (q.length > MAX_MESSAGE_CHARS) return setInputError(t("ask.errTooLong", { max: MAX_MESSAGE_CHARS }));
    if (atLimit) return;
    setInputError(null);
    setError(null);
    const history: ChatMessage[] = [...turns.map(toMessage), { role: "user", text: q }];
    setTurns((prev) => [...prev, { role: "user", text: q }]);
    setInput("");
    setBusy(true);
    const r = await postApi<AssistantResponse>("/api/assistant", {
      lang,
      messages: history,
      location: location ? { state: location.state, district: location.district, label: location.label, lat: location.lat, lon: location.lon } : null,
      farm: { water: profile.water, mainCrop: profile.mainCrop },
      soil: (() => {
        const c = readJson(SOIL_CARD_KEY);
        return isSoilCard(c) ? { values: c.values, testDate: c.testDate } : null;
      })(),
    });
    setBusy(false);
    if (r.ok) {
      setTurns((prev) => [...prev, { role: "model", response: r.data }]);
    } else {
      // Undo the unanswered question so roles keep alternating, and give the text back to edit or retry.
      setTurns((prev) => prev.slice(0, -1));
      setInput(q);
      setError(r.code);
    }
  }

  useEffect(() => {
    if (autoSend && seed && !sentSeed.current) {
      sentSeed.current = true;
      void send(seed);
    }
    // send() is intentionally not a dependency: the seed is sent exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSend, seed]);

  function submit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  function pickQuestion(q: string) {
    setInput(`${q} `);
    inputRef.current?.focus();
  }

  return (
    <div className="space-y-6">
      {turns.length > 0 && (
        <ol className="space-y-6" aria-live="polite">
          {turns.map((turn, i) => (
            <li key={i} className={turn.role === "user" ? "rounded-lg bg-leaf-wash p-4" : "border-l-4 border-leaf pl-4"}>
              <p className="mb-1 text-base font-bold">{turn.role === "user" ? t("ask.you") : t("app.name")}</p>
              {turn.role === "user" ? (
                <p className="whitespace-pre-wrap text-lg">{turn.text}</p>
              ) : (
                <AssistantAnswer response={turn.response} onPickQuestion={i === turns.length - 1 ? pickQuestion : undefined} />
              )}
            </li>
          ))}
        </ol>
      )}

      {busy && <Notice>{t("ask.thinking")}</Notice>}
      {error && (
        error === "NOT_CONFIGURED" || error === "UNAUTHORIZED" ? (
          <div className="space-y-4">
            <Notice tone="caution">{t(error === "UNAUTHORIZED" ? "ask.keyRejected" : "ask.notConfigured")}</Notice>
            <KccHelp />
          </div>
        ) : (
          <Notice tone="error">{t(errorKey(error))}</Notice>
        )
      )}
      {!online && <Notice tone="caution">{t("ask.offline")}</Notice>}

      {atLimit ? (
        <div className="space-y-3">
          <Notice>{t("ask.limit")}</Notice>
          <Button variant="secondary" onClick={() => { setTurns([]); setError(null); }}>{t("ask.newChat")}</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3" noValidate>
          <label htmlFor={`${id}-q`} className="block text-lg font-bold">{t("ask.label")}</label>
          <textarea
            id={`${id}-q`}
            ref={inputRef}
            rows={3}
            value={input}
            maxLength={MAX_MESSAGE_CHARS + 50}
            placeholder={t("ask.placeholder")}
            onChange={(e) => setInput(e.target.value)}
            aria-invalid={Boolean(inputError)}
            aria-describedby={inputError ? `${id}-err` : undefined}
            className="w-full rounded-lg border-2 border-ink p-3 text-lg"
          />
          {inputError && <p id={`${id}-err`} className="text-base font-semibold text-alert">{inputError}</p>}
          <button type="submit" disabled={busy || !online} className="inline-flex min-h-14 w-full items-center justify-center lift rounded-lg bg-leaf px-5 shadow-sm text-lg font-bold text-white hover:bg-leaf-dark disabled:opacity-50">
            {t("ask.send")}
          </button>
          {turns.length > 0 && <Button variant="secondary" onClick={() => { setTurns([]); setError(null); setInput(""); }}>{t("ask.newChat")}</Button>}
        </form>
      )}

      {showExamples && turns.length === 0 && (
        <div className="space-y-2">
          <p className="text-lg font-bold">{t("ask.examples")}</p>
          {(["ask.ex1", "ask.ex2", "ask.ex3"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setInput(t(k))} className="block min-h-12 w-full rounded-lg border-2 border-rule px-4 py-2 text-left text-lg hover:border-ink">
              {t(k)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
